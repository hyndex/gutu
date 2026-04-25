/** Periodic cleanup: idempotency cache, expired image-proxy cache,
 *  expired oauth state, terminated webhooks, old send queue rows. */

import { db, nowIso } from "../db";
import { registerJob } from "./scheduler";

const TICK_MS = parseInt(process.env.MAIL_CLEANUP_TICK_MS ?? `${30 * 60_000}`, 10);

async function tick(): Promise<void> {
  const now = nowIso();
  db.prepare(`DELETE FROM mail_idempotency WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM mail_oauth_state WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM mail_image_cache WHERE expires_at < ?`).run(now);
  // Trim sent send-queue rows older than 30d to keep the queue lean.
  db.prepare(
    `DELETE FROM mail_send_queue WHERE status IN ('sent','cancelled','failed') AND updated_at < ?`,
  ).run(new Date(Date.now() - 30 * 86_400_000).toISOString());
  // Auto-purge trash after 30d.
  const trashed = db
    .prepare(
      `SELECT id FROM records WHERE resource = 'mail.thread'
       AND json_extract(data, '$.folder') = 'trash'
       AND updated_at < ? LIMIT 5000`,
    )
    .all(new Date(Date.now() - 30 * 86_400_000).toISOString()) as { id: string }[];
  for (const r of trashed) {
    db.prepare(`DELETE FROM records WHERE resource = 'mail.thread' AND id = ?`).run(r.id);
  }
}

export function registerMailCleanup(): void {
  registerJob({ id: "mail.cleanup", intervalMs: TICK_MS, fn: tick, runOnStart: true });
}
