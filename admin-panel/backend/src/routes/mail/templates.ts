/** /api/mail/templates — CRUD on per-user email templates. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const templatesRoutes = new Hono();
templatesRoutes.use("*", requireAuth);

templatesRoutes.get("/", (c) => {
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.template'
       AND json_extract(data, '$.userId') = ? AND json_extract(data, '$.tenantId') = ?
       ORDER BY updated_at DESC`,
    )
    .all(userIdOf(c), tenantId()) as { data: string }[];
  return c.json({ rows: rows.map((r) => JSON.parse(r.data)) });
});

templatesRoutes.post("/", async (c) => {
  let body: Record<string, unknown> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const id = `tpl_${uuid()}`;
  const tpl = {
    id,
    userId: userIdOf(c),
    tenantId: tenantId(),
    name: String(body.name ?? "Untitled template"),
    subject: String(body.subject ?? ""),
    bodyHtml: String(body.bodyHtml ?? ""),
    to: String(body.to ?? ""),
    cc: String(body.cc ?? ""),
    bcc: String(body.bcc ?? ""),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveRecord("mail.template", tpl);
  recordAudit({ actor: userIdOf(c), action: "mail.template.created", resource: "mail.template", recordId: id });
  broadcastResourceChange("mail.template", id, "create", userIdOf(c));
  return c.json(tpl);
});

templatesRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const tpl = loadRecord<Record<string, unknown>>("mail.template", id);
  if (!tpl || tpl.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "template not found");
  let body: Record<string, unknown> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const merged = { ...tpl, ...body, id, updatedAt: nowIso() };
  saveRecord("mail.template", merged);
  broadcastResourceChange("mail.template", id, "update", userIdOf(c));
  return c.json(merged);
});

templatesRoutes.delete("/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const tpl = loadRecord<Record<string, unknown>>("mail.template", id);
  if (!tpl || tpl.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "template not found");
  db.prepare("DELETE FROM records WHERE resource = 'mail.template' AND id = ?").run(id);
  recordAudit({ actor: userIdOf(c), action: "mail.template.deleted", resource: "mail.template", recordId: id });
  broadcastResourceChange("mail.template", id, "delete", userIdOf(c));
  return c.json({ ok: true });
});
