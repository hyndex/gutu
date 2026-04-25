/** OAuth token proactive refresh — runs every minute, refreshes any
 *  connection whose access token expires within 5 minutes. */

import { db } from "../db";
import { refreshConnection } from "../lib/mail/oauth/refresh";
import { registerJob } from "./scheduler";

const TICK_MS = parseInt(process.env.MAIL_OAUTH_REFRESH_TICK_MS ?? "60000", 10);

async function tick(): Promise<void> {
  const cutoff = new Date(Date.now() + 5 * 60_000).toISOString();
  const rows = db
    .prepare(
      `SELECT id FROM records WHERE resource = 'mail.connection'
       AND json_extract(data, '$.status') = 'active'
       AND json_extract(data, '$.tokenExpiresAt') IS NOT NULL
       AND json_extract(data, '$.tokenExpiresAt') < ?
       LIMIT 100`,
    )
    .all(cutoff) as { id: string }[];
  for (const r of rows) {
    try { await refreshConnection(r.id); }
    catch (err) { console.warn(`[oauth-refresh] ${r.id} failed`, err); }
  }
}

export function registerOauthRefresh(): void {
  registerJob({ id: "mail.oauth.refresh", intervalMs: TICK_MS, fn: tick, runOnStart: false });
}
