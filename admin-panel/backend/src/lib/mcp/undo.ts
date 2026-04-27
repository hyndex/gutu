/** Reversibility / undo log.
 *
 *  Every MCP-driven mutation (low-mutation, high-mutation, irreversible)
 *  writes one row here capturing the BEFORE state. An operator can
 *  replay the undo within the retention window to revert the record
 *  to its pre-mutation shape.
 *
 *  Why we need this above the existing audit log: `mcp_call_log` records
 *  WHAT happened; `mcp_undo_log` records HOW TO REVERSE IT. The two
 *  serve different purposes — audit is forensic, undo is operational.
 *
 *  Retention: 24h by default. Beyond that, the undo data is purged
 *  by the GC task — by then the record has been touched by other
 *  parties and an undo would clobber human edits. */

import type { SQLQueryBindings } from "bun:sqlite";
import { db } from "../../db";
import { uuid } from "../id";
import { getRecord, insertRecord, updateRecord, deleteRecord } from "../query";

const UNDO_TTL_MS = 24 * 60 * 60_000;

db.exec(`
  CREATE TABLE IF NOT EXISTS mcp_undo_log (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    resource TEXT NOT NULL,
    record_id TEXT NOT NULL,
    op TEXT NOT NULL,
    before_state TEXT,
    after_state TEXT,
    reverted_at TEXT,
    reverted_by_user TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS mcp_undo_call ON mcp_undo_log(call_id);
  CREATE INDEX IF NOT EXISTS mcp_undo_agent_time ON mcp_undo_log(agent_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS mcp_undo_record ON mcp_undo_log(resource, record_id, created_at DESC);
`);

export type UndoOp = "create" | "update" | "delete";

export interface UndoEntry {
  id: string;
  callId: string;
  agentId: string;
  tenantId: string;
  resource: string;
  recordId: string;
  op: UndoOp;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  revertedAt?: string;
  revertedByUser?: string;
  expiresAt: string;
  createdAt: string;
}

interface UndoRow {
  id: string;
  call_id: string;
  agent_id: string;
  tenant_id: string;
  resource: string;
  record_id: string;
  op: string;
  before_state: string | null;
  after_state: string | null;
  reverted_at: string | null;
  reverted_by_user: string | null;
  expires_at: string;
  created_at: string;
}

