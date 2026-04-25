/** mail-send job — drains the send queue.
 *
 *  Polls `mail_send_queue` every 5s for rows whose `release_at <= now`
 *  and `status = 'queued'`. Atomically transitions to 'sending', invokes
 *  the driver, transitions to 'sent' / 'failed'. Failed rows retry with
 *  exponential backoff up to `max_attempts`. */

import { db, nowIso } from "../db";
import { driverFor } from "../lib/mail/driver";
import { recordAudit } from "../lib/audit";
import { broadcastResourceChange } from "../lib/ws";
import { registerJob } from "./scheduler";

interface QueuedRow {
  id: string;
  tenant_id: string;
  user_id: string;
  connection_id: string;
  draft_snapshot: string;
  mime_blob: Buffer;
  release_at: string;
  status: string;
  attempts: number;
  max_attempts: number;
  idempotency_key: string;
  kind: string;
  thread_id: string | null;
  in_reply_to: string | null;
}

const TICK_MS = parseInt(process.env.MAIL_SEND_TICK_MS ?? "5000", 10);

async function tick(): Promise<void> {
  const now = nowIso();
  const rows = db
    .prepare(
      `SELECT * FROM mail_send_queue
       WHERE status = 'queued' AND release_at <= ?
       ORDER BY release_at ASC LIMIT 50`,
    )
    .all(now) as QueuedRow[];
  for (const row of rows) {
    const claimed = db
      .prepare(`UPDATE mail_send_queue SET status = 'sending', updated_at = ? WHERE id = ? AND status = 'queued'`)
      .run(nowIso(), row.id);
    if (claimed.changes !== 1) continue;
    try {
      const driver = await driverFor({ connectionId: row.connection_id, tenantId: row.tenant_id });
      const result = await driver.send({
        raw: new Uint8Array(row.mime_blob),
        envelope: deriveEnvelope(row),
        threadProviderId: row.thread_id ?? undefined,
        inReplyToProviderId: row.in_reply_to ?? undefined,
      });
      db.prepare(
        `UPDATE mail_send_queue SET status = 'sent', sent_at = ?, provider_message_id = ?, provider_thread_id = ?, updated_at = ? WHERE id = ?`,
      ).run(nowIso(), result.providerMessageId, result.providerThreadId, nowIso(), row.id);
      recordAudit({
        actor: row.user_id,
        action: "mail.message.sent",
        resource: "mail.message",
        recordId: row.id,
        payload: { providerMessageId: result.providerMessageId, providerThreadId: result.providerThreadId, kind: row.kind },
      });
      broadcastResourceChange("mail.message", row.id, "create", row.user_id);
    } catch (err) {
      const attempts = row.attempts + 1;
      const errMsg = err instanceof Error ? err.message : "unknown";
      if (attempts >= row.max_attempts) {
        db.prepare(
          `UPDATE mail_send_queue SET status = 'failed', attempts = ?, last_error = ?, updated_at = ? WHERE id = ?`,
        ).run(attempts, errMsg.slice(0, 1000), nowIso(), row.id);
        recordAudit({ actor: row.user_id, action: "mail.message.failed", resource: "mail.message", recordId: row.id, level: "error", payload: { error: errMsg } });
      } else {
        const backoff = Math.min(60 * 60_000, 2 ** attempts * 30_000);
        db.prepare(
          `UPDATE mail_send_queue SET status = 'queued', attempts = ?, last_error = ?, release_at = ?, updated_at = ? WHERE id = ?`,
        ).run(attempts, errMsg.slice(0, 1000), new Date(Date.now() + backoff).toISOString(), nowIso(), row.id);
      }
    }
  }
}

function deriveEnvelope(row: QueuedRow): { from: string; to: string[]; cc: string[]; bcc: string[] } {
  try {
    const snap = JSON.parse(row.draft_snapshot) as { to?: string; cc?: string; bcc?: string };
    const split = (s: string | undefined): string[] => (s ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    return { from: "", to: split(snap.to), cc: split(snap.cc), bcc: split(snap.bcc) };
  } catch {
    return { from: "", to: [], cc: [], bcc: [] };
  }
}

export function registerMailSend(): void {
  registerJob({ id: "mail.send", intervalMs: TICK_MS, fn: tick, runOnStart: false });
}
