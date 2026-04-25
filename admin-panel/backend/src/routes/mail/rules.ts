/** /api/mail/rules — CRUD + dry-run for the rules engine. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { uuid } from "../../lib/id";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const rulesRoutes = new Hono();
rulesRoutes.use("*", requireAuth);

interface RuleAction {
  kind: "applyLabel" | "archive" | "trash" | "star" | "markRead" | "forward" | "snooze" | "runWebhook" | "rewriteSubject";
  args?: Record<string, unknown>;
}
interface RuleConditionLeaf { field: string; op: string; value?: unknown }
interface RuleConditionTree { kind: "leaf"; leaf: RuleConditionLeaf; }
type RuleCondition = RuleConditionTree | { kind: "and" | "or"; children: RuleCondition[] };

interface Rule {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  order: number;
  when: RuleCondition;
  then: RuleAction[];
  createdAt: string;
  updatedAt: string;
}

rulesRoutes.get("/", (c) => {
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.rule' AND json_extract(data, '$.userId') = ? AND json_extract(data, '$.tenantId') = ?
       ORDER BY json_extract(data, '$.order') ASC`,
    )
    .all(userIdOf(c), tenantId()) as { data: string }[];
  return c.json({ rows: rows.map((r) => JSON.parse(r.data)) });
});

rulesRoutes.post("/", async (c) => {
  let body: Partial<Rule> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  if (!body.name || !body.when || !body.then) return errorResponse(c, 400, "missing-fields", "name, when, then required");
  const id = `rule_${uuid()}`;
  const rule: Rule = {
    id,
    userId: userIdOf(c),
    tenantId: tenantId(),
    name: body.name,
    enabled: body.enabled ?? true,
    order: body.order ?? 100,
    when: body.when as RuleCondition,
    then: body.then as RuleAction[],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveRecord("mail.rule", rule as unknown as Record<string, unknown>);
  recordAudit({ actor: userIdOf(c), action: "mail.rule.created", resource: "mail.rule", recordId: id });
  broadcastResourceChange("mail.rule", id, "create", userIdOf(c));
  return c.json(rule);
});

rulesRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id") ?? "";
  const r = loadRecord<Rule>("mail.rule", id);
  if (!r || r.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "rule not found");
  let body: Partial<Rule> = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const merged = { ...r, ...body, id, updatedAt: nowIso() };
  saveRecord("mail.rule", merged as unknown as Record<string, unknown>);
  broadcastResourceChange("mail.rule", id, "update", userIdOf(c));
  return c.json(merged);
});

rulesRoutes.delete("/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const r = loadRecord<Rule>("mail.rule", id);
  if (!r || r.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "rule not found");
  db.prepare("DELETE FROM records WHERE resource = 'mail.rule' AND id = ?").run(id);
  recordAudit({ actor: userIdOf(c), action: "mail.rule.deleted", resource: "mail.rule", recordId: id });
  broadcastResourceChange("mail.rule", id, "delete", userIdOf(c));
  return c.json({ ok: true });
});

rulesRoutes.post("/dry-run/:id", (c) => {
  const id = c.req.param("id") ?? "";
  const r = loadRecord<Rule>("mail.rule", id);
  if (!r || r.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "rule not found");
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.message' AND json_extract(data, '$.userId') = ?
       AND json_extract(data, '$.receivedAt') >= ?
       LIMIT 5000`,
    )
    .all(userIdOf(c), new Date(Date.now() - 30 * 86_400_000).toISOString()) as { data: string }[];
  const messages = rows.map((row) => JSON.parse(row.data) as Record<string, unknown>);
  const matched = messages.filter((m) => evaluate(r.when, m));
  return c.json({ scanned: messages.length, matched: matched.length, sample: matched.slice(0, 25) });
});

export function evaluate(node: RuleCondition, record: Record<string, unknown>): boolean {
  if (node.kind === "leaf") {
    const v = readPath(record, node.leaf.field);
    return matches(v, node.leaf.op, node.leaf.value);
  }
  if (node.kind === "and") return node.children.every((c) => evaluate(c, record));
  if (node.kind === "or") return node.children.some((c) => evaluate(c, record));
  return false;
}

function readPath(rec: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, rec);
}

function matches(value: unknown, op: string, target: unknown): boolean {
  switch (op) {
    case "eq": return value === target;
    case "neq": return value !== target;
    case "contains": return typeof value === "string" && typeof target === "string" && value.toLowerCase().includes(target.toLowerCase());
    case "starts_with": return typeof value === "string" && typeof target === "string" && value.toLowerCase().startsWith(target.toLowerCase());
    case "ends_with": return typeof value === "string" && typeof target === "string" && value.toLowerCase().endsWith(target.toLowerCase());
    case "in": return Array.isArray(target) && target.includes(value);
    case "nin": return Array.isArray(target) && !target.includes(value);
    case "is_empty": return value === undefined || value === null || value === "";
    case "is_not_empty": return value !== undefined && value !== null && value !== "";
    case "gt": return typeof value === "number" && typeof target === "number" && value > target;
    case "lt": return typeof value === "number" && typeof target === "number" && value < target;
    default: return false;
  }
}