function rowToEntry(row: UndoRow): UndoEntry {
  return {
    id: row.id,
    callId: row.call_id,
    agentId: row.agent_id,
    tenantId: row.tenant_id,
    resource: row.resource,
    recordId: row.record_id,
    op: row.op as UndoOp,
    beforeState: row.before_state ? (JSON.parse(row.before_state) as Record<string, unknown>) : null,
    afterState: row.after_state ? (JSON.parse(row.after_state) as Record<string, unknown>) : null,
    revertedAt: row.reverted_at ?? undefined,
    revertedByUser: row.reverted_by_user ?? undefined,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/** Record a mutation. Called by the tool handlers AFTER the mutation
 *  succeeds, so a failed mutation never produces a stale undo entry. */
export function recordUndo(args: {
  callId: string;
  agentId: string;
  tenantId: string;
  resource: string;
  recordId: string;
  op: UndoOp;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}): string {
  const id = uuid();
  const now = new Date();
  const expires = new Date(now.getTime() + UNDO_TTL_MS);
  db.prepare(
    `INSERT INTO mcp_undo_log
       (id, call_id, agent_id, tenant_id, resource, record_id, op,
        before_state, after_state, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    args.callId,
    args.agentId,
    args.tenantId,
    args.resource,
    args.recordId,
    args.op,
    args.beforeState ? JSON.stringify(args.beforeState) : null,
    args.afterState ? JSON.stringify(args.afterState) : null,
    expires.toISOString(),
    now.toISOString(),
  );
  return id;
}

export function listUndoableForAgent(args: { tenantId: string; agentId?: string; limit?: number }): UndoEntry[] {
  const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
  const params: SQLQueryBindings[] = [args.tenantId];
  let where = `WHERE tenant_id = ? AND reverted_at IS NULL AND expires_at > ?`;
  params.push(new Date().toISOString());
  if (args.agentId) {
    where += ` AND agent_id = ?`;
    params.push(args.agentId);
  }
  params.push(limit);
  const rows = db
    .prepare(`SELECT * FROM mcp_undo_log ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...params) as UndoRow[];
  return rows.map(rowToEntry);
}

export function getUndoEntry(id: string): UndoEntry | null {
  const row = db.prepare(`SELECT * FROM mcp_undo_log WHERE id = ?`).get(id) as UndoRow | undefined;
  return row ? rowToEntry(row) : null;
}

export interface UndoOutcome {
  ok: boolean;
  resource: string;
  recordId: string;
  message: string;
}

/** Reverse an MCP-driven mutation. Operator-only — the calling route
 *  authenticates via the human session, NOT the agent token.
 *
 *  Safety:
 *    - refuses to undo entries that have already been reverted
 *    - refuses to undo expired entries (>24h)
 *    - refuses to undo when the current record state has been mutated
 *      by another party since the agent's change (concurrent-edit
 *      protection — would otherwise clobber a human edit)
 *    - the undo itself is recorded in `mcp_call_log` so the audit
 *      trail captures both the original and the reversal */
export function undo(args: {
  entryId: string;
  byUserId: string;
  /** Force-undo even if the record has been touched since. Off by
   *  default; the admin UI surfaces this as an explicit "I know what
   *  I'm doing" checkbox. */
  force?: boolean;
}): UndoOutcome {
  const entry = getUndoEntry(args.entryId);
  if (!entry) return { ok: false, resource: "", recordId: "", message: "undo entry not found" };
  if (entry.revertedAt) return { ok: false, resource: entry.resource, recordId: entry.recordId, message: "already reverted" };
  if (Date.parse(entry.expiresAt) < Date.now()) {
    return { ok: false, resource: entry.resource, recordId: entry.recordId, message: "undo window has expired" };
  }

  const current = getRecord(entry.resource, entry.recordId);

  // Concurrent-edit detection. If the record's `updatedAt` is newer
  // than the agent's `afterState.updatedAt`, someone else has touched
  // the record since the agent. Refuse unless force=true.
  if (!args.force && current && entry.afterState) {
    const agentUpdate = (entry.afterState.updatedAt ?? entry.afterState.updated_at) as string | undefined;
    const liveUpdate = (current.updatedAt ?? current.updated_at) as string | undefined;
    if (agentUpdate && liveUpdate && Date.parse(liveUpdate) > Date.parse(agentUpdate)) {
      return {
        ok: false,
        resource: entry.resource,
        recordId: entry.recordId,
        message: "record has been edited since the agent's change — pass force=true to override",
      };
    }
  }

  // Reverse the operation.
  if (entry.op === "create") {
    // Undo a create → delete the record.
    if (current) deleteRecord(entry.resource, entry.recordId);
  } else if (entry.op === "update") {
    if (entry.beforeState) {
      // Undo an update → write the before-state back.
      updateRecord(entry.resource, entry.recordId, entry.beforeState);
    }
  } else if (entry.op === "delete") {
    // Undo a delete → re-insert the before-state record.
    if (entry.beforeState && !current) {
      insertRecord(entry.resource, entry.recordId, entry.beforeState);
    }
  }

  db.prepare(
    `UPDATE mcp_undo_log SET reverted_at = ?, reverted_by_user = ? WHERE id = ?`,
  ).run(new Date().toISOString(), args.byUserId, entry.id);

  return {
    ok: true,
    resource: entry.resource,
    recordId: entry.recordId,
    message: `undid ${entry.op} on ${entry.resource}/${entry.recordId}`,
  };
}

/** GC stale rows. Call from a periodic job; not on the critical path. */
export function purgeExpiredUndo(): number {
  const r = db
    .prepare(`DELETE FROM mcp_undo_log WHERE expires_at < ?`)
    .run(new Date().toISOString());
  return r.changes;
}
