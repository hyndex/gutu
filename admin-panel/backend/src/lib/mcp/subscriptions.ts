/** Resource subscriptions + logging-level config.
 *
 *  Per-agent state. The HTTP transport doesn't natively push, so
 *  subscriptions are recorded here and surfaced via long-poll-style
 *  endpoints (`mcp/notifications/poll`) — agents pull, the server
 *  doesn't push. SSE upgrade in a future revision turns this into
 *  real server-side push.
 *
 *  The state is in-memory per process; if the agent reconnects to a
 *  different instance behind a load balancer, it must re-subscribe.
 *  That's acceptable: subscriptions are short-lived (seconds-to-
 *  minutes), agents are designed to handle reconnection. */

import type { JsonRpcNotification } from "./protocol";

interface AgentState {
  subscribedUris: Set<string>;
  pendingNotifications: JsonRpcNotification[];
  /** Min log level the agent wants. The server filters its own
   *  emitted log notifications against this floor. */
  logLevel: LogLevel;
}

export type LogLevel = "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  notice: 2,
  warning: 3,
  error: 4,
  critical: 5,
  alert: 6,
  emergency: 7,
};

const STATE = new Map<string, AgentState>();
const MAX_PENDING = 200;

function getOrCreate(agentId: string): AgentState {
  let s = STATE.get(agentId);
  if (!s) {
    s = { subscribedUris: new Set(), pendingNotifications: [], logLevel: "info" };
    STATE.set(agentId, s);
  }
  return s;
}

export function subscribe(agentId: string, uri: string): void {
  getOrCreate(agentId).subscribedUris.add(uri);
}

export function unsubscribe(agentId: string, uri: string): void {
  STATE.get(agentId)?.subscribedUris.delete(uri);
}

export function setLogLevel(agentId: string, level: LogLevel): void {
  getOrCreate(agentId).logLevel = level;
}

export function getLogLevel(agentId: string): LogLevel {
  return STATE.get(agentId)?.logLevel ?? "info";
}

/** Drain the pending queue. The agent calls this via
 *  `notifications/poll` (a custom RPC) and gets every notification
 *  emitted since its last drain. Caps the queue so a slow agent
 *  doesn't grow memory unbounded. */
export function drain(agentId: string): JsonRpcNotification[] {
  const s = STATE.get(agentId);
  if (!s) return [];
  const out = s.pendingNotifications.slice();
  s.pendingNotifications = [];
  return out;
}

/** Push a notification to a specific agent's queue. Drops the oldest
 *  entry when the queue overflows so newer notifications still
 *  arrive. */
function enqueue(agentId: string, notification: JsonRpcNotification): void {
  const s = getOrCreate(agentId);
  if (s.pendingNotifications.length >= MAX_PENDING) {
    s.pendingNotifications.shift();
  }
  s.pendingNotifications.push(notification);
}

/** Emit a `notifications/resources/updated` to every agent
 *  subscribed to the matching uri. */
export function broadcastResourceChanged(uri: string): number {
  let count = 0;
  for (const [agentId, s] of STATE) {
    if (s.subscribedUris.has(uri)) {
      enqueue(agentId, {
        jsonrpc: "2.0",
        method: "notifications/resources/updated",
        params: { uri },
      });
      count++;
    }
  }
  return count;
}

/** Emit a structured log notification. Filtered against the agent's
 *  current logLevel. */
export function emitLog(agentId: string, level: LogLevel, message: string, data?: unknown): void {
  const s = getOrCreate(agentId);
  if (LEVEL_RANK[level] < LEVEL_RANK[s.logLevel]) return;
  enqueue(agentId, {
    jsonrpc: "2.0",
    method: "notifications/message",
    params: { level, logger: "gutu-mcp-server", data, message },
  });
}

export function _resetSubscriptionsState_forTest(): void {
  STATE.clear();
}
