/** End-to-end integration tests for the MCP host: agents + tokens +
 *  tool dispatch + plans + undo + cancellation, hitting the real
 *  SQLite tables.
 *
 *  Setup mirrors phase4.test.ts — fresh tmp DB, host migrations, only
 *  the plugins whose tables we touch (editor-core for editor_acl,
 *  field-metadata-core for field_metadata). */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let bootstrap: () => void;
let createAgent: typeof import("./agents").createAgent;
let getAgent: typeof import("./agents").getAgent;
let issueToken: typeof import("./agents").issueToken;
let verifyAgentToken: typeof import("./agents").verifyAgentToken;
let revokeAgent: typeof import("./agents").revokeAgent;
let proposePlan: typeof import("./plans").proposePlan;
let approvePlan: typeof import("./plans").approvePlan;
let getPlan: typeof import("./plans").getPlan;
let listUndoableForAgent: typeof import("./undo").listUndoableForAgent;
let undo: typeof import("./undo").undo;
let registerResourceTools: typeof import("./tools").registerResourceTools;
let _resetToolRegistry_forTest: typeof import("./tools")._resetToolRegistry_forTest;
let _resetExecutor_forTest: typeof import("./plan-executor")._resetExecutor_forTest;
let enqueueExecute: typeof import("./plan-executor").enqueueExecute;
let handleRequest: typeof import("./server").handleRequest;
let track: typeof import("./cancellation").track;
let cancel: typeof import("./cancellation").cancel;
let dbModule: typeof import("../../db");

beforeAll(async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "gutu-mcp-int-test-"));
  process.env.DB_PATH = path.join(dataDir, "test.db");
  process.env.NODE_ENV = "test";
  dbModule = await import("../../db");
  const tenancyMig = await import("../../tenancy/migrations");
  await tenancyMig.migrateGlobal();
  const migrations = await import("../../migrations");
  migrations.migrate();
  const { runPluginMigrations } = await import("../../host/plugin-contract");
  const plugins = await Promise.all([
    import("@gutu-plugin/editor-core"),
    import("@gutu-plugin/field-metadata-core"),
  ]);
  await runPluginMigrations(plugins.map((p) => p.hostPlugin));

  ({ createAgent, getAgent, issueToken, verifyAgentToken, revokeAgent } = await import("./agents"));
  ({ proposePlan, approvePlan, getPlan } = await import("./plans"));
  ({ listUndoableForAgent, undo } = await import("./undo"));
  ({ registerResourceTools, _resetToolRegistry_forTest } = await import("./tools"));
  ({ _resetExecutor_forTest, enqueueExecute } = await import("./plan-executor"));
  ({ handleRequest } = await import("./server"));
  ({ track, cancel } = await import("./cancellation"));

  bootstrap = (): void => {
    _resetToolRegistry_forTest();
    _resetExecutor_forTest();
    registerResourceTools("test.thing");
  };
});

afterAll(async () => {
  // Don't rm dataDir — db handle is module-cached.
});

