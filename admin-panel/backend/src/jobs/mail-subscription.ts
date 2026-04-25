/** Renew Gmail Pub/Sub + Graph webhook subscriptions before they expire. */

import { db, nowIso } from "../db";
import { driverFor, loadConnection } from "../lib/mail/driver";
import { registerJob } from "./scheduler";

const TICK_MS = parseInt(process.env.MAIL_SUBSCRIBE_TICK_MS ?? `${10 * 60_000}`, 10);

async function tick(): Promise<void> {
  const cutoff = new Date(Date.now() + 30 * 60_000).toISOString();
  // Find subscriptions about to expire OR connections without one.
  const due = db
    .prepare(
      `SELECT s.id, s.connection_id, s.expires_at FROM mail_subscription s
       WHERE s.expires_at IS NULL OR s.expires_at < ?
       LIMIT 100`,
    )
    .all(cutoff) as { id: string; connection_id: string; expires_at: string | null }[];

  // Also onboard any active connections that have no subscription row yet.
  const orphans = db
    .prepare(
      `SELECT id FROM records WHERE resource = 'mail.connection'
       AND json_extract(data, '$.status') = 'active'
       AND id NOT IN (SELECT connection_id FROM mail_subscription)
       LIMIT 100`,
    )
    .all() as { id: string }[];

  for (const r of orphans) due.push({ id: `new_${r.id}`, connection_id: r.id, expires_at: null });

  for (const sub of due) {
    try {
      const conn = loadConnection(sub.connection_id);
      if (!conn || conn.status !== "active") continue;
      const driver = await driverFor({ connectionId: sub.connection_id, tenantId: getTenant(sub.connection_id) });
      if (!driver.subscribePush) continue;
      const result = await driver.subscribePush();
      db.prepare(
        `INSERT INTO mail_subscription (id, connection_id, provider, external_id, expires_at, created_at, updated_at, last_ping_at, ping_count, topic, client_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)
         ON CONFLICT(id) DO UPDATE SET external_id=excluded.external_id, expires_at=excluded.expires_at, updated_at=excluded.updated_at`,
      ).run(
        sub.id.startsWith("new_") ? `sub_${sub.connection_id}` : sub.id,
        sub.connection_id,
        conn.provider,
        result.externalId,
        result.expiresAt ?? null,
        nowIso(),
        nowIso(),
        result.topic ?? null,
        result.clientState ?? null,
      );
    } catch (err) {
      console.warn(`[mail-subscription] ${sub.connection_id} failed`, err);
    }
  }
}

function getTenant(connectionId: string): string {
  const r = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  if (!r) return "default";
  const rec = JSON.parse(r.data) as { tenantId?: string };
  return rec.tenantId ?? "default";
}

export function registerMailSubscription(): void {
  registerJob({ id: "mail.subscription", intervalMs: TICK_MS, fn: tick, runOnStart: false });
}
