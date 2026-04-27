/** /api/mail/messages/attachments — stream attachment bytes from the
 *  provider, with tenant + ownership checks + content-disposition safety. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db } from "../../db";
import { driverFor } from "../../lib/mail/driver";
import { errorResponse, tenantId, userIdOf } from "./_helpers";

export const attachmentsRoutes = new Hono();
attachmentsRoutes.use("*", requireAuth);

attachmentsRoutes.get("/:messageId/:attId", async (c) => {
  const messageId = c.req.param("messageId") ?? "";
  const attId = c.req.param("attId") ?? "";
  const row = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.message' AND id = ?
       OR (resource = 'mail.message' AND json_extract(data, '$.providerMessageId') = ?)
       LIMIT 1`,
    )
    .get(messageId, messageId) as { data: string } | undefined;
  if (!row) return errorResponse(c, 404, "not-found", "message not found");
  const rec = JSON.parse(row.data) as {
    userId: string;
    tenantId: string;
    connectionId: string;
    providerMessageId: string;
    attachments: { providerAttachmentId: string; filename: string; contentType: string; size: number }[];
  };
  if (rec.userId !== userIdOf(c) || (rec.tenantId && rec.tenantId !== tenantId())) {
    return errorResponse(c, 404, "not-found", "message not found");
  }
  const att = rec.attachments.find((a) => a.providerAttachmentId === attId);
  if (!att) return errorResponse(c, 404, "not-found", "attachment not found");

  try {
    const driver = await driverFor({ connectionId: rec.connectionId, tenantId: tenantId() });
    const bytes = await driver.getAttachmentBytes(rec.providerMessageId, attId);
    const safeName = att.filename.replace(/[\r\n";]/g, "_");
    return new Response(bytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": att.contentType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(c, 502, "fetch-failed", err instanceof Error ? err.message : "fetch failed");
  }
});

attachmentsRoutes.get("/inline/:attId", async (c) => {
  const attId = c.req.param("attId") ?? "";
  const userId = userIdOf(c);
  // Search across the user's recent messages — bounded scan to avoid
  // unbounded full-table reads.
  const candidates = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.message'
       AND json_extract(data, '$.userId') = ? AND json_extract(data, '$.tenantId') = ?
       ORDER BY updated_at DESC LIMIT 200`,
    )
    .all(userId, tenantId()) as { data: string }[];
  for (const row of candidates) {
    const rec = JSON.parse(row.data) as {
      connectionId: string; providerMessageId: string;
      attachments: { providerAttachmentId: string; filename: string; contentType: string; cid?: string }[];
    };
    const att = rec.attachments.find((a) => a.providerAttachmentId === attId || a.cid === attId);
    if (!att) continue;
    try {
      const driver = await driverFor({ connectionId: rec.connectionId, tenantId: tenantId() });
      const bytes = await driver.getAttachmentBytes(rec.providerMessageId, att.providerAttachmentId);
      return new Response(bytes as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": att.contentType || "application/octet-stream",
          "Cache-Control": "private, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (err) {
      return errorResponse(c, 502, "fetch-failed", err instanceof Error ? err.message : "fetch failed");
    }
  }
  return errorResponse(c, 404, "not-found", "inline attachment not found");
});
