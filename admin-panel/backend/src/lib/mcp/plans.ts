/** Multi-step plan approval.
 *
 *  An agent can ask the operator to pre-approve a sequence of tool
 *  calls — useful for batched operations ("create 50 contacts from
 *  this CSV") where individual confirmation prompts would be tedious
 *  but a single all-or-nothing approval is reasonable.
 *
 *  Lifecycle:
 *
 *    proposed  ─approveByOperator─▶  approved  ─executeAtomically─▶  done
 *        │                              │
 *        └─cancel─▶  cancelled          └─reject─▶  rejected
 *
 *  Each plan is bound to one (agent, tenant). Approval is granted by a
 *  HUMAN operator via the admin UI. Execution runs each step in
 *  sequence, all-or-nothing — a failure mid-execution rolls back the
 *  prior steps via the undo log. */

import type { SQLQueryBindings } from "bun:sqlite";
import { db } from "../../db";
import { uuid } from "../id";

const MAX_STEPS = 100;

db.exec(`
  CREATE TABLE IF NOT EXISTS mcp_plan (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'proposed',
    proposed_at TEXT NOT NULL,
    approved_at TEXT,
    approved_by_user TEXT,
    executed_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    failure_reason TEXT
  );
  CREATE INDEX IF NOT EXISTS mcp_plan_agent_status ON mcp_plan(agent_id, status);

  CREATE TABLE IF NOT EXISTS mcp_plan_step (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES mcp_plan(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    tool_name TEXT NOT NULL,
    arguments TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT,
    call_log_id TEXT,
    undo_log_id TEXT
  );
  CREATE INDEX IF NOT EXISTS mcp_plan_step_plan_seq ON mcp_plan_step(plan_id, seq);
`);

export type PlanStatus =
  | "proposed"
  | "approved"
  | "running"
  | "done"
  | "failed"
  | "rejected"
  | "cancelled";

export type StepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export interface PlanStep {
  id: string;
  seq: number;
  toolName: string;
  arguments: Record<string, unknown>;
  note?: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  callLogId?: string;
  undoLogId?: string;
}

export interface Plan {
  id: string;
  agentId: string;
  tenantId: string;
  title: string;
  summary: string;
  status: PlanStatus;
  proposedAt: string;
  approvedAt?: string;
  approvedByUser?: string;
  executedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failureReason?: string;
  steps: PlanStep[];
}

interface PlanRow {
  id: string;
  agent_id: string;
  tenant_id: string;
  title: string;
  summary: string;
  status: string;
  proposed_at: string;
  approved_at: string | null;
  approved_by_user: string | null;
  executed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  failure_reason: string | null;
}

interface StepRow {
  id: string;
  plan_id: string;
  seq: number;
  tool_name: string;
  arguments: string;
  note: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  call_log_id: string | null;
  undo_log_id: string | null;
}

function rowToStep(r: StepRow): PlanStep {
  return {
    id: r.id,
    seq: r.seq,
    toolName: r.tool_name,
    arguments: JSON.parse(r.arguments) as Record<string, unknown>,
    note: r.note ?? undefined,
    status: r.status as StepStatus,
    startedAt: r.started_at ?? undefined,
    completedAt: r.completed_at ?? undefined,
    errorMessage: r.error_message ?? undefined,
    callLogId: r.call_log_id ?? undefined,
    undoLogId: r.undo_log_id ?? undefined,
  };
}

function rowToPlan(p: PlanRow): Plan {
  const steps = (db
    .prepare(`SELECT * FROM mcp_plan_step WHERE plan_id = ? ORDER BY seq ASC`)
    .all(p.id) as StepRow[]).map(rowToStep);
  return {
    id: p.id,
    agentId: p.agent_id,
    tenantId: p.tenant_id,
    title: p.title,
    summary: p.summary,
    status: p.status as PlanStatus,
    proposedAt: p.proposed_at,
    approvedAt: p.approved_at ?? undefined,
    approvedByUser: p.approved_by_user ?? undefined,
    executedAt: p.executed_at ?? undefined,
    completedAt: p.completed_at ?? undefined,
    cancelledAt: p.cancelled_at ?? undefined,
    failureReason: p.failure_reason ?? undefined,
    steps,
  };
}

export interface ProposePlanArgs {
  agentId: string;
  tenantId: string;
  title: string;
  summary?: string;
  steps: ReadonlyArray<{ toolName: string; arguments: Record<string, unknown>; note?: string }>;
}

