/** Wake snoozed threads when their `wakeAt` is reached. */

import { db, nowIso } from "../db";
import { broadcastResourceChange } from "../lib/ws";
import { recordAudit } from "../lib/audit";
import { registerJob } from "./scheduler";

const TICK_MS = parseInt(process.env.MAIL_SNOOZE_TICK_MS ?? "60000", 10);

async function tick(): Promise<void> {
  const now = nowIso();
  const rows = db
    .prepare(
      `SELECT id, data FROM records WHERE resource = 'mail.snooze'
       AND json_extract(data, '$.wakeAt') <= ? AND (json_extract(data, '$.completed') IS NULL OR json_extract(data, '$.completed') = 0)
       LIMIT 200`,
    )
    .all(now) as { id: string; data: string }[];
  for (const r of rows) {
    const snooze = JSON.parse(r.data) as { id: string; threadId: string; userId: string; wakeAt: string; wakeFolder?: string; completed?: boolean };
    const tRow = db
      .prepare(`SELECT data FROM records WHERE resource = 'mail.thread' AND id = ?`)
      .get(snooze.threadId) as { data: string } | undefined;
    if (tRow) {
      const t = JSON.parse(tRow.data) as Record<string, unknown>;
      t.snoozedUntil = null;
      t.folder = snooze.wakeFolder ?? "inbox";
      t.updatedAt = now;
      db.prepare(`UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.thread' AND id = ?`)
        .run(JSON.stringify(t), now, snooze.threadId);
      broadcastResourceChange("mail.thread", snooze.threadId, "update", snooze.userId);
    }
    snooze.completed = true;
    db.prepare(`UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.snooze' AND id = ?`)
      .run(JSON.stringify(snooze), now, r.id);
    recordAudit({ actor: snooze.userId, action: "mail.thread.unsnoozed", resource: "mail.thread", recordId: snooze.threadId });
  }
}

export function registerMailSnooze(): void {
  registerJob({ id: "mail.snooze", intervalMs: TICK_MS, fn: tick, runOnStart: false });
}
