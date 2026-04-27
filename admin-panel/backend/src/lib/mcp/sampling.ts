/** Sampling — server-initiated `sampling/createMessage` requests.
 *
 *  Per the MCP spec, a server can ask its agent to invoke an LLM on
 *  the agent's behalf (e.g. "summarise this", "translate this", "draw
 *  a chart of this dataset"). The agent client is responsible for
 *  prompting the LLM, applying its sampling preferences, and returning
 *  the result.
 *
 *  Transport-agnostic plumbing:
 *
 *    requestSampling(agentId, params) → Promise<result>
 *      1. allocate a server-request id
 *      2. push a JSON-RPC request to the agent's pending queue
 *         (also written to any active SSE stream + stdio pipe)
 *      3. wait on a pending Promise keyed by id
 *
 *    resolveSamplingResult({ id, result | error })
 *      4. transport routes incoming RESPONSES (id + result | error)
 *         here — we resolve the pending Promise.
 *
 *  Timeouts: every sampling request gets a default 60s timeout. The
 *  agent CAN take longer (long LLM completions are normal) — pass an
 *  explicit `timeoutMs` to opt up to 5 minutes. */

import type { JsonRpcNotification } from "./protocol";

const PENDING = new Map<
  string,
  {
    resolve: (result: SamplingResult) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    agentId: string;
    createdAt: number;
  }
>();

const MAX_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const ID_PREFIX = "srv-";
let counter = 0;

export interface SamplingMessage {
  role: "user" | "assistant";
  content: { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
}

export interface SamplingPreferences {
  /** 0..1 — how much to optimise for cost (higher = cheaper). */
  costPriority?: number;
  /** 0..1 — how much to optimise for speed. */
  speedPriority?: number;
  /** 0..1 — how much to optimise for intelligence. */
  intelligencePriority?: number;
  /** Hints the client SHOULD honour when picking a model. */
  hints?: Array<{ name?: string }>;
}

export interface SamplingParams {
  messages: SamplingMessage[];
  modelPreferences?: SamplingPreferences;
  systemPrompt?: string;
  /** Stop when the assistant generates one of these strings. */
  stopSequences?: string[];
  /** Token budget. */
  maxTokens?: number;
  /** Sampling temperature. */
  temperature?: number;
  /** Custom metadata that the client passes back unchanged. */
  metadata?: Record<string, unknown>;
}

export interface SamplingResult {
  role: "assistant";
  content: { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
  model: string;
  stopReason?: "endTurn" | "stopSequence" | "maxTokens" | string;
}

/** Transport hook — set by `routes/mcp.ts` (for SSE) and by the stdio
 *  binary. The transport receives a notification-shaped JSON-RPC
 *  REQUEST (it has an id, despite the type name) and is responsible
 *  for delivering it to the agent. Multiple transports may register
 *  simultaneously per agent (e.g., a stdio agent that also opened an
 *  SSE stream); every active transport receives the request.
 *
 *  The default is a no-op — sampling silently fails fast in that case
 *  rather than hanging. */
type TransportHook = (agentId: string, request: JsonRpcNotification & { id: string }) => boolean;

const TRANSPORTS = new Set<TransportHook>();

export function registerSamplingTransport(fn: TransportHook): () => void {
  TRANSPORTS.add(fn);
  return () => TRANSPORTS.delete(fn);
}

function deliverToAgent(agentId: string, request: JsonRpcNotification & { id: string }): boolean {
  let delivered = false;
  for (const hook of TRANSPORTS) {
    try {
      if (hook(agentId, request)) delivered = true;
    } catch {
      /* never break sampling because of a misbehaving transport */
    }
  }
  return delivered;
}

export interface RequestSamplingArgs {
  agentId: string;
  params: SamplingParams;
  timeoutMs?: number;
}

/** Send a `sampling/createMessage` request to the agent and await its
 *  reply. Resolves with the LLM result; rejects on timeout, transport
 *  failure, or explicit error response. Server callers (e.g. the
 *  prompts module, plugin tools) use this when they need an LLM in
 *  the loop. */
export function requestSampling(args: RequestSamplingArgs): Promise<SamplingResult> {
  return new Promise<SamplingResult>((resolve, reject) => {
    const id = `${ID_PREFIX}${Date.now().toString(36)}-${++counter}`;
    const timeoutMs = Math.min(args.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
    const timer = setTimeout(() => {
      const entry = PENDING.get(id);
      if (entry) {
        PENDING.delete(id);
        entry.reject(new Error(`sampling timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    PENDING.set(id, { resolve, reject, timer, agentId: args.agentId, createdAt: Date.now() });

    const request: JsonRpcNotification & { id: string } = {
      jsonrpc: "2.0",
      id,
      method: "sampling/createMessage",
      params: args.params as unknown as Record<string, unknown>,
    };
    const delivered = deliverToAgent(args.agentId, request);
    if (!delivered) {
      // No transport registered for this agent — the agent isn't
      // currently connected via SSE or stdio. Fail fast rather than
      // letting the call sit until the timeout (which would also be
      // correct, just slower to surface).
      const entry = PENDING.get(id);
      if (entry) {
        clearTimeout(entry.timer);
        PENDING.delete(id);
      }
      reject(new Error(`no sampling transport open for agent ${args.agentId}`));
    }
  });
}

/** Called by transports when an incoming JSON-RPC RESPONSE matches a
 *  pending sampling request id. Returns true when a Promise was
 *  resolved/rejected; false when the id is unknown (caller can decide
 *  whether to surface that as an error or ignore). */
export function resolveSamplingResult(args: {
  id: string;
  agentId: string;
  result?: SamplingResult;
  error?: { code: number; message: string };
}): boolean {
  const entry = PENDING.get(args.id);
  if (!entry) return false;
  if (entry.agentId !== args.agentId) return false; // cross-agent leakage guard
  PENDING.delete(args.id);
  clearTimeout(entry.timer);
  if (args.error) {
    entry.reject(new Error(`sampling error ${args.error.code}: ${args.error.message}`));
    return true;
  }
  if (!args.result) {
    entry.reject(new Error("sampling response missing result + error"));
    return true;
  }
  entry.resolve(args.result);
  return true;
}

/** Forcibly cancel every pending sampling request for an agent — used
 *  when the agent disconnects (SSE stream closed, stdio process
 *  exited). The caller's Promise rejects with a clear "transport
 *  closed" message rather than waiting for the timeout. */
export function cancelPendingForAgent(agentId: string, reason: string): number {
  let cancelled = 0;
  for (const [id, entry] of PENDING) {
    if (entry.agentId === agentId) {
      PENDING.delete(id);
      clearTimeout(entry.timer);
      entry.reject(new Error(`sampling cancelled: ${reason}`));
      cancelled++;
    }
  }
  return cancelled;
}

/** Test-only: clear all pending. */
export function _resetSampling_forTest(): void {
  for (const [, entry] of PENDING) {
    clearTimeout(entry.timer);
    entry.reject(new Error("test reset"));
  }
  PENDING.clear();
  TRANSPORTS.clear();
}

/** For diagnostics. */
export function pendingCount(): number {
  return PENDING.size;
}
