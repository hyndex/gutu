/** Async plan executor.
 *
 *  The HTTP request that triggers `POST /admin/plans/:id/execute`
 *  must NOT block while the plan runs — a 50-step plan with slow
 *  tools would blow past every reasonable load-balancer timeout.
 *  Instead we kick the executor onto a microtask via setImmediate,
 *  return 202 Accepted to the operator, and let them poll
 *  `/admin/plans/:id` for status.
 *
 *  Concurrency: at most one executor per plan id runs at a time.
 *  We track in-progress plans in a Set so a duplicate call from a
 *  twitchy admin double-click is a no-op.
 *
 *  Auto-rollback (opt-in): when the operator approves a plan with
 *  `autoRollback: true`, a step failure walks the per-step undo log
 *  ids in REVERSE order and reverses each. The reversed steps stay
 *  marked `succeeded` (the work happened, then was undone) but the
 *  plan ends `failed` with a rollback summary in failure_reason. */

import type { Agent } from "./agents";
import { getAgent } from "./agents";
import {
  completeStep,
  getPlan,
  markDone,
  markFailed,
  markRunning,
  skipRemainingSteps,
  startStep,
} from "./plans";
import { getTool } from "./tools";
import { logCallEnd, logCallStart } from "./audit";
import { undo as undoEntry } from "./undo";
import { track, untrack } from "./cancellation";
import { db } from "../../db";

const IN_FLIGHT = new Set<string>();

export interface ExecuteOptions {
  /** When true, a step failure triggers reverse-order undo of every
   *  succeeded step in the plan via the existing mcp_undo_log. */
  autoRollback?: boolean;
}

/** Kick a plan into background execution. Returns immediately with the
 *  current plan snapshot (status: "running"). The caller polls
 *  `/admin/plans/:id` to observe progress. */
export function enqueueExecute(args: {
  planId: string;
  byUserId: string;
  options?: ExecuteOptions;
}): { ok: true; planId: string } | { ok: false; error: string } {
  const plan = getPlan(args.planId);
  if (!plan) return { ok: false, error: "plan not found" };
  if (plan.status !== "approved") {
    return { ok: false, error: `plan must be approved (current: ${plan.status})` };
  }
  if (IN_FLIGHT.has(plan.id)) {
    return { ok: false, error: "plan is already executing" };
  }
  const agent = getAgent(plan.agentId);
  if (!agent) return { ok: false, error: "agent revoked" };

  IN_FLIGHT.add(plan.id);
  // Mark running synchronously so the caller's next /admin/plans/:id
  // GET sees the new state immediately.
  markRunning(plan.id);

  // setImmediate ensures the HTTP response flushes BEFORE the
  // executor begins. Without this, the executor could complete a
  // few steps before the response leaves the wire — operators
  // would see "running" when it's actually further along.
  setImmediate(() => {
    void runPlanSafely(agent, plan.id, args.byUserId, args.options ?? {});
  });

  return { ok: true, planId: plan.id };
}

async function runPlanSafely(
  agent: Agent,
  planId: string,
  byUserId: string,
  options: ExecuteOptions,
): Promise<void> {
  try {
    await runPlan(agent, planId, byUserId, options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    markFailed(planId, `executor crashed: ${msg}`);
  } finally {
    IN_FLIGHT.delete(planId);
  }
}

async function runPlan(
  agent: Agent,
  planId: string,
  byUserId: string,
  options: ExecuteOptions,
): Promise<void> {
  let failureSeen = false;
  let failureMessage = "";
  // Walk each step in seq order. The plan was loaded once at the
  // start; if the operator cancels mid-execution we observe it via
  // a re-fetch before each step.
  let plan = getPlan(planId);
  if (!plan) return;

  for (const step of plan.steps) {
    if (failureSeen) break;
    plan = getPlan(planId); // re-read for cancellation
    if (!plan || plan.status === "cancelled") {
      failureSeen = true;
      failureMessage = "plan was cancelled mid-execution";
      break;
    }
    startStep(step.id);
    const tool = getTool(step.toolName);
    if (!tool) {
      completeStep({ stepId: step.id, ok: false, errorMessage: `unknown tool ${step.toolName}` });
      failureSeen = true;
      failureMessage = `step ${step.seq + 1}: unknown tool ${step.toolName}`;
      break;
    }
    const callId = logCallStart({
      agentId: agent.id,
      tenantId: plan.tenantId,
      method: "plans/execute-step",
      toolName: tool.definition.name,
      resource: tool.resource,
      action: tool.scopeAction,
      risk: tool.risk,
      arguments: step.arguments,
    });
    const requestId = `plan-${planId}-step-${step.seq}`;
    const ctrl = track(requestId);
    const t0 = Date.now();
    try {
      const out = await tool.call({
        agent,
        tenantId: plan.tenantId,
        args: step.arguments,
        callId,
        signal: ctrl.signal,
      });
      logCallEnd(callId, { ok: true, resultSummary: out.resultSummary, latencyMs: Date.now() - t0 });
      completeStep({ stepId: step.id, ok: true, callLogId: callId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logCallEnd(callId, { ok: false, errorMessage: msg, latencyMs: Date.now() - t0 });
      completeStep({ stepId: step.id, ok: false, errorMessage: msg, callLogId: callId });
      failureSeen = true;
      failureMessage = `step ${step.seq + 1} (${step.toolName}): ${msg}`;
    } finally {
      untrack(requestId);
    }
  }

  if (failureSeen) {
    skipRemainingSteps(planId);
    if (options.autoRollback) {
      const rolledBack = await rollbackSucceededSteps(planId, byUserId);
      markFailed(
        planId,
        `${failureMessage}; auto-rolled back ${rolledBack} step(s)`,
      );
    } else {
      markFailed(planId, failureMessage);
    }
  } else {
    markDone(planId);
  }
}

/** Walk the undo log for every succeeded step in the plan IN REVERSE
 *  ORDER and call `undo(force=true)` on each. Force is necessary
 *  because the records were just touched by the agent so the
 *  concurrent-edit guard would otherwise refuse — the rollback IS the
 *  agent unwinding its own work, which is the safe case. */
async function rollbackSucceededSteps(planId: string, byUserId: string): Promise<number> {
  // Find every undo entry written DURING this plan's execution. We
  // join via `mcp_plan_step.call_log_id == mcp_undo_log.call_id`.
  const rows = db
    .prepare(
      `SELECT u.id AS undo_id
       FROM mcp_plan_step s
       JOIN mcp_undo_log u ON u.call_id = s.call_log_id
       WHERE s.plan_id = ? AND s.status = 'succeeded' AND u.reverted_at IS NULL
       ORDER BY s.seq DESC`,
    )
    .all(planId) as { undo_id: string }[];
  let reversed = 0;
  for (const r of rows) {
    const result = undoEntry({ entryId: r.undo_id, byUserId, force: true });
    if (result.ok) reversed++;
  }
  return reversed;
}

/** Test-only: clear in-flight state. */
export function _resetExecutor_forTest(): void {
  IN_FLIGHT.clear();
}