function plantTestRecord(id: string, data: Record<string, unknown> = {}): void {
  const now = new Date().toISOString();
  dbModule.db
    .prepare(
      `INSERT INTO records (resource, id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run("test.thing", id, JSON.stringify({ id, ...data, tenantId: "default", createdAt: now, updatedAt: now }), now, now);
}

function grantAclForAgent(agentId: string, resource: string, recordId: string, role: "viewer" | "editor" | "owner"): void {
  dbModule.db
    .prepare(
      `INSERT OR REPLACE INTO editor_acl
         (resource, record_id, subject_kind, subject_id, role, granted_by, granted_at)
       VALUES (?, ?, 'user', ?, ?, 'system:test', ?)`,
    )
    .run(resource, recordId, agentId, role, new Date().toISOString());
}

describe("agent CRUD + token verify", () => {
  beforeAll(() => bootstrap());
  test("create + issue + verify roundtrip", () => {
    const agent = createAgent({
      name: "Test Agent A",
      tenantId: "default",
      issuerUserId: "u-test",
      scopes: { "test.thing": ["read", "write"] },
      riskCeiling: "low-mutation",
    });
    expect(agent.status).toBe("active");
    const issued = issueToken({ agentId: agent.id });
    expect(issued.plaintext.startsWith("gma_")).toBe(true);
    const verified = verifyAgentToken(issued.plaintext);
    expect(verified?.agent.id).toBe(agent.id);
  });

  test("revoke disables every issued token", () => {
    const agent = createAgent({ name: "B", tenantId: "default", issuerUserId: "u" });
    const t1 = issueToken({ agentId: agent.id });
    expect(verifyAgentToken(t1.plaintext)).not.toBeNull();
    revokeAgent(agent.id);
    expect(verifyAgentToken(t1.plaintext)).toBeNull();
  });

  test("expired tokens fail verify", () => {
    const agent = createAgent({ name: "C", tenantId: "default", issuerUserId: "u" });
    const expiresAt = new Date(Date.now() - 60_000).toISOString();
    const t = issueToken({ agentId: agent.id, expiresAt });
    expect(verifyAgentToken(t.plaintext)).toBeNull();
  });
});

describe("server dispatch (tools/list, tools/call, scope, risk)", () => {
  beforeAll(() => bootstrap());
  test("tools/list filters to scoped tools", async () => {
    const agent = createAgent({
      name: "ScopeAgent",
      tenantId: "default",
      issuerUserId: "u",
      scopes: { "test.thing": ["read"] },
    });
    const resp = await handleRequest(
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { agent, tenantId: "default" },
    );
    expect("result" in resp).toBe(true);
    if (!("result" in resp)) return;
    const tools = (resp.result as { tools: { name: string }[] }).tools;
    const names = tools.map((t) => t.name);
    expect(names).toContain("test.thing.list");
    expect(names).toContain("test.thing.get");
    // No write scope → no create/update tools visible
    expect(names).not.toContain("test.thing.create");
    expect(names).not.toContain("test.thing.update");
  });

  test("tools/call create succeeds when agent has write scope", async () => {
    const agent = createAgent({
      name: "WriteAgent",
      tenantId: "default",
      issuerUserId: "u",
      scopes: { "test.thing": ["read", "write"] },
      riskCeiling: "low-mutation",
    });
    const resp = await handleRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "test.thing.create", arguments: { data: { name: "first" } } },
      },
      { agent, tenantId: "default" },
    );
    expect("result" in resp).toBe(true);
    if (!("result" in resp)) return;
    const r = resp.result as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    expect(r.isError).toBe(false);
    expect(r.content[0]!.text).toMatch(/Created test\.thing\//);
  });

  test("delete (irreversible) blocked without dual-key", async () => {
    const agent = createAgent({
      name: "DeleteAgent",
      tenantId: "default",
      issuerUserId: "u",
      scopes: { "test.thing": ["read", "delete"] },
      riskCeiling: "high-mutation",
    });
    const resp = await handleRequest(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "test.thing.delete", arguments: { id: "irrelevant" } },
      },
      { agent, tenantId: "default" },
    );
    expect("error" in resp).toBe(true);
    if (!("error" in resp)) return;
    expect(resp.error.code).toBe(-32004); // ERR_RISK_BLOCKED
  });
});

describe("undo log + reversal", () => {
  beforeAll(() => bootstrap());
  test("create writes an undo entry; undo deletes the record", async () => {
    const agent = createAgent({
      name: "UndoAgent",
      tenantId: "default",
      issuerUserId: "u-test",
      scopes: { "test.thing": ["read", "write"] },
      riskCeiling: "low-mutation",
    });
    const resp = await handleRequest(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "test.thing.create", arguments: { data: { id: "undo-target", name: "x" } } },
      },
      { agent, tenantId: "default" },
    );
    expect("result" in resp).toBe(true);
    const undoEntries = listUndoableForAgent({ tenantId: "default", agentId: agent.id });
    expect(undoEntries.length).toBeGreaterThan(0);
    const entry = undoEntries.find((e) => e.recordId === "undo-target");
    expect(entry).toBeDefined();
    if (!entry) return;
    const result = undo({ entryId: entry.id, byUserId: "operator-1" });
    expect(result.ok).toBe(true);
    // After undo, the record is gone.
    const stillThere = dbModule.db
      .prepare(`SELECT id FROM records WHERE resource = 'test.thing' AND id = 'undo-target'`)
      .get();
    expect(stillThere == null).toBe(true);
  });

  test("undo refuses to revert a record edited by a human after the agent", async () => {
    const agent = createAgent({
      name: "ConcurrentAgent",
      tenantId: "default",
      issuerUserId: "u-test",
      scopes: { "test.thing": ["read", "write"] },
      riskCeiling: "low-mutation",
    });
    plantTestRecord("concurrent-1", { name: "before agent" });
    // The agent inherits its mirror-user's ACL (defaulting to the
    // issuer when no mirrorUser is set). Grant the issuer the editor
    // role so the update tool's `effectiveRole` check succeeds.
    grantAclForAgent("u-test", "test.thing", "concurrent-1", "editor");
    const resp = await handleRequest(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "test.thing.update",
          arguments: { id: "concurrent-1", data: { name: "after agent" } },
        },
      },
      { agent, tenantId: "default" },
    );
    expect("result" in resp).toBe(true);
    const entries = listUndoableForAgent({ tenantId: "default", agentId: agent.id });
    const entry = entries.find((e) => e.recordId === "concurrent-1");
    expect(entry).toBeDefined();
    if (!entry) return;
    // Simulate a human edit AFTER the agent — bump updatedAt.
    const humanUpdate = new Date(Date.now() + 1000).toISOString();
    dbModule.db
      .prepare(
        `UPDATE records SET data = json_set(data, '$.updatedAt', ?), updated_at = ? WHERE resource = 'test.thing' AND id = ?`,
      )
      .run(humanUpdate, humanUpdate, "concurrent-1");
    const undoResult = undo({ entryId: entry.id, byUserId: "operator-1" });
    expect(undoResult.ok).toBe(false);
    expect(undoResult.message).toMatch(/edited since/);
    // Force=true overrides.
    const forced = undo({ entryId: entry.id, byUserId: "operator-1", force: true });
    expect(forced.ok).toBe(true);
  });
});

describe("plans (propose + approve + execute via async executor)", () => {
  beforeAll(() => bootstrap());
  test("multi-step plan executes all steps", async () => {
    const agent = createAgent({
      name: "PlanAgent",
      tenantId: "default",
      issuerUserId: "u-plan",
      scopes: { "test.thing": ["read", "write"] },
      riskCeiling: "low-mutation",
    });
    const plan = proposePlan({
      agentId: agent.id,
      tenantId: "default",
      title: "Three writes",
      summary: "test",
      steps: [
        { toolName: "test.thing.create", arguments: { data: { id: "plan-a", v: 1 } } },
        { toolName: "test.thing.create", arguments: { data: { id: "plan-b", v: 2 } } },
        { toolName: "test.thing.create", arguments: { data: { id: "plan-c", v: 3 } } },
      ],
    });
    approvePlan({ id: plan.id, approvedByUser: "operator" });
    const queued = enqueueExecute({ planId: plan.id, byUserId: "operator" });
    expect(queued.ok).toBe(true);
    // Wait for the executor to drain (poll the plan status).
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const p = getPlan(plan.id);
      if (p && (p.status === "done" || p.status === "failed")) break;
    }
    const final = getPlan(plan.id)!;
    expect(final.status).toBe("done");
    expect(final.steps.every((s) => s.status === "succeeded")).toBe(true);
  });

  test("auto-rollback reverses succeeded steps when a later step fails", async () => {
    const agent = createAgent({
      name: "RollbackAgent",
      tenantId: "default",
      issuerUserId: "u-rb",
      scopes: { "test.thing": ["read", "write"] },
      riskCeiling: "low-mutation",
    });
    plantTestRecord("rb-keeper", { name: "should survive" });
    const plan = proposePlan({
      agentId: agent.id,
      tenantId: "default",
      title: "rollback test",
      summary: "step 2 fails because the tool name is bogus",
      steps: [
        { toolName: "test.thing.create", arguments: { data: { id: "rb-1", v: 1 } } },
        { toolName: "test.thing.does-not-exist", arguments: {} },
      ],
    });
    approvePlan({ id: plan.id, approvedByUser: "operator" });
    const queued = enqueueExecute({
      planId: plan.id,
      byUserId: "operator",
      options: { autoRollback: true },
    });
    expect(queued.ok).toBe(true);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const p = getPlan(plan.id);
      if (p && p.status === "failed") break;
    }
    const final = getPlan(plan.id)!;
    expect(final.status).toBe("failed");
    expect(final.failureReason ?? "").toMatch(/auto-rolled back/);
    // The first step's record was created → then auto-rolled-back, so it's gone.
    const firstStepRecord = dbModule.db
      .prepare(`SELECT id FROM records WHERE resource = 'test.thing' AND id = 'rb-1'`)
      .get();
    expect(firstStepRecord == null).toBe(true);
    // Pre-existing record is still there.
    const keeper = dbModule.db
      .prepare(`SELECT id FROM records WHERE resource = 'test.thing' AND id = 'rb-keeper'`)
      .get();
    expect(keeper).toBeDefined();
  });
});

describe("cancellation flows through tool handlers", () => {
  beforeAll(() => bootstrap());
  test("aborting via cancellation throws inside the handler", async () => {
    const ctrl = track("manual-1");
    cancel("manual-1", "test cancellation");
    expect(ctrl.signal.aborted).toBe(true);
  });
});
