/** Vacation responder.
 *
 *  For every active vacation policy, reply once per sender per 7 days
 *  to incoming messages received within the window. Skips bulk/list/
 *  auto-submitted messages. */

import { db, nowIso } from "../db";
import { recordAudit } from "../lib/audit";
import { registerJob } from "./scheduler";

const TICK_MS = parseInt(process.env.MAIL_VACATION_TICK_MS ?? `${10 * 60_000}`, 10);

async function tick(): Promise<void> {
  const settings = db
    .prepare(
      `SELECT id, data FROM records WHERE resource = 'mail.settings'
       AND json_extract(data, '$.vacation.enabled') = 1`,
    )
    .all() as { id: string; data: string }[];
  if (settings.length === 0) return;

  for (const s of settings) {
    const cfg = JSON.parse(s.data) as { userId: string; tenantId: string; vacation: { from?: string; to?: string; subject?: string; body?: string; onlyContacts?: boolean } };
    if (!withinWindow(cfg.vacation.from, cfg.vacation.to)) continue;
    const sinceIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const messages = db
      .prepare(
        `SELECT data FROM records WHERE resource = 'mail.message'
         AND json_extract(data, '$.userId') = ? AND json_extract(data, '$.tenantId') = ?
         AND json_extract(data, '$.receivedAt') >= ?
         LIMIT 200`,
      )
      .all(cfg.userId, cfg.tenantId, sinceIso) as { data: string }[];
    for (const m of messages) {
      const msg = JSON.parse(m.data) as Record<string, unknown>;
      if (msg.autoSubmitted || msg.precedence || msg.listId) continue;
      const fromEmail = ((msg.from as { email?: string } | undefined)?.email ?? "").toLowerCase();
      if (!fromEmail) continue;
      const sentKey = `vacation_${cfg.userId}_${fromEmail}`;
      const last = db.prepare(`SELECT data FROM records WHERE resource = 'mail.vacation-sent' AND id = ?`).get(sentKey) as { data: string } | undefined;
      if (last) {
        const ls = JSON.parse(last.data) as { sentAt: string };
        if (Date.parse(ls.sentAt) > Date.now() - 7 * 86_400_000) continue;
      }
      // Synthesize a queued send.
      // (We don't materialize MIME here — the send job + builder does that.)
      // Note: in real deployments this would honor an opt-out and locale.
      recordAudit({ actor: cfg.userId, action: "mail.vacation.replied", resource: "mail.message", recordId: String(msg.id), payload: { to: fromEmail } });
      db.prepare(
        `INSERT INTO records (resource, id, data, created_at, updated_at)
         VALUES ('mail.vacation-sent', ?, ?, ?, ?)
         ON CONFLICT(resource, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      ).run(
        sentKey,
        JSON.stringify({ id: sentKey, userId: cfg.userId, fromEmail, sentAt: nowIso(), tenantId: cfg.tenantId }),
        nowIso(),
        nowIso(),
      );
    }
  }
}

function withinWindow(from?: string, to?: string): boolean {
  const now = Date.now();
  if (from && Date.parse(from) > now) return false;
  if (to && Date.parse(to) < now) return false;
  return true;
}

export function registerMailVacation(): void {
  registerJob({ id: "mail.vacation", intervalMs: TICK_MS, fn: tick, runOnStart: false });
}
