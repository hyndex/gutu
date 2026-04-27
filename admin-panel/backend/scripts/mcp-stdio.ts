#!/usr/bin/env bun
/** MCP stdio transport — serves a single agent over stdin/stdout.
 *
 *  Usage (local CLI / Claude Desktop):
 *    MCP_AGENT_TOKEN=<token> bun scripts/mcp-stdio.ts
 *
 *  Wire format: newline-delimited JSON (NDJSON). Each non-empty line on
 *  stdin is a single JSON-RPC envelope (request, notification, or
 *  response). Each outgoing envelope (response, server-initiated
 *  request, notification) is written to stdout terminated with `\n`.
 *  All diagnostic logs go to stderr — stdout MUST stay parseable.
 *
 *  The bin loads the same plugin contract the HTTP host uses so the
 *  tool registry, resource discovery, prompts, and migrations are
 *  identical. We only skip the HTTP listener.
 *
 *  Lifecycle:
 *    - boot:        env auth, db migrate, plugin migrations, plugin
 *                   start hooks, prompt + bootstrap registration
 *    - run:         readline loop on stdin, async dispatch per line,
 *                   sampling transport hook writing to stdout
 *    - shutdown:    SIGINT / SIGTERM / stdin EOF → cancel pending
 *                   sampling, flush, exit(0); errors during boot
 *                   exit(1) with the reason on stderr.
 *
 *  Per the MCP spec, the agent (parent process — Claude Desktop, Cursor,
 *  etc.) launches THIS script as a subprocess and writes JSON-RPC to its
 *  stdin. We are the server; the parent is the client. */

