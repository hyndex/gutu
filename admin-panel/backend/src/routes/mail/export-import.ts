/** /api/mail/export and /api/mail/import — single-message and bulk
 *  .eml / .mbox round-trip. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { exportEml, exportMbox, splitMbox, toRawMessage, type StoredMessage } from "../../lib/mail/eml";
import { ingestMessage, loadKnownContacts } from "../../lib/mail/ingest";
import { errorResponse, tenantId, userIdOf } from "./_helpers";

export const exportImportRoutes = new Hono();
exportImportRoutes.use("*", requireAuth);

exportImportRoutes.get("/eml/:messageId", (c) => {
  const id = c.req.param("messageId") ?? "";
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.message' AND id = ?`)
    .get(id) as { data: string } | undefined;
  if (!row) return errorResponse(c, 404, "not-found", "message not found");
  const rec = JSON.parse(row.data) as StoredMessage & { userId: string; tenantId: string };
  if (rec.userId !== userIdOf(c) || (rec.tenantId && rec.tenantId !== tenantId())) {
    return errorResponse(c, 404, "not-found", "message not found");
  }
  const eml = exportEml(rec);
  recordAudit({ actor: userIdOf(c), action: "mail.export.eml", resource: "mail.message", recordId: id });
  const safeName = (rec.subject ?? rec.id).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
  return new Response(eml as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "message/rfc822",
      "Content-Disposition": `attachment; filename="${safeName || "message"}.eml"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

exportImportRoutes.get("/mbox/thread/:threadId", (c) => {
  const id = c.req.param("threadId") ?? "";
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.message'
       AND json_extract(data, '$.threadId') = ?
       ORDER BY json_extract(data, '$.receivedAt') ASC LIMIT 500`,
    )
    .all(id) as { data: string }[];
  if (rows.length === 0) return errorResponse(c, 404, "not-found", "thread not found");
  const msgs = rows
    .map((r) => JSON.parse(r.data) as StoredMessage & { userId: string; tenantId: string })
    .filter((m) => m.userId === userIdOf(c) && (!m.tenantId || m.tenantId === tenantId()));
  if (msgs.length === 0) return errorResponse(c, 404, "not-found", "thread not found");
  const mbox = exportMbox(msgs);
  recordAudit({ actor: userIdOf(c), action: "mail.export.mbox.thread", resource: "mail.thread", recordId: id, payload: { count: msgs.length } });
  return new Response(mbox as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/mbox",
      "Content-Disposition": `attachment; filename="thread-${id}.mbox"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

exportImportRoutes.get("/mbox/folder/:folder", (c) => {
  const folder = c.req.param("folder") ?? "inbox";
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.message'
       AND json_extract(data, '$.userId') = ? AND json_extract(data, '$.tenantId') = ?
       AND json_extract(data, '$.folder') = ?
       ORDER BY json_extract(data, '$.receivedAt') ASC LIMIT 5000`,
    )
    .all(userIdOf(c), tenantId(), folder) as { data: string }[];
  if (rows.length === 0) return errorResponse(c, 404, "not-found", "no messages in folder");
  const msgs = rows.map((r) => JSON.parse(r.data) as StoredMessage);
  const mbox = exportMbox(msgs);
  recordAudit({ actor: userIdOf(c), action: "mail.export.mbox.folder", resource: "mail.message", payload: { folder, count: msgs.length } });
  return new Response(mbox as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/mbox",
      "Content-Disposition": `attachment; filename="${folder}.mbox"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

exportImportRoutes.post("/import/:connectionId", async (c) => {
  const connectionId = c.req.param("connectionId") ?? "";
  const conn = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.connection' AND id = ?`)
    .get(connectionId) as { data: string } | undefined;
  if (!conn) return errorResponse(c, 404, "not-found", "connection not found");
  const c0 = JSON.parse(conn.data) as { userId: string; tenantId: string };
  if (c0.userId !== userIdOf(c)) return errorResponse(c, 403, "forbidden", "not your connection");

  const ct = c.req.header("content-type") ?? "";
  let buffers: Uint8Array[] = [];
  const raw = await c.req.arrayBuffer();
  const blob = new Uint8Array(raw);
  if (ct.includes("application/mbox") || (c.req.query("kind") ?? "").toLowerCase() === "mbox") {
    buffers = splitMbox(blob);
  } else {
    buffers = [blob];
  }
  if (buffers.length === 0) return errorResponse(c, 400, "empty", "no messages to import");

  const tenant = tenantId();
  const known = loadKnownContacts(c0.userId, tenant);
  let imported = 0;
  for (const b of buffers) {
    const providerId = `imp_${uuid()}`;
    const threadId = `mt_${connectionId}_${providerId}`;
    try {
      ingestMessage(toRawMessage(b, { connectionId, userId: c0.userId, tenantId: tenant, threadId, providerMessageId: providerId }), known);
      imported++;
    } catch (err) {
      console.warn(`[mail.import] message failed`, err);
    }
  }
  recordAudit({ actor: userIdOf(c), action: "mail.import", resource: "mail.message", payload: { count: imported } });
  return c.json({ imported });
});
