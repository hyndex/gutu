/** Gmail Pub/Sub push receiver.
 *
 *  Pub/Sub posts a JSON envelope with a base64 payload. The payload
 *  contains the Gmail account email + history id. We look up the
 *  matching `mail.connection`, enqueue a sync job, ACK with 204. */

import { Hono } from "hono";
import { db, nowIso } from "../../../db";
import { uuid } from "../../../lib/id";

export const googleWebhookRoutes = new Hono();

googleWebhookRoutes.post("/", async (c) => {
  let body: { message?: { data?: string; messageId?: string }; subscription?: string } = {};
  try { body = await c.req.json(); } catch { return c.text("bad json", 400); }
  if (!body.message?.data) return c.text("ok", 204);
  let payload: { emailAddress?: string; historyId?: string } = {};
  try {
    const decoded = Buffer.from(body.message.data, "base64").toString("utf8");
    payload = JSON.parse(decoded) as typeof payload;
  } catch {
    return c.text("bad payload", 400);
  }
  if (!payload.emailAddress) return c.text("ok", 204);
  // Find connection by email + provider.
  const rows = db
    .prepare(
      `SELECT id, data FROM records WHERE resource = 'mail.connection'
       AND json_extract(data, '$.provider') = 'google'
       AND LOWER(json_extract(data, '$.email')) = LOWER(?)`,
    )
    .all(payload.emailAddress) as { id: string; data: string }[];
  for (const row of rows) {
    enqueueSync(row.id);
  }
  return c.text("ok", 204);
});

function enqueueSync(connectionId: string): void {
  // We append a sync directive into the send-queue table reusing the
  // status='sync' pattern; for clarity we keep a separate intent table.
  db.prepare(
    `CREATE TABLE IF NOT EXISTS mail_sync_intent (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  ).run();
  db.prepare(
    `INSERT INTO mail_sync_intent (id, connection_id, reason, created_at) VALUES (?, ?, 'webhook', ?)`,
  ).run(`syn_${uuid()}`, connectionId, nowIso());
}
