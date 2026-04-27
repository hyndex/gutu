/** MCP HTTP transport. Implements the "Streamable HTTP" transport
 *  from the MCP spec — a single endpoint that accepts JSON-RPC over
 *  POST. The same endpoint upgrades to Server-Sent Events (SSE) when
 *  the client sends `Accept: text/event-stream`, giving the server a
 *  push channel for notifications and server-initiated sampling
 *  requests on the same connection. The plain JSON path remains
 *  available for clients that don't speak SSE; they can long-poll the
 *  notification queue via the custom `notifications/poll` RPC.
 *
 *  For local CLI / desktop agents, an alternative stdio transport is
 *  shipped as `scripts/mcp-stdio.ts` — same handler graph, NDJSON over
 *  stdin/stdout, env-var auth.
 *
 *  Endpoints:
 *    GET  /api/mcp          — discovery: returns server info + auth hint
 *    POST /api/mcp          — JSON-RPC request; returns JSON-RPC
 *                             response (default) OR an SSE stream when
 *                             `Accept: text/event-stream` is set.
 *
 *  Plus the admin endpoints (NOT MCP — these are for human operators):
 *    GET    /api/mcp/admin/agents               — list agents
 *    POST   /api/mcp/admin/agents               — create agent
 *    GET    /api/mcp/admin/agents/:id           — get agent
 *    PATCH  /api/mcp/admin/agents/:id           — update agent
 *    DELETE /api/mcp/admin/agents/:id           — revoke agent
 *    POST   /api/mcp/admin/agents/:id/tokens    — issue bearer token
 *    DELETE /api/mcp/admin/tokens/:tokenId      — revoke token
 *    POST   /api/mcp/admin/dual-key             — issue dual-key
 *    GET    /api/mcp/admin/calls                — recent call log
 *    GET    /api/mcp/admin/agents/:id/stats     — per-agent stats
 *
 *  The MCP endpoint authenticates with an agent bearer token; the
 *  admin endpoints authenticate with the existing user session. */

