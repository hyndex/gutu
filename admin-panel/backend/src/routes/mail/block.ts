/** /api/mail/block — materialize a "block sender" rule and apply it to
 *  existing matches. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { errorResponse, tenantId, userIdOf } from "./_helpers";
import { isValidEmail, normalizeEmail } from "../../lib/mail/address";

export const blockRoutes = new Hono();
blockRoutes.use("*", requireAuth);

blockRoutes.post("/sender", async (c) => {
  let body: { email?: string; mode?: "trash" | "spam" | "label"; labelId?: string } = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body required"); }
  if (!body.email || !isValidEmail(body.email)) return errorResponse(c, 400, "bad-email", "valid email required");
  const email = normalizeEmail(body.email);
  const mode = body.mode ?? "spam";

  // Ensure no duplicate.
  const existing = db
    .prepare(
      `SELECT id FROM records WHERE resource = 'mail.rule' AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.metadata.kind') = 'block-sender'
       AND json_extract(data, '$.metadata.email') = ?`,
    )
    .get(userIdOf(c), email) as { id: string } | undefined;
  if (existing) return c.json({ ruleId: existing.id, alreadyBlocked: true });

  const id = `rule_${uuid()}`;
  const now = nowIso();
  const action = mode === "label" && body.labelId
    ? [{ kind: "applyLabel", args: { labelId: body.labelId } }]
    : mode === "trash"
      ? [{ kind: "trash" }]
      : [{ kind: "applyLabel", args: { labelId: "SPAM" } }, { kind: "markRead" }];
  const data = JSON.stringify({
    id,
    userId: userIdOf(c),
    tenantId: tenantId(),
    name: `Block sender: ${email}`,
    enabled: true,
    order: 10,
    when: { kind: "leaf", leaf: { field: "fromEmail", op: "eq", value: email } },
    then: action,
    metadata: { kind: "block-sender", email },
    createdAt: now,
    updatedAt: now,
  });
  db.prepare(
    `INSERT INTO records (resource, id, data, created_at, updated_at) VALUES ('mail.rule', ?, ?, ?, ?)`,
  ).run(id, data, now, now);
  recordAudit({ actor: userIdOf(c), action: "mail.block.sender", resource: "mail.rule", recordId: id, payload: { email, mode } });
  broadcastResourceChange("mail.rule", id, "create", userIdOf(c));

  // Apply retroactively to recent threads from this sender.
  const recent = db
    .prepare(
      `SELECT id, data FROM records WHERE resource = 'mail.thread'
       AND json_extract(data, '$.userId') = ? AND LOWER(json_extract(data, '$.fromEmail')) = ?
       AND json_extract(data, '$.folder') = 'inbox' LIMIT 500`,
    )
    .all(userIdOf(c), email) as { id: string; data: string }[];
  let moved = 0;
  for (const r of recent) {
    const t = JSON.parse(r.data) as Record<string, unknown>;
    t.folder = mode === "trash" ? "trash" : "spam";
    t.unreadCount = 0;
    t.updatedAt = now;
    db.prepare(`UPDATE records SET data = ?, updated_at = ? WHERE resource = 'mail.thread' AND id = ?`)
      .run(JSON.stringify(t), now, r.id);
    broadcastResourceChange("mail.thread", r.id, "update", userIdOf(c));
    moved++;
  }
  return c.json({ ruleId: id, alreadyBlocked: false, moved });
});

blockRoutes.delete("/sender/:email", (c) => {
  const email = (c.req.param("email") ?? "").toLowerCase();
  const rows = db
    .prepare(
      `SELECT id FROM records WHERE resource = 'mail.rule' AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.metadata.kind') = 'block-sender'
       AND json_extract(data, '$.metadata.email') = ?`,
    )
    .all(userIdOf(c), email) as { id: string }[];
  if (rows.length === 0) return errorResponse(c, 404, "not-found", "no block rule for sender");
  for (const r of rows) {
    db.prepare(`DELETE FROM records WHERE resource = 'mail.rule' AND id = ?`).run(r.id);
    broadcastResourceChange("mail.rule", r.id, "delete", userIdOf(c));
  }
  recordAudit({ actor: userIdOf(c), action: "mail.unblock.sender", resource: "mail.rule", payload: { email } });
  return c.json({ ok: true, removed: rows.length });
});

blockRoutes.get("/senders", (c) => {
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.rule' AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.metadata.kind') = 'block-sender'`,
    )
    .all(userIdOf(c)) as { data: string }[];
  const senders = rows
    .map((r) => JSON.parse(r.data) as { id: string; metadata: { email: string }; createdAt: string })
    .map((r) => ({ id: r.id, email: r.metadata.email, createdAt: r.createdAt }));
  return c.json({ rows: senders });
});
