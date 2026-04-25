/** Mail plugin schema migrations.
 *
 *  Stores mail-specific tables that don't fit the generic JSON `records`
 *  table — large bodies, FTS indexes, send queues, rate-limit counters,
 *  encrypted blobs. The mail plugin's user-facing resources still flow
 *  through `records` for free CRUD; these tables are the engine room. */

import { db } from "../../db";

let migrated = false;

export function migrateMail(): void {
  if (migrated) return;
  db.exec(`
    /* Per-connection sync cursor + provider subscription state. */
    CREATE TABLE IF NOT EXISTS mail_sync_state (
      connection_id           TEXT PRIMARY KEY,
      provider                TEXT NOT NULL,
      history_cursor          TEXT,
      delta_token             TEXT,
      uid_validity            INTEGER,
      last_uid                INTEGER,
      last_sync_at            TEXT,
      last_full_sync_at       TEXT,
      consecutive_failures    INTEGER NOT NULL DEFAULT 0,
      last_error              TEXT,
      sub_external_id         TEXT,
      sub_expires_at          TEXT,
      sub_renewed_at          TEXT
    );

    /* Encrypted body store. The bodyHtmlRaw + decrypted-cleartext-text are
     * stored here so the JSON record stays small for fast list paging. */
    CREATE TABLE IF NOT EXISTS mail_body (
      message_id              TEXT PRIMARY KEY,
      tenant_id               TEXT,
      cipher                  BLOB NOT NULL,
      nonce                   BLOB NOT NULL,
      key_version             INTEGER NOT NULL DEFAULT 1,
      sanitized_html_len      INTEGER NOT NULL DEFAULT 0,
      text_len                INTEGER NOT NULL DEFAULT 0,
      created_at              TEXT NOT NULL,
      updated_at              TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mail_body_tenant_idx ON mail_body(tenant_id);

    /* FTS5 index over message search-friendly text. */
    CREATE VIRTUAL TABLE IF NOT EXISTS mail_search USING fts5(
      message_id UNINDEXED,
      thread_id UNINDEXED,
      connection_id UNINDEXED,
      tenant_id UNINDEXED,
      folder UNINDEXED,
      labels,
      from_name,
      from_email,
      to_emails,
      cc_emails,
      subject,
      preview,
      body_text,
      headers,
      received_at UNINDEXED,
      flags UNINDEXED,
      tokenize = 'porter unicode61 remove_diacritics 2'
    );

    /* Hybrid vector index — stores L2-normalized embedding bytes alongside
     * a small inverted token list for cheap candidate selection on tiny
     * deployments without a pgvector / sqlite-vec dependency. */
    CREATE TABLE IF NOT EXISTS mail_vector (
      target_kind     TEXT NOT NULL,
      target_id       TEXT NOT NULL,
      tenant_id       TEXT,
      connection_id   TEXT,
      dim             INTEGER NOT NULL,
      vector          BLOB NOT NULL,
      magnitude       REAL NOT NULL,
      tokens          TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      PRIMARY KEY (target_kind, target_id)
    );
    CREATE INDEX IF NOT EXISTS mail_vector_tenant_idx ON mail_vector(tenant_id);

    /* Outgoing send queue.
     *  Used for both undo-send (short release window) and scheduled-send
     *  (arbitrary future sendAt). Workers poll release_at and transition
     *  status. Idempotency keys prevent double-sends on crash recovery. */
    CREATE TABLE IF NOT EXISTS mail_send_queue (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT,
      user_id         TEXT NOT NULL,
      connection_id   TEXT NOT NULL,
      draft_snapshot  TEXT NOT NULL,
      mime_blob       BLOB,
      release_at      TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'queued',
      attempts        INTEGER NOT NULL DEFAULT 0,
      max_attempts    INTEGER NOT NULL DEFAULT 5,
      last_error      TEXT,
      idempotency_key TEXT NOT NULL,
      kind            TEXT NOT NULL DEFAULT 'undo',
      thread_id       TEXT,
      in_reply_to     TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      sent_at         TEXT,
      provider_message_id TEXT,
      provider_thread_id  TEXT
    );
    CREATE INDEX IF NOT EXISTS mail_send_queue_release_idx ON mail_send_queue(status, release_at);
    CREATE UNIQUE INDEX IF NOT EXISTS mail_send_queue_idem_idx ON mail_send_queue(idempotency_key);
    CREATE INDEX IF NOT EXISTS mail_send_queue_user_idx ON mail_send_queue(user_id, status);

    /* Image-proxy cache. Maps a remote URL hash to a stored file id and
     * holds last-fetched / expires-at for cache eviction. */
    CREATE TABLE IF NOT EXISTS mail_image_cache (
      hash            TEXT PRIMARY KEY,
      remote_url      TEXT NOT NULL,
      file_id         TEXT,
      mime_type       TEXT,
      size_bytes      INTEGER,
      fetched_at      TEXT NOT NULL,
      expires_at      TEXT NOT NULL,
      blocked_reason  TEXT,
      tracker_host    INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS mail_image_cache_expires_idx ON mail_image_cache(expires_at);

    /* Per-user/per-connection rate-limit token bucket state. */
    CREATE TABLE IF NOT EXISTS mail_rate_state (
      bucket_key      TEXT PRIMARY KEY,
      tokens          REAL NOT NULL,
      last_refill_at  TEXT NOT NULL,
      max_tokens      REAL NOT NULL,
      refill_per_s    REAL NOT NULL
    );

    /* OAuth state cache for PKCE flows. */
    CREATE TABLE IF NOT EXISTS mail_oauth_state (
      state           TEXT PRIMARY KEY,
      provider        TEXT NOT NULL,
      tenant_id       TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      pkce_verifier   TEXT,
      redirect_uri    TEXT NOT NULL,
      scope           TEXT NOT NULL,
      return_to       TEXT,
      created_at      TEXT NOT NULL,
      expires_at      TEXT NOT NULL
    );

    /* Webhook subscription metadata (Gmail Pub/Sub, Graph notification). */
    CREATE TABLE IF NOT EXISTS mail_subscription (
      id              TEXT PRIMARY KEY,
      connection_id   TEXT NOT NULL,
      provider        TEXT NOT NULL,
      external_id     TEXT,
      topic           TEXT,
      client_state    TEXT,
      notification_url TEXT,
      expires_at      TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      last_ping_at    TEXT,
      ping_count      INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS mail_subscription_conn_idx ON mail_subscription(connection_id);
    CREATE INDEX IF NOT EXISTS mail_subscription_expires_idx ON mail_subscription(expires_at);

    /* AI usage ledger — token / cost / latency per call. */
    CREATE TABLE IF NOT EXISTS mail_ai_usage (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT,
      user_id         TEXT NOT NULL,
      action          TEXT NOT NULL,
      model           TEXT NOT NULL,
      provider        TEXT NOT NULL,
      tokens_in       INTEGER NOT NULL DEFAULT 0,
      tokens_out      INTEGER NOT NULL DEFAULT 0,
      cost_usd_micros INTEGER NOT NULL DEFAULT 0,
      latency_ms      INTEGER,
      ok              INTEGER NOT NULL DEFAULT 1,
      error           TEXT,
      message_id      TEXT,
      thread_id       TEXT,
      created_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mail_ai_usage_user_idx ON mail_ai_usage(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS mail_ai_usage_tenant_idx ON mail_ai_usage(tenant_id, created_at DESC);

    /* Idempotency cache shared by send + create endpoints. */
    CREATE TABLE IF NOT EXISTS mail_idempotency (
      key             TEXT PRIMARY KEY,
      action          TEXT NOT NULL,
      result          TEXT NOT NULL,
      status          INTEGER NOT NULL,
      created_at      TEXT NOT NULL,
      expires_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mail_idempotency_expires_idx ON mail_idempotency(expires_at);

    /* Shared-inbox internal comments (per-thread). */
    CREATE TABLE IF NOT EXISTS mail_shared_comment (
      id              TEXT PRIMARY KEY,
      thread_id       TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      tenant_id       TEXT,
      author_email    TEXT NOT NULL,
      body            TEXT NOT NULL,
      mentions        TEXT,
      created_at      TEXT NOT NULL,
      edited_at       TEXT
    );
    CREATE INDEX IF NOT EXISTS mail_shared_comment_thread_idx ON mail_shared_comment(thread_id, created_at);
  `);
  migrated = true;
}
