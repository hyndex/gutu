/** SSE upgrade integration tests for POST /api/mcp.
 *
 *  We mount the real mcpRoutes onto a fresh Hono app, hit it with a
 *  fetch() call carrying `Accept: text/event-stream`, then read the
 *  SSE body chunk-by-chunk. The response stream stays open after the
 *  initial batch is delivered, so every test aborts the request once
 *  it has the events it needs — that abort triggers the route's
 *  cleanup path (cancel pending sampling, unregister transport, close
 *  controller). */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let app: Hono;
let agentToken = "";
let agentId = "";

async function readSseEvents(
  body: ReadableStream<Uint8Array>,
  expected: number,
  timeoutMs = 3_000,
): Promise<{ event: string; data: string }[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const events: { event: string; data: string }[] = [];
  let buffer = "";
  const deadline = Date.now() + timeoutMs;
  while (events.length < expected && Date.now() < deadline) {
    const remain = deadline - Date.now();
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<{ value: Uint8Array; done: boolean }>((res) =>
        setTimeout(() => res({ value: new Uint8Array(), done: true }), Math.max(remain, 0)),
      ),
    ]);
    if (done) break;
    if (value.length === 0) continue;
    buffer += decoder.decode(value, { stream: true });
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      // Skip pure-comment frames (keepalive ": ok\n").
      const lines = block.split("\n").filter((l) => !l.startsWith(":"));
      let eventName = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) events.push({ event: eventName, data });
      sep = buffer.indexOf("\n\n");
    }
  }
  try { reader.releaseLock(); } catch { /* ignore */ }
  return events;
}

beforeAll(async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "gutu-mcp-sse-test-"));
  process.env.DB_PATH = path.join(dataDir, "test.db");
  process.env.NODE_ENV = "test";

  await import("../../db");
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

  const { createAgent, issueToken } = await import("./agents");
  const { mcpRoutes } = await import("../../routes/mcp");
  const agent = createAgent({
    name: "sse-test-agent",
    description: "sse upgrade test",
    tenantId: "default",
    issuerUserId: "u-test",
    scopes: { "test.thing": ["read", "write"] },
    riskCeiling: "low-mutation",
  });
  agentId = agent.id;
  const issued = issueToken({ agentId: agent.id });
  agentToken = issued.plaintext;

  app = new Hono();
  app.route("/api/mcp", mcpRoutes);
});

afterAll(async () => {
  // Reset sampling state so other test files don't see leaked transports.
  const { _resetSampling_forTest } = await import("./sampling");
  _resetSampling_forTest();
});

describe("POST /api/mcp with Accept: text/event-stream", () => {
  test("responds with text/event-stream and emits the JSON-RPC response as a `message` event", async () => {
    const ctrl = new AbortController();
    const res = await app.fetch(new Request("http://test/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "sse-test", version: "0.0.0" },
        },
      }),
      signal: ctrl.signal,
    }));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-cache");

    const events = await readSseEvents(res.body!, 1, 2_000);
    ctrl.abort();
    expect(events.length).toBeGreaterThanOrEqual(1);
    const initResp = JSON.parse(events[0]!.data) as { id: number; result: { protocolVersion: string } };
    expect(initResp.id).toBe(1);
    expect(initResp.result.protocolVersion).toBe("2024-11-05");
  });

  test("rejects unauthenticated SSE upgrade", async () => {
    const res = await app.fetch(new Request("http://test/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    }));
    expect(res.status).toBe(401);
  });

  test("server-initiated sampling request is pushed via the SSE stream", async () => {
    const { requestSampling } = await import("./sampling");

    const ctrl = new AbortController();
    const res = await app.fetch(new Request("http://test/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "ping" }),
      signal: ctrl.signal,
    }));

    // Read the ping response first (proves the stream is live + the
    // route registered the sampling transport).
    const initial = await readSseEvents(res.body!, 1, 2_000);
    expect(initial.length).toBe(1);

    // Now fire a sampling request server-side. It MUST get pushed to
    // the open SSE stream.
    const samplingPromise = requestSampling({
      agentId,
      params: {
        messages: [{ role: "user", content: { type: "text", text: "hello" } }],
      },
      timeoutMs: 1_000,
    });

    // The reader is still attached to res.body. Drain one more event.
    const more = await readSseEvents(res.body!, 1, 2_000);
    ctrl.abort();
    expect(more.length).toBeGreaterThanOrEqual(1);
    const pushed = JSON.parse(more[0]!.data) as { method: string; params: unknown; id: string };
    expect(pushed.method).toBe("sampling/createMessage");
    expect(typeof pushed.id).toBe("string");

    // The abort triggers cancel-pending — the sampling promise rejects
    // with the cancel reason instead of timing out.
    await expect(samplingPromise).rejects.toThrow();
  });

  test("queued notifications are drained over the SSE stream", async () => {
    const { subscribe, broadcastResourceChanged } = await import("./subscriptions");
    subscribe(agentId, "test://thing/1");

    const ctrl = new AbortController();
    const res = await app.fetch(new Request("http://test/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 8, method: "ping" }),
      signal: ctrl.signal,
    }));

    // Drain the response.
    await readSseEvents(res.body!, 1, 2_000);

    // Broadcast a change — the SSE poll loop (1s) should pick it up.
    broadcastResourceChanged("test://thing/1");

    const events = await readSseEvents(res.body!, 1, 3_000);
    ctrl.abort();
    expect(events.length).toBeGreaterThanOrEqual(1);
    const notif = JSON.parse(events[0]!.data) as { method: string; params: { uri: string } };
    expect(notif.method).toBe("notifications/resources/updated");
    expect(notif.params.uri).toBe("test://thing/1");
  });

  test("plain JSON path still works alongside SSE upgrade", async () => {
    const res = await app.fetch(new Request("http://test/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "ping" }),
    }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json() as { id: number; result: unknown };
    expect(body.id).toBe(99);
  });

  test("sampling response posted on the JSON path resolves a pending requestSampling", async () => {
    const { requestSampling, registerSamplingTransport } = await import("./sampling");

    // Register a stub transport so requestSampling has something to
    // call. We capture the id off it and then post a response back.
    let capturedId = "";
    const unregister = registerSamplingTransport((targetAgentId, request) => {
      if (targetAgentId !== agentId) return false;
      capturedId = request.id;
      return true;
    });

    const promise = requestSampling({
      agentId,
      params: { messages: [{ role: "user", content: { type: "text", text: "x" } }] },
      timeoutMs: 3_000,
    });

    // Wait for the transport to capture the id.
    await new Promise((r) => setTimeout(r, 10));
    expect(capturedId).not.toBe("");

    // Post a response envelope as the agent would.
    const res = await app.fetch(new Request("http://test/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: capturedId,
        result: {
          role: "assistant",
          content: { type: "text", text: "hello back" },
          model: "claude-test",
        },
      }),
    }));
    expect(res.status).toBe(200);
    // Body is null/empty for a response envelope (no responses array entry).
    const result = await promise;
    expect(result.content).toEqual({ type: "text", text: "hello back" });
    unregister();
  });
});