export function proposePlan(args: ProposePlanArgs): Plan {
  if (args.steps.length === 0) throw new Error("plan must have at least one step");
  if (args.steps.length > MAX_STEPS) {
    throw new Error(`plan too long (max ${MAX_STEPS} steps)`);
  }
  const planId = uuid();
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO mcp_plan (id, agent_id, tenant_id, title, summary, status, proposed_at)
       VALUES (?, ?, ?, ?, ?, 'proposed', ?)`,
    ).run(planId, args.agentId, args.tenantId, args.title, args.summary ?? "", now);
    args.steps.forEach((s, i) => {
      db.prepare(
        `INSERT INTO mcp_plan_step (id, plan_id, seq, tool_name, arguments, note, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      ).run(uuid(), planId, i, s.toolName, JSON.stringify(s.arguments), s.note ?? null);
    });
  });
  tx();
  return getPlan(planId)!;
}

export function listPlans(tenantId: string, agentId?: string): Plan[] {
  const params: SQLQueryBindings[] = [tenantId];
  let where = `WHERE tenant_id = ?`;
  if (agentId) {
    where += ` AND agent_id = ?`;
    params.push(agentId);
  }
  const rows = db
    .prepare(`SELECT * FROM mcp_plan ${where} ORDER BY proposed_at DESC LIMIT 200`)
    .all(...params) as PlanRow[];
  return rows.map(rowToPlan);
}

export function getPlan(id: string): Plan | null {
  const row = db.prepare(`SELECT * FROM mcp_plan WHERE id = ?`).get(id) as PlanRow | undefined;
  return row ? rowToPlan(row) : null;
}

export function approvePlan(args: { id: string; approvedByUser: string }): Plan {
  const plan = getPlan(args.id);
  if (!plan) throw new Error("plan not found");
  if (plan.status !== "proposed") throw new Error(`cannot approve plan in status ${plan.status}`);
  db.prepare(
    `UPDATE mcp_plan SET status = 'approved', approved_at = ?, approved_by_user = ? WHERE id = ?`,
  ).run(new Date().toISOString(), args.approvedByUser, args.id);
  return getPlan(args.id)!;
}

export function rejectPlan(id: string): Plan {
  const plan = getPlan(id);
  if (!plan) throw new Error("plan not found");
  if (plan.status !== "proposed") throw new Error(`cannot reject plan in status ${plan.status}`);
  db.prepare(
    `UPDATE mcp_plan SET status = 'rejected', cancelled_at = ? WHERE id = ?`,
  ).run(new Date().toISOString(), id);
  return getPlan(id)!;
}

export function cancelPlan(id: string): Plan {
  const plan = getPlan(id);
  if (!plan) throw new Error("plan not found");
  if (plan.status === "done" || plan.status === "running") {
    throw new Error(`cannot cancel plan in status ${plan.status}`);
  }
  db.prepare(
    `UPDATE mcp_plan SET status = 'cancelled', cancelled_at = ? WHERE id = ?`,
  ).run(new Date().toISOString(), id);
  return getPlan(id)!;
}

export function markRunning(id: string): void {
  db.prepare(
    `UPDATE mcp_plan SET status = 'running', executed_at = ? WHERE id = ?`,
  ).run(new Date().toISOString(), id);
}

export function markDone(id: string): void {
  db.prepare(
    `UPDATE mcp_plan SET status = 'done', completed_at = ? WHERE id = ?`,
  ).run(new Date().toISOString(), id);
}

export function markFailed(id: string, reason: string): void {
  db.prepare(
    `UPDATE mcp_plan SET status = 'failed', completed_at = ?, failure_reason = ? WHERE id = ?`,
  ).run(new Date().toISOString(), reason.slice(0, 500), id);
}

export function startStep(stepId: string): void {
  db.prepare(
    `UPDATE mcp_plan_step SET status = 'running', started_at = ? WHERE id = ?`,
  ).run(new Date().toISOString(), stepId);
}

export function completeStep(args: { stepId: string; ok: boolean; errorMessage?: string; callLogId?: string; undoLogId?: string }): void {
  db.prepare(
    `UPDATE mcp_plan_step SET
       status = ?, completed_at = ?, error_message = ?, call_log_id = ?, undo_log_id = ?
     WHERE id = ?`,
  ).run(
    args.ok ? "succeeded" : "failed",
    new Date().toISOString(),
    args.errorMessage ?? null,
    args.callLogId ?? null,
    args.undoLogId ?? null,
    args.stepId,
  );
}

export function skipRemainingSteps(planId: string): void {
  db.prepare(
    `UPDATE mcp_plan_step SET status = 'skipped' WHERE plan_id = ? AND status = 'pending'`,
  ).run(planId);
}
