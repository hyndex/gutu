/** /api/mail/notes — per-thread sticky notes. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const notesRoutes = new Hono();
notesRoutes.use("*", requireAuth);

notesRoutes.get("/thread/:threadId", (c) => {
  const threadId = c.req.param("threadId") ?? "";
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.note'
       AND json_extract(data, '$.threadId') = ?
       AND json_extract(data, '$.userId') = ?
       ORDER BY json_extract(data, '$.order') ASC`,
    )
    .all(threadId, userIdOf(c)) as { data: string }[];
  return c.json({ rows: rows.map((r) => JSON.parse(r.data)) });
});

notesRoutes.post("/", async (c) => {
  let body: Record<string, unknown> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const id = `nt_${uuid()}`;
  const n = {
    id,
    userId: userIdOf(c),
    tenantId: tenantId(),
    threadId: String(body.threadId ?? ""),
    content: String(body.content ?? ""),
    color: String(body.color ?? "default"),
    isPinned: !!body.isPinned,
    order: Number(body.order ?? 0),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveRecord("mail.note", n);
  recordAudit({ actor: userIdOf(c), action: "mail.note.created", resource: "mail.note", recordId: id });
  broadcastResourceChange("mail.note", id, "create", userIdOf(c));
  return c.json(n);
});

notesRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const n = loadRecord<Record<string, unknown>>("mail.note", id);
  if (!n || n.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "note not found");
  let body: Record<string, unknown> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const merged = { ...n, ...body, id, updatedAt: nowIso() };
  saveRecord("mail.note", merged);
  broadcastResourceChange("mail.note", id, "update", userIdOf(c));
  return c.json(merged);
});

notesRoutes.delete("/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const n = loadRecord<Record<string, unknown>>("mail.note", id);
  if (!n || n.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "note not found");
  db.prepare("DELETE FROM records WHERE resource = 'mail.note' AND id = ?").run(id);
  recordAudit({ actor: userIdOf(c), action: "mail.note.deleted", resource: "mail.note", recordId: id });
  broadcastResourceChange("mail.note", id, "delete", userIdOf(c));
  return c.json({ ok: true });
});
