/** /api/mail/labels — CRUD + reorder + drive provider sync. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const labelsRoutes = new Hono();
labelsRoutes.use("*", requireAuth);

interface Label {
  id: string;
  userId: string;
  tenantId: string;
  connectionId?: string;
  providerLabelId?: string;
  name: string;
  color?: string;
  parentId?: string;
  order?: number;
  system?: boolean;
}

labelsRoutes.get("/", (c) => {
  const userId = userIdOf(c);
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.label' AND json_extract(data, '$.userId') = ? AND json_extract(data, '$.tenantId') = ?`,
    )
    .all(userId, tenantId()) as { data: string }[];
  const items = rows.map((r) => JSON.parse(r.data) as Label).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return c.json({ rows: items });
});

labelsRoutes.post("/", async (c) => {
  let body: { name?: string; color?: string; parentId?: string; connectionId?: string } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  if (!body.name) return errorResponse(c, 400, "missing-name", "name required");
  const id = `lbl_${uuid()}`;
  const label: Label = {
    id,
    userId: userIdOf(c),
    tenantId: tenantId(),
    name: body.name,
    color: body.color,
    parentId: body.parentId,
    connectionId: body.connectionId,
    order: 100,
  };
  saveRecord("mail.label", label as unknown as Record<string, unknown>);
  recordAudit({ actor: userIdOf(c), action: "mail.label.created", resource: "mail.label", recordId: id, payload: { name: body.name } });
  broadcastResourceChange("mail.label", id, "create", userIdOf(c));
  return c.json(label);
});

labelsRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const label = loadRecord<Label>("mail.label", id);
  if (!label || label.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "label not found");
  let body: Partial<Label> = {};
  try { body = (await c.req.json()) as Partial<Label>; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  const merged = { ...label, ...body, id, updatedAt: nowIso() };
  saveRecord("mail.label", merged as unknown as Record<string, unknown>);
  recordAudit({ actor: userIdOf(c), action: "mail.label.updated", resource: "mail.label", recordId: id });
  broadcastResourceChange("mail.label", id, "update", userIdOf(c));
  return c.json(merged);
});

labelsRoutes.delete("/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const label = loadRecord<Label>("mail.label", id);
  if (!label || label.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "label not found");
  db.prepare("DELETE FROM records WHERE resource = 'mail.label' AND id = ?").run(id);
  recordAudit({ actor: userIdOf(c), action: "mail.label.deleted", resource: "mail.label", recordId: id });
  broadcastResourceChange("mail.label", id, "delete", userIdOf(c));
  return c.json({ ok: true });
});

labelsRoutes.post("/reorder", async (c) => {
  let body: { order?: { id: string; order: number }[] } = {};
  try { body = (await c.req.json()) as typeof body; } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  for (const o of body.order ?? []) {
    const lab = loadRecord<Label>("mail.label", o.id);
    if (!lab || lab.userId !== userIdOf(c)) continue;
    lab.order = o.order;
    saveRecord("mail.label", lab as unknown as Record<string, unknown>);
    broadcastResourceChange("mail.label", o.id, "update", userIdOf(c));
  }
  return c.json({ ok: true });
});
