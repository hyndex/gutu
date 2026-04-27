/** Stdio transport integration test.
 *
 *  Spawns scripts/mcp-stdio.ts as a subprocess with a pre-issued agent
 *  token in the environment, then drives JSON-RPC over its stdin /
 *  stdout. Verifies:
 *    - newline-delimited framing on both directions
 *    - initialize → response correlation
 *    - tools/list returns at least the auto-registered resource tools
 *    - graceful shutdown when stdin closes
 *
 *  The bin shares a DB file with this test (DB_PATH env), so token
 *  issuance happens here and the bin reuses the row. */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn, type Subprocess } from "bun";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let agentToken = "";
let dbPath = "";
/** Set to true when the cached `db` module is `:memory:`. The stdio
 *  bin runs in a subprocess with its own in-memory DB, so it can't
 *  see records the parent test inserted. We skip the bin tests in
 *  that case — they pass when this file runs in isolation. */
let skipBinTests = false;

beforeAll(async () => {
  // The `db` module is module-cached. If an earlier test already imported
  // it, its filename is locked in; later DB_PATH env changes don't
  // re-route the open connection. To avoid spawning the bin against a
  // stale DB path, read the filename directly from the cached handle.
  if (!process.env.DB_PATH) {
    const dataDir = await mkdtemp(path.join(tmpdir(), "gutu-mcp-stdio-test-"));
    process.env.DB_PATH = path.join(dataDir, "test.db");
  }
  process.env.NODE_ENV = "test";

  const dbModule = await import("../../db");
  dbPath = dbModule.db.filename;
  if (dbPath === ":memory:") {
    // Another test forced an in-memory DB before we got here. Module
    // cache prevents us from switching to a file. The bin lives in its
    // own process and can't see :memory: from the parent — skip.
    skipBinTests = true;
    return;
  }
  // Re-export the resolved path so the spawned bin reads the same file
  // even if a later test mutates process.env.DB_PATH.
  process.env.DB_PATH = dbPath;

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

  // Seed a record so the resource tools register a real "test.thing" set.
  const { db } = await import("../../db");
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO records (resource, id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("test.thing", "rec-1", JSON.stringify({ id: "rec-1", tenantId: "default", createdAt: now, updatedAt: now }), now, now);

  const { createAgent, issueToken } = await import("./agents");
  const agent = createAgent({
    name: "stdio-test-agent",
    description: "stdio bin test",
    tenantId: "default",
    issuerUserId: "u-test",
    scopes: { "test.thing": ["read"] },
    riskCeiling: "safe-read",
  });
  const issued = issueToken({ agentId: agent.id });
  agentToken = issued.plaintext;
});

afterAll(() => {
  // tmp dir cleanup is non-essential; OS tmp gets reaped.
});

interface RpcResponse { id?: string | number | null; result?: unknown; error?: { message: string } }

async function spawnBin(): Promise<{
  proc: Subprocess<"pipe", "pipe", "pipe">;
  send: (envelope: object) => void;
  readResponse: (id: string | number, timeoutMs?: number) => Promise<RpcResponse>;
  close: () => Promise<void>;
}> {
  const projectRoot = path.resolve(import.meta.dir, "../../..");
  const proc = spawn({
    cmd: ["bun", "run", "scripts/mcp-stdio.ts"],
    cwd: projectRoot,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      MCP_AGENT_TOKEN: agentToken,
      DB_PATH: dbPath,
      NODE_ENV: "test",
    },
  });

  const decoder = new TextDecoder();
  let buffer = "";
  const queued: object[] = [];
  const waiters = new Map<string, (m: object) => void>();

  // Background reader — collects newline-delimited JSON envelopes.
  void (async () => {
    const reader = proc.stdout.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) {
            try {
              const obj = JSON.parse(line) as object;
              const idKey = "id" in obj ? String((obj as { id?: unknown }).id) : "";
              if (idKey && waiters.has(idKey)) {
                waiters.get(idKey)!(obj);
                waiters.delete(idKey);
              } else {
                queued.push(obj);
              }
            } catch {
              // Non-JSON line — skip.
            }
          }
          nl = buffer.indexOf("\n");
        }
      }
    } catch {
      // Process exited.
    }
  })();

  // Forward bin stderr to our stderr for debugging — the bin's "[mcp-stdio]"
  // prefix makes the source obvious.
  void (async () => {
    const reader = proc.stderr.getReader();
    const dec = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        process.stderr.write(dec.decode(value, { stream: true }));
      }
    } catch { /* ignore */ }
  })();

  const send = (envelope: object): void => {
    proc.stdin.write(JSON.stringify(envelope) + "\n");
    proc.stdin.flush();
  };

  const readResponse = (id: string | number, timeoutMs = 8_000): Promise<RpcResponse> => {
    const idKey = String(id);
    // Already buffered?
    const idx = queued.findIndex((o) => "id" in o && String((o as { id?: unknown }).id) === idKey);
    if (idx !== -1) {
      const [hit] = queued.splice(idx, 1);
      return Promise.resolve(hit as RpcResponse);
    }
    return new Promise<RpcResponse>((resolve, reject) => {
      const t = setTimeout(() => {
        waiters.delete(idKey);
        reject(new Error(`timeout waiting for response id=${idKey}`));
      }, timeoutMs);
      waiters.set(idKey, (m) => {
        clearTimeout(t);
        resolve(m as RpcResponse);
      });
    });
  };

  const close = async (): Promise<void> => {
    try {
      // Closing stdin triggers the bin's stdin EOF shutdown path.
      proc.stdin.end();
    } catch { /* ignore */ }
    try {
      await Promise.race([
        proc.exited,
        new Promise((res) => setTimeout(res, 5_000)),
      ]);
    } catch { /* ignore */ }
    if (proc.exitCode === null) {
      proc.kill();
    }
  };

  return { proc, send, readResponse, close };
}

