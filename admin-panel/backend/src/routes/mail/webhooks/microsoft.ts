/** Microsoft Graph change-notification webhook receiver. */

import { Hono } from "hono";
import { db, nowIso } from "../../../db";
import { uuid } from "../../../lib/id";

export const microsoftWebhookRoutes = new Hono();

// Graph subscription validation handshake: GET ?validationToken=...
microsoftWebhookRoutes.get("/", (c) => {
  const tok = c.req.query("validationToken") ?? "";
  return c.text(tok, 200, { "Content-Type": "text/plain" });
});

microsoftWebhookRoutes.post("/", async (c) => {
  let body: { value?: { subscriptionId?: string; clientState?: string; resourceData?: { id?: string } }[] } = {};
  try { body = await c.req.json(); } catch { return c.text("bad json", 400); }
  for (const n of body.value ?? []) {
    if (!n.subscriptionId) continue;
    const subRow = db
      .prepare(`SELECT connection_id FROM mail_subscription WHERE external_id = ?`)
      .get(n.subscriptionId) as { connection_id: string } | undefined;
    if (!subRow) continue;
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
    ).run(`syn_${uuid()}`, subRow.connection_id, nowIso());
  }
  return c.text("ok", 202);
});