import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, currentUser } from "../middleware/auth";
import { getTenantContext } from "../tenancy/context";
import {
  createAgent,
  getAgent,
  issueToken,
  listAgents,
  revokeAgent,
  revokeToken,
  suspendAgent,
  updateAgent,
  verifyAgentToken,
  type Agent,
} from "../lib/mcp/agents";
import {
  ERR_INTERNAL,
  ERR_INVALID_REQUEST,
  ERR_PARSE,
  ERR_UNAUTHORIZED,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "../lib/mcp/protocol";
import { handleRequest, issueDualKey } from "../lib/mcp/server";
import { bootstrapMcpTools } from "../lib/mcp/bootstrap";
import { getAgentStats, listCalls } from "../lib/mcp/audit";
import { hashArgs } from "../lib/mcp/idempotency";
import {
  approvePlan as approvePlanFn,
  cancelPlan as cancelPlanFn,
  getPlan as getPlanFn,
  listPlans as listPlansFn,
  rejectPlan,
} from "../lib/mcp/plans";
import { listUndoableForAgent, undo as undoEntry } from "../lib/mcp/undo";
import { cancel as cancelRequest } from "../lib/mcp/cancellation";
import { registerBuiltInPrompts } from "../lib/mcp/prompts";
import { enqueueExecute } from "../lib/mcp/plan-executor";
import {
  cancelPendingForAgent as cancelPendingSamplingForAgent,
  registerSamplingTransport,
  resolveSamplingResult,
} from "../lib/mcp/sampling";
import { drain } from "../lib/mcp/subscriptions";

// Register the framework's prompt packs at first import.
registerBuiltInPrompts();

export const mcpRoutes = new Hono();

/* -- public discovery + JSON-RPC ---------------------------------- */

/** GET /api/mcp — return discovery metadata. Useful for clients that
 *  bootstrap a connection by HEAD/GETing the URL before opening the
 *  JSON-RPC channel. */
mcpRoutes.get("/", (c) => {
  return c.json({
    name: "gutu-mcp-server",
    version: "1.0.0",
    transport: "streamable-http",
    auth: { kind: "bearer", header: "Authorization", prefix: "Bearer " },
    rpc: {
      url: "/api/mcp",
      method: "POST",
      contentType: "application/json",
      sseUpgrade: { acceptHeader: "text/event-stream" },
    },
    capabilities: {
      sampling: true,
      streaming: true,
      stdio: { bin: "scripts/mcp-stdio.ts", env: "MCP_AGENT_TOKEN" },
    },
  });
});

mcpRoutes.post("/", async (c) => {
  // 1. Auth.
  const auth = c.req.header("authorization") ?? c.req.header("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const authed = verifyAgentToken(token);
  if (!authed) {
    return c.json(
      jsonRpcErr(null, ERR_UNAUTHORIZED, "missing or invalid agent token"),
      401,
    );
  }
  const tenantId = getTenantContext()?.tenantId ?? authed.agent.tenantId;
  // Cross-tenant requests are rejected; tokens are bound to one tenant.
  if (tenantId !== authed.agent.tenantId) {
    return c.json(
      jsonRpcErr(null, ERR_UNAUTHORIZED, "agent is bound to a different tenant"),
      403,
    );
  }

  // 2. Parse JSON-RPC body. Spec allows batch requests (array) — we
  //    handle both shapes uniformly.
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json(jsonRpcErr(null, ERR_PARSE, "invalid JSON"), 400);
  }
  const requests = Array.isArray(raw) ? raw : [raw];
  if (requests.length === 0) {
    return c.json(jsonRpcErr(null, ERR_INVALID_REQUEST, "empty batch"), 400);
  }
  if (requests.length > 100) {
    return c.json(jsonRpcErr(null, ERR_INVALID_REQUEST, "batch too large (max 100)"), 400);
  }

  // Lazy bootstrap — pick up newly-introduced resources without a
  // process restart.
  bootstrapMcpTools();

  // 3. Branch on Accept: text/event-stream. SSE upgrade lets the server
  //    push notifications + sampling requests on the same connection;
  //    plain JSON keeps the legacy round-trip semantics for clients
  //    that don't speak SSE.
  const accept = c.req.header("accept") ?? c.req.header("Accept") ?? "";
  const wantsSse = accept.includes("text/event-stream");

  if (wantsSse) {
    return openSseStream({
      agent: authed.agent,
      tenantId,
      envelopes: requests,
      isBatch: Array.isArray(raw),
      abortSignal: c.req.raw.signal,
    });
  }

  // Plain JSON path.
  const responses = await dispatchEnvelopes(requests, authed.agent.id, async (request) => {
    const resp = await handleRequest(request, { agent: authed.agent, tenantId });
    return resp;
  });

  return c.json(Array.isArray(raw) ? responses : (responses[0] ?? null));
});

/** Process a batch of JSON-RPC envelopes. Each envelope can be:
 *    REQUEST (id + method) — handled, response added to result array
 *    NOTIFICATION (no id) — handled in-band, no response
 *    RESPONSE (id + result|error, no method) — routed to the sampling
 *      pending-promise registry (correlation by id + agentId)
 *
 *  The handler is injected so the SSE path can share the dispatch
 *  logic while keeping its own response-emission strategy. */
async function dispatchEnvelopes(
  envelopes: unknown[],
  agentId: string,
  handle: (req: JsonRpcRequest) => Promise<JsonRpcResponse>,
): Promise<JsonRpcResponse[]> {
  const responses: JsonRpcResponse[] = [];
  for (const r of envelopes) {
    if (!isJsonRpcEnvelope(r)) {
      responses.push(jsonRpcErr(null, ERR_INVALID_REQUEST, "invalid JSON-RPC envelope"));
      continue;
    }
    // Response from the agent (sampling/createMessage reply, future
    // server-initiated requests). Has id + result|error, no method.
    if (typeof (r as { method?: unknown }).method !== "string") {
      const env = r as {
        id: string | number;
        result?: unknown;
        error?: { code: number; message: string };
      };
      // Unmatched responses are silently dropped — late arrivals after
      // a timeout shouldn't 5xx the transport.
      resolveSamplingResult({
        id: String(env.id),
        agentId,
        result: env.result as never,
        error: env.error,
      });
      continue;
    }
    if ((r as { id?: unknown }).id === undefined) {
      // Notification — no response. Handle the ones we care about
      // before dropping the rest.
      const notif = r as JsonRpcNotification;
      if (notif.method === "notifications/cancelled") {
        const params = notif.params as { requestId?: string | number; reason?: string } | undefined;
        if (params?.requestId !== undefined) {
          cancelRequest(params.requestId, params.reason ?? "cancelled by client");
        }
      }
      continue;
    }
    try {
      const resp = await handle(r as JsonRpcRequest);
      responses.push(resp);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      responses.push(jsonRpcErr((r as JsonRpcRequest).id ?? null, ERR_INTERNAL, msg));
    }
  }
  return responses;
}

/** Open a Server-Sent Events stream for one POST. The stream:
 *    1. Emits one `message` SSE event per JSON-RPC response from the
 *       initial batch.
 *    2. Stays open and emits server→agent messages — sampling requests
 *       (via the sampling transport hook) and queued notifications
 *       (drained from the per-agent subscription queue).
 *    3. Sends keepalive comments every 15s so reverse proxies don't
 *       idle-close the connection.
 *    4. On client disconnect (request signal aborts), unregisters the
 *       sampling transport, cancels any in-flight sampling requests
 *       for this agent that were routed through this stream, and
 *       closes the controller.
 *
 *  Multiple SSE streams per agent ARE allowed (e.g., for redundancy
 *  during reconnect). The sampling transport registry broadcasts each
 *  outgoing request to every active hook, so any open stream will
 *  carry it. The first hook that successfully writes wins; the others
 *  no-op the buffered payload. Notification draining is shared, so if
 *  two streams are open simultaneously, only one gets a given
 *  notification — clients should not run two streams. */
function openSseStream(args: {
  agent: Agent;
  tenantId: string;
  envelopes: unknown[];
  isBatch: boolean;
  abortSignal: AbortSignal;
}): Response {
  const { agent, tenantId, envelopes, abortSignal } = args;
  const enc = new TextEncoder();
  let closed = false;
  let unregisterTransport: (() => void) | null = null;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let abortHandler: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const writeMessage = (payload: unknown): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(
            enc.encode(`event: message\ndata: ${JSON.stringify(payload)}\n\n`),
          );
          return true;
        } catch {
          // Controller already closed — happens on race with abort.
          closed = true;
          return false;
        }
      };
      const writeComment = (text: string): void => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`: ${text}\n\n`));
        } catch {
          closed = true;
        }
      };

      const cleanup = (): void => {
        if (closed) return;
        closed = true;
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        if (pollTimer) clearInterval(pollTimer);
        if (unregisterTransport) {
          try { unregisterTransport(); } catch { /* ignore */ }
          unregisterTransport = null;
        }
        if (abortHandler) {
          try { abortSignal.removeEventListener("abort", abortHandler); } catch { /* ignore */ }
          abortHandler = null;
        }
        cancelPendingSamplingForAgent(agent.id, "SSE stream closed");
        try { controller.close(); } catch { /* already closed */ }
      };

      // Wire the abort signal first so any sync error during dispatch
      // still lets the cleanup fire.
      abortHandler = (): void => cleanup();
      try {
        abortSignal.addEventListener("abort", abortHandler);
      } catch {
        /* signals from non-standard request impls — best effort */
      }
      if (abortSignal.aborted) {
        cleanup();
        return;
      }

      // Register the sampling transport hook BEFORE dispatching the
      // batch. If `initialize` triggers a server-initiated sampling
      // request synchronously, the hook must already be live to carry
      // it (otherwise requestSampling fails-fast with no transport).
      unregisterTransport = registerSamplingTransport((targetAgentId, request) => {
        if (targetAgentId !== agent.id) return false;
        return writeMessage(request);
      });

      // Hint a non-empty initial event so proxies that buffer until
      // the first byte don't sit on the response.
      writeComment("ok");

      // Dispatch the batch.
      try {
        const responses = await dispatchEnvelopes(envelopes, agent.id, async (request) => {
          return handleRequest(request, { agent, tenantId });
        });
        for (const resp of responses) {
          if (closed) break;
          writeMessage(resp);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        writeMessage(jsonRpcErr(null, ERR_INTERNAL, msg));
      }

      // Drain any notifications that were already queued (e.g.,
      // resource changes between the agent's last poll and this
      // stream open). After this we rely on the polling interval.
      const initial = drain(agent.id);
      for (const n of initial) {
        if (closed) break;
        writeMessage(n);
      }

      if (closed) return;

      // Keepalive comment every 15s — comments are ignored by the
      // EventSource client but force the TCP/TLS layer to flush, which
      // keeps reverse proxies (nginx, Cloudflare) from idle-closing.
      keepaliveTimer = setInterval(() => {
        if (closed) return;
        writeComment(`keepalive ${Date.now()}`);
      }, 15_000);

      // Poll the per-agent notification queue every second. Push
      // semantics could be wired through subscriptions.ts later — this
      // keeps the integration small and bounds the worst-case latency
      // at ~1s, which is fine for human-perceptible UI updates.
      pollTimer = setInterval(() => {
        if (closed) return;
        const pending = drain(agent.id);
        for (const n of pending) {
          if (closed) break;
          writeMessage(n);
        }
      }, 1_000);
    },
    cancel(): void {
      // Reader (client) closed the stream — fall through to the abort
      // handler we wired up in start(). The state is already shared
      // via the closure-scoped flags, so this just signals the timers.
      closed = true;
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (unregisterTransport) {
        try { unregisterTransport(); } catch { /* ignore */ }
        unregisterTransport = null;
      }
      cancelPendingSamplingForAgent(agent.id, "SSE stream cancelled by client");
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

/** Validates the shape of any JSON-RPC envelope: request, notification,
 *  or response. Doesn't narrow to a specific subtype — call sites do
 *  that by checking for `method` (request/notification) vs no method
 *  (response). */
function isJsonRpcEnvelope(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.jsonrpc !== "2.0") return false;
  // Request or notification: has a method.
  if (typeof o.method === "string") return true;
  // Response: has an id (string|number|null) and either result or error.
  const idType = typeof o.id;
  const hasId = idType === "string" || idType === "number" || o.id === null;
  return hasId && ("result" in o || "error" in o);
}