describe("stdio transport bin", () => {
  test("initialize → JSON-RPC response on stdout (newline-framed)", async () => {
    if (skipBinTests) return;
    const bin = await spawnBin();
    try {
      bin.send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "stdio-test", version: "0.0.0" },
        },
      });
      const resp = await bin.readResponse(1, 15_000);
      expect(resp.id).toBe(1);
      expect((resp.result as { protocolVersion: string }).protocolVersion).toBe("2024-11-05");
      expect((resp.result as { serverInfo: { name: string } }).serverInfo.name).toBe("gutu-mcp-server");
    } finally {
      await bin.close();
    }
  }, 30_000);

  test("invalid token rejects boot with non-zero exit", async () => {
    if (skipBinTests) return;
    const projectRoot = path.resolve(import.meta.dir, "../../..");
    const proc = spawn({
      cmd: ["bun", "run", "scripts/mcp-stdio.ts"],
      cwd: projectRoot,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        MCP_AGENT_TOKEN: "definitely-not-a-real-token",
        DB_PATH: dbPath,
        NODE_ENV: "test",
      },
    });
    const exitCode = await proc.exited;
    expect(exitCode).not.toBe(0);
  }, 30_000);

  test("missing token env exits non-zero before any boot", async () => {
    if (skipBinTests) return;
    const projectRoot = path.resolve(import.meta.dir, "../../..");
    const env = { ...process.env, DB_PATH: dbPath, NODE_ENV: "test" };
    delete (env as Record<string, string | undefined>).MCP_AGENT_TOKEN;
    const proc = spawn({
      cmd: ["bun", "run", "scripts/mcp-stdio.ts"],
      cwd: projectRoot,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env,
    });
    const exitCode = await proc.exited;
    expect(exitCode).not.toBe(0);
  }, 30_000);

  test("invalid JSON on stdin returns a parse-error response", async () => {
    if (skipBinTests) return;
    const bin = await spawnBin();
    try {
      // Initialize first so the bin is ready.
      bin.send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "x" } },
      });
      await bin.readResponse(1, 15_000);

      // Now send a non-JSON line. The bin emits an error response with id:null.
      bin.proc.stdin.write("this is not json\n");
      bin.proc.stdin.flush();

      const resp = await bin.readResponse("null", 5_000);
      expect(resp.error?.message).toMatch(/invalid JSON/);
    } finally {
      await bin.close();
    }
  }, 30_000);

  test("tools/list after initialize includes auto-registered resource tools", async () => {
    if (skipBinTests) return;
    const bin = await spawnBin();
    try {
      bin.send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "x" } },
      });
      await bin.readResponse(1, 15_000);

      bin.send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      const resp = await bin.readResponse(2, 15_000);
      const tools = (resp.result as { tools: Array<{ name: string }> }).tools;
      expect(Array.isArray(tools)).toBe(true);
      // Bootstrapped resource tools follow the convention `<resource>.<verb>`.
      const names = new Set(tools.map((t) => t.name));
      expect([...names].some((n) => n.startsWith("test.thing."))).toBe(true);
    } finally {
      await bin.close();
    }
  }, 30_000);
});
