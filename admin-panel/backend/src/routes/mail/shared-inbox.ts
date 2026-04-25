/** /api/mail/shared-inbox — assignment + comments + SLA. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const sharedRoutes = new Hono();
sharedRoutes.use("*", requireAuth);

sharedRoutes.post("/assign", async (c) => {
  let body: { threadId?: string; assigneeUserId?: string; dueAt?: string } = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  if (!body.threadId || !body.assigneeUserId) return errorResponse(c, 400, "missing-fields", "threadId + assigneeUserId required");
  const id = `assign_${body.threadId}`;
  const data = {
    id,
    threadId: body.threadId,
    assigneeUserId: body.assigneeUserId,
    assignedBy: userIdOf(c),
    dueAt: body.dueAt,
    tenantId: tenantId(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveRecord("mail.shared-inbox-assignment", data);
  recordAudit({ actor: userIdOf(c), action: "mail.shared.assigned", resource: "mail.thread", recordId: body.threadId, payload: { assigneeUserId: body.assigneeUserId } });
  broadcastResourceChange("mail.shared-inbox-assignment", id, "create", userIdOf(c));
  return c.json(data);
});

sharedRoutes.delete("/assign/:threadId", (c) => {
  const threadId = c.req.param("threadId") ?? "";
  db.prepare("DELETE FROM records WHERE resource = 'mail.shared-inbox-assignment' AND id = ?").run(`assign_${threadId}`);
  broadcastResourceChange("mail.shared-inbox-assignment", `assign_${threadId}`, "delete", userIdOf(c));
  return c.json({ ok: true });
});

sharedRoutes.post("/comments", async (c) => {
  let body: { threadId?: string; body?: string; mentions?: string[] } = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  if (!body.threadId || !body.body) return errorResponse(c, 400, "missing-fields", "threadId + body required");
  const id = `cmt_${uuid()}`;
  db.prepare(
    `INSERT INTO mail_shared_comment (id, thread_id, user_id, tenant_id, author_email, body, mentions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.threadId,
    userIdOf(c),
    tenantId(),
    String((c.get("user") as { email?: string })?.email ?? userIdOf(c)),
    body.body,
    JSON.stringify(body.mentions ?? []),
    nowIso(),
  );
  recordAudit({ actor: userIdOf(c), action: "mail.shared.commented", resource: "mail.thread", recordId: body.threadId, payload: { commentId: id } });
  broadcastResourceChange("mail.shared-comment", id, "create", userIdOf(c));
  return c.json({ id });
});

sharedRoutes.get("/comments/:threadId", (c) => {
  const threadId = c.req.param("threadId") ?? "";
  const rows = db
    .prepare(`SELECT * FROM mail_shared_comment WHERE thread_id = ? AND tenant_id = ? ORDER BY created_at ASC LIMIT 1000`)
    .all(threadId, tenantId()) as Record<string, unknown>[];
  return c.json({ rows });
});

sharedRoutes.post("/status", async (c) => {
  let body: { threadId?: string; status?: "open" | "pending" | "closed" } = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  if (!body.threadId || !body.status) return errorResponse(c, 400, "missing-fields", "threadId + status required");
  const t = loadRecord<Record<string, unknown>>("mail.thread", body.threadId);
  if (!t) return errorResponse(c, 404, "not-found", "thread not found");
  t.sharedStatus = body.status;
  saveRecord("mail.thread", t);
  recordAudit({ actor: userIdOf(c), action: "mail.shared.status", resource: "mail.thread", recordId: body.threadId, payload: { status: body.status } });
  broadcastResourceChange("mail.thread", body.threadId, "update", userIdOf(c));
  return c.json({ ok: true });
});