function jsonRpcErr(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/* -- admin endpoints (human-authenticated) ------------------------ */

const adminRoutes = new Hono();
adminRoutes.use("*", requireAuth);

const ScopesSchema = z.record(z.array(z.enum(["read", "write", "delete"])));
const RateLimitsSchema = z.object({
  "safe-read": z.number().int().min(0).optional(),
  "low-mutation": z.number().int().min(0).optional(),
  "high-mutation": z.number().int().min(0).optional(),
}).partial();
const BudgetSchema = z.object({
  dailyWriteCap: z.number().int().min(0).optional(),
  dailyCostCap: z.number().min(0).optional(),
}).partial();

const CreateAgentBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  mirrorUserId: z.string().min(1).optional(),
  scopes: ScopesSchema.optional(),
  riskCeiling: z.enum(["safe-read", "low-mutation", "high-mutation"]).optional(),
  rateLimits: RateLimitsSchema.optional(),
  budget: BudgetSchema.optional(),
  instructions: z.string().max(8000).optional(),
});

adminRoutes.get("/agents", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  return c.json({ agents: listAgents(tenantId) });
});

adminRoutes.post("/agents", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateAgentBody.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid body", issues: parsed.error.issues }, 400);
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const user = currentUser(c);
  const agent = createAgent({
    name: parsed.data.name,
    description: parsed.data.description,
    tenantId,
    issuerUserId: user.id,
    mirrorUserId: parsed.data.mirrorUserId,
    scopes: parsed.data.scopes,
    riskCeiling: parsed.data.riskCeiling,
    rateLimits: parsed.data.rateLimits,
    budget: parsed.data.budget,
    instructions: parsed.data.instructions,
  });
  return c.json({ agent }, 201);
});