import { createInterface } from "node:readline";
import { migrate } from "../src/migrations";
import { migrateGlobal, migrateTenantSchema } from "../src/tenancy/migrations";
import { ensureDefaultTenant } from "../src/tenancy/provisioner";
import { loadConfig } from "../src/config";
import { loadDiscoveredPlugins } from "../src/host/discover";
import {
  loadPlugins,
  runPluginMigrations,
  installPluginsIfNeeded,
  startPlugins,
  stopPlugins,
} from "../src/host/plugin-contract";
import { ensureTenantEnablementSchema } from "../src/host/tenant-enablement";
import { verifyAgentToken } from "../src/lib/mcp/agents";
import { handleRequest } from "../src/lib/mcp/server";
import { bootstrapMcpTools } from "../src/lib/mcp/bootstrap";
import { registerBuiltInPrompts } from "../src/lib/mcp/prompts";
import { cancel as cancelRequest } from "../src/lib/mcp/cancellation";
import {
  cancelPendingForAgent as cancelPendingSamplingForAgent,
  registerSamplingTransport,
  resolveSamplingResult,
} from "../src/lib/mcp/sampling";
import { drain } from "../src/lib/mcp/subscriptions";
import {
  ERR_INTERNAL,
  ERR_INVALID_REQUEST,
  ERR_PARSE,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "../src/lib/mcp/protocol";

function logErr(...parts: unknown[]): void {
  // stderr only — stdout is the wire.
  const msg = parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
    .join(" ");
  process.stderr.write(`[mcp-stdio] ${msg}\n`);
}

function jsonRpcErr(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function isJsonRpcEnvelope(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.jsonrpc !== "2.0") return false;
  if (typeof o.method === "string") return true;
  const idType = typeof o.id;
  const hasId = idType === "string" || idType === "number" || o.id === null;
  return hasId && ("result" in o || "error" in o);
}

async function main(): Promise<void> {
  const token = process.env.MCP_AGENT_TOKEN ?? "";
  if (!token) {
    logErr("missing MCP_AGENT_TOKEN env var — set it to a valid agent bearer token");
    process.exit(1);
  }

  // Boot the host machinery — same contract the HTTP host uses, minus
  // the listener. Tool / prompt registration happens as a side effect.
  const cfg = loadConfig();
  if (cfg.dbKind === "sqlite" && !cfg.multisite) {
    migrate();
    await migrateGlobal();
  } else {
    await migrateGlobal();
  }
  const HOST_PLUGINS = await loadDiscoveredPlugins();
  const orderedPlugins = loadPlugins(HOST_PLUGINS);
  ensureTenantEnablementSchema();
  await runPluginMigrations(orderedPlugins);
  await installPluginsIfNeeded(orderedPlugins);
  const defaultTenant = await ensureDefaultTenant();
  await migrateTenantSchema(defaultTenant.schemaName);
  await startPlugins(orderedPlugins);
  registerBuiltInPrompts();
  bootstrapMcpTools(true);

  // Verify token AFTER migrations so the agents table exists.
  const authed = verifyAgentToken(token);
  if (!authed) {
    logErr("token rejected — invalid, revoked, or expired");
    process.exit(1);
  }
  const agent = authed.agent;
  const tenantId = agent.tenantId;
  logErr(`authenticated as agent ${agent.id} (${agent.name}) on tenant ${tenantId}`);

  // Stdout writer — guarded so a closed pipe doesn't crash the process.
  let stdoutClosed = false;
  process.stdout.on("error", (e: NodeJS.ErrnoException) => {
    // Parent went away — EPIPE is expected on agent disconnect.
    if (e.code === "EPIPE") {
      stdoutClosed = true;
      return;
    }
    logErr("stdout error", e.message);
  });
  const writeLine = (payload: unknown): boolean => {
    if (stdoutClosed) return false;
    try {
      process.stdout.write(JSON.stringify(payload) + "\n");
      return true;
    } catch (e) {
      logErr("write failed", e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  // Sampling transport — server-initiated requests get pushed to
  // stdout. The parent agent reads them, handles the LLM completion,
  // and writes the response envelope back on stdin. The dispatch
  // routine routes those responses via resolveSamplingResult.
  const unregisterTransport = registerSamplingTransport((targetAgentId, request) => {
    if (targetAgentId !== agent.id) return false;
    return writeLine(request);
  });

  // Drain any subscription notifications periodically. Same poll
  // cadence as the SSE upgrade so behavior is consistent across
  // transports.
  const drainTimer = setInterval(() => {
    if (stdoutClosed) return;
    const pending = drain(agent.id);
    for (const n of pending) writeLine(n);
  }, 1_000);

  // Process one envelope. Errors are swallowed and emitted as
  // JSON-RPC error responses where applicable (request-shaped
  // envelopes); responses + notifications never produce a reply.
  const dispatch = async (envelope: unknown): Promise<void> => {
    if (!isJsonRpcEnvelope(envelope)) {
      writeLine(jsonRpcErr(null, ERR_INVALID_REQUEST, "invalid JSON-RPC envelope"));
      return;
    }
    if (typeof (envelope as { method?: unknown }).method !== "string") {
      const env = envelope as {
        id: string | number;
        result?: unknown;
        error?: { code: number; message: string };
      };
      resolveSamplingResult({
        id: String(env.id),
        agentId: agent.id,
        result: env.result as never,
        error: env.error,
      });
      return;
    }
    if ((envelope as { id?: unknown }).id === undefined) {
      const notif = envelope as JsonRpcNotification;
      if (notif.method === "notifications/cancelled") {
        const params = notif.params as { requestId?: string | number; reason?: string } | undefined;
        if (params?.requestId !== undefined) {
          cancelRequest(params.requestId, params.reason ?? "cancelled by client");
        }
      }
      return;
    }
    try {
      // Tenant context is intentionally NOT wrapped here — agent.tenantId
      // is the canonical scope for handleRequest and the MCP code path
      // doesn't read tenancy/context AsyncLocalStorage. Routes that do
      // (HTTP-only) are unaffected.
      const resp = await handleRequest(envelope as JsonRpcRequest, { agent, tenantId });
      writeLine(resp);
    } catch (e) {
      const id = (envelope as JsonRpcRequest).id;
      const msg = e instanceof Error ? e.message : String(e);
      writeLine(jsonRpcErr(id ?? null, ERR_INTERNAL, msg));
    }
  };

  // Concurrency: dispatch every line. Per JSON-RPC 2.0, ordering is
  // not guaranteed — the agent correlates by id. Running concurrently
  // means a slow `tools/call` doesn't block a fast `ping`.
  const inflight = new Set<Promise<void>>();
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      writeLine(jsonRpcErr(null, ERR_PARSE, "invalid JSON"));
      return;
    }
    // Spec allows batches; expand them.
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      const p = dispatch(item).finally(() => inflight.delete(p));
      inflight.add(p);
    }
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logErr(`shutting down (${signal})`);
    clearInterval(drainTimer);
    try { unregisterTransport(); } catch { /* ignore */ }
    cancelPendingSamplingForAgent(agent.id, `transport closed: ${signal}`);
    rl.close();
    // Wait for in-flight dispatches with a small ceiling so we don't
    // hang forever on a misbehaving handler.
    const wait = Promise.allSettled(Array.from(inflight));
    const timeout = new Promise<void>((res) => setTimeout(res, 5_000));
    await Promise.race([wait, timeout]);
    try { await stopPlugins(orderedPlugins); } catch { /* best effort */ }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  rl.on("close", () => void shutdown("stdin EOF"));
  process.stdin.on("end", () => void shutdown("stdin end"));
}

main().catch((e) => {
  logErr("fatal", e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
