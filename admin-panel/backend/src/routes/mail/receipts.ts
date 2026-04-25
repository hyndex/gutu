/** /api/mail/receipts — outgoing read-receipt opt-in via tracked pixel.
 *
 *  When the sender opts into a receipt, we generate a unique pixel
 *  token, embed `<img src="/api/mail/receipts/pixel/:token" />` at the
 *  end of the outgoing HTML body. When the recipient opens the
 *  message, the pixel fetch records a row in `mail_receipt_event`. We
 *  expose `/track/:messageId` to surface aggregated open events back
 *  to the sender. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { errorResponse, userIdOf, tenantId } from "./_helpers";

export const receiptsRoutes = new Hono();

const TRANSPARENT_GIF = Buffer.from("R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");

ensureReceiptTable();

function ensureReceiptTable(): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS mail_receipt_event (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      message_id TEXT,
      ip TEXT,
      user_agent TEXT,
      at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mail_receipt_token_idx ON mail_receipt_event(token);
    CREATE INDEX IF NOT EXISTS mail_receipt_msg_idx ON mail_receipt_event(message_id);
    CREATE TABLE IF NOT EXISTS mail_receipt_token (
      token TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      thread_id TEXT,
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,
  );
}

/** Pixel endpoint — public on purpose so recipient mail clients can
 *  fetch it. Records the open event but always returns the GIF. */
receiptsRoutes.get("/pixel/:token", (c) => {
  const token = c.req.param("token") ?? "";
  if (token.length === 64 || token.length === 32) {
    db.prepare(
      `INSERT INTO mail_receipt_event (id, token, message_id, ip, user_agent, at)
       VALUES (?, ?, (SELECT message_id FROM mail_receipt_token WHERE token = ?), ?, ?, ?)`,
    ).run(
      uuid(),
      token,
      token,
      c.req.header("x-forwarded-for") ?? "",
      c.req.header("user-agent") ?? "",
      nowIso(),
    );
  }
  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
});

const authed = new Hono();
authed.use("*", requireAuth);

authed.post("/issue", async (c) => {
  let body: { messageId?: string; threadId?: string } = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  if (!body.messageId) return errorResponse(c, 400, "missing-messageId", "messageId required");
  const token = uuid().replace(/-/g, "");
  const now = nowIso();
  db.prepare(
    `INSERT INTO mail_receipt_token (token, message_id, thread_id, user_id, tenant_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(token, body.messageId, body.threadId ?? null, userIdOf(c), tenantId(), now);
  recordAudit({ actor: userIdOf(c), action: "mail.receipt.issued", resource: "mail.message", recordId: body.messageId, payload: { token } });
  return c.json({ token, pixelUrl: `/api/mail/receipts/pixel/${token}` });
});

authed.get("/track/:messageId", (c) => {
  const messageId = c.req.param("messageId") ?? "";
  const row = db
    .prepare(`SELECT user_id FROM mail_receipt_token WHERE message_id = ?`)
    .get(messageId) as { user_id: string } | undefined;
  if (!row || row.user_id !== userIdOf(c)) return errorResponse(c, 404, "not-found", "no receipts for message");
  const events = db
    .prepare(
      `SELECT at, ip, user_agent FROM mail_receipt_event WHERE message_id = ? ORDER BY at DESC LIMIT 200`,
    )
    .all(messageId) as { at: string; ip: string; user_agent: string }[];
  return c.json({ messageId, opens: events });
});

receiptsRoutes.route("/", authed);