adminRoutes.get("/agents/:id", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const a = getAgent(c.req.param("id"));
  if (!a) return c.json({ error: "not found" }, 404);
  if (a.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  return c.json({ agent: a });
});

adminRoutes.patch("/agents/:id", async (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const a = getAgent(c.req.param("id"));
  if (!a || a.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  const body = await c.req.json().catch(() => null);
  const parsed = CreateAgentBody.partial()
    .extend({ status: z.enum(["active", "suspended", "revoked"]).optional() })
    .safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid body", issues: parsed.error.issues }, 400);
  const updated = updateAgent(a.id, parsed.data);
  return c.json({ agent: updated });
});

adminRoutes.post("/agents/:id/suspend", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const a = getAgent(c.req.param("id"));
  if (!a || a.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  suspendAgent(a.id);
  return c.json({ ok: true });
});

adminRoutes.delete("/agents/:id", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const a = getAgent(c.req.param("id"));
  if (!a || a.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  revokeAgent(a.id);
  return c.json({ ok: true });
});

const TokenIssueBody = z.object({
  expiresAt: z.string().datetime().optional(),
});

adminRoutes.post("/agents/:id/tokens", async (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const a = getAgent(c.req.param("id"));
  if (!a || a.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  if (a.status !== "active") return c.json({ error: "agent not active" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const parsed = TokenIssueBody.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid body", issues: parsed.error.issues }, 400);
  const out = issueToken({ agentId: a.id, expiresAt: parsed.data.expiresAt });
  // The plaintext is shown ONCE — the client must store it themselves.
  return c.json({ token: out.plaintext, tokenId: out.tokenId, expiresAt: out.expiresAt }, 201);
});

adminRoutes.delete("/tokens/:tokenId", (c) => {
  revokeToken(c.req.param("tokenId"));
  return c.json({ ok: true });
});

const DualKeyBody = z.object({
  agentId: z.string().min(1),
  toolName: z.string().min(1),
  arguments: z.record(z.unknown()),
  ttlMinutes: z.number().int().min(1).max(1440).optional(),
});

adminRoutes.post("/dual-key", async (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const user = currentUser(c);
  const body = await c.req.json().catch(() => null);
  const parsed = DualKeyBody.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid body", issues: parsed.error.issues }, 400);
  const agent = getAgent(parsed.data.agentId);
  if (!agent || agent.tenantId !== tenantId) return c.json({ error: "agent not found" }, 404);
  const out = issueDualKey({
    agentId: agent.id,
    toolName: parsed.data.toolName,
    argumentsHash: hashArgs(parsed.data.arguments),
    issuedByUserId: user.id,
    ttlMinutes: parsed.data.ttlMinutes,
  });
  return c.json({ dualKeyToken: out.plaintext }, 201);
});

adminRoutes.get("/calls", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const url = new URL(c.req.url);
  const agentId = url.searchParams.get("agentId") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "100") || 100;
  return c.json({ calls: listCalls({ tenantId, agentId, limit }) });
});

adminRoutes.get("/agents/:id/stats", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const a = getAgent(c.req.param("id"));
  if (!a || a.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  return c.json({ stats: getAgentStats(a.id) });
});

/* -- plans (proposed by agents, approved + executed by humans) ---- */

adminRoutes.get("/plans", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const url = new URL(c.req.url);
  const agentId = url.searchParams.get("agentId") ?? undefined;
  return c.json({ plans: listPlansFn(tenantId, agentId) });
});

adminRoutes.get("/plans/:id", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const p = getPlanFn(c.req.param("id"));
  if (!p || p.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  return c.json({ plan: p });
});

adminRoutes.post("/plans/:id/approve", async (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const user = currentUser(c);
  const p = getPlanFn(c.req.param("id"));
  if (!p || p.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  try {
    const updated = approvePlanFn({ id: p.id, approvedByUser: user.id });
    return c.json({ plan: updated });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

adminRoutes.post("/plans/:id/reject", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const p = getPlanFn(c.req.param("id"));
  if (!p || p.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  try {
    return c.json({ plan: rejectPlan(p.id) });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

adminRoutes.post("/plans/:id/cancel", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const p = getPlanFn(c.req.param("id"));
  if (!p || p.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  try {
    return c.json({ plan: cancelPlanFn(p.id) });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

/** Execute an approved plan. Steps run sequentially; first failure
 *  marks the plan failed and skips the rest. The agent's normal
 *  scope/risk gates apply per step — operator approval doesn't
 *  bypass them, it just batches consent.
 *
 *  This is the most safety-critical endpoint in the host. Notes:
 *    - the executor uses the AGENT'S identity for each step (writes
 *      attribute to `agent:<id>` not the operator)
 *    - dual-key tokens: any irreversible step in the plan still
 *      needs its own dual-key token in the step.arguments._meta —
 *      operator approval of the PLAN does NOT auto-grant dual-keys */
adminRoutes.post("/plans/:id/execute", async (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const user = currentUser(c);
  const plan = getPlanFn(c.req.param("id"));
  if (!plan || plan.tenantId !== tenantId) return c.json({ error: "not found" }, 404);
  const body = (await c.req.json().catch(() => ({}))) as { autoRollback?: boolean };
  // Async path: kick the executor onto setImmediate, return 202 +
  // current plan snapshot. The operator polls GET /admin/plans/:id
  // for status. This way a 50-step plan with slow tools doesn't
  // wedge a single HTTP request for minutes.
  const queued = enqueueExecute({
    planId: plan.id,
    byUserId: user.id,
    options: { autoRollback: !!body.autoRollback },
  });
  if (!queued.ok) return c.json({ error: queued.error }, 400);
  return c.json({ plan: getPlanFn(plan.id), queued: true }, 202);
});

/* -- undo log ----------------------------------------------------- */

adminRoutes.get("/undo", (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const url = new URL(c.req.url);
  const agentId = url.searchParams.get("agentId") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50") || 50;
  return c.json({ entries: listUndoableForAgent({ tenantId, agentId, limit }) });
});

adminRoutes.post("/undo/:id", async (c) => {
  const tenantId = getTenantContext()?.tenantId ?? "default";
  const user = currentUser(c);
  const body = await c.req.json().catch(() => ({}));
  const force = !!(body as { force?: boolean }).force;
  const out = undoEntry({
    entryId: c.req.param("id"),
    byUserId: user.id,
    force,
  });
  // Double-check tenant ownership AFTER `undo()` runs is fine because
  // undo doesn't mutate cross-tenant; the lookup just hides the entry
  // from a wrong tenant. Operator guardrail.
  return c.json({ ok: out.ok, message: out.message }, out.ok ? 200 : 400);
});

mcpRoutes.route("/admin", adminRoutes);

export type { Agent };
