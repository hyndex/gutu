# Gutu MCP host — integrator's guide

This is the end-to-end how-to for connecting an AI agent to a Gutu admin
backend over the Model Context Protocol. It covers all three transports
(HTTP, SSE, stdio), the agent lifecycle (issue → call → audit →
revoke), and the safety gates (risk ceiling, dual-key, idempotency,
undo log) every integration eventually trips into.

If you only want to wire a token, jump to [Quickstart](#quickstart).
If you want to know what happens when a tool runs, read
[Lifecycle of one call](#lifecycle-of-one-call).

---

## Architecture in 60 seconds

```
┌────────────────────┐    JSON-RPC 2.0     ┌──────────────────────────────┐
│  Agent (Claude /   │  ────────────────►  │  /api/mcp                    │
│  Cursor / custom)  │                     │  (HTTP, SSE, or stdio bin)   │
└────────────────────┘  ◄──────────────────└──────────────────────────────┘
        ▲                  push: notifications,                │
        │                  sampling/createMessage              ▼
        │                                          ┌────────────────────────┐
        │                                          │  agents · tokens · risk │
        │                                          │  rate limit · circuit   │
        │                                          │  breaker · idempotency  │
        │                                          │  audit log · undo log   │
        │                                          │  plans · prompts        │
        │                                          └───────────┬────────────┘
        │                                                      │
        │                                                      ▼
        │                                          ┌────────────────────────┐
        │   sampling reply                          │  tool registry         │
        └────────────────────────────────────       │  (records, plugins)    │
                                                   └────────────────────────┘
```

* **Discovery** — `GET /api/mcp` returns server info, transports, auth
  scheme, capabilities. Use it to bootstrap a client.
* **Auth** — every connection presents an opaque bearer token issued by
  an admin. Tokens are bound to a single agent and a single tenant.
* **Authorization** — every tool call is gated against the agent's
  scopes (`{ resource → ["read"|"write"|"delete"] }`), risk ceiling,
  rate limits, and daily budget cap.
* **Audit** — every call (success or failure) writes a row to the
  `mcp_call_log` table. Mutation calls also write an entry to the
  `mcp_undo_log` so an operator can revert them.

---

## Quickstart

### 1. Issue an agent + bearer token

The simplest path is the admin UI: **Admin tools → MCP agents → New
agent**, then click **Issue token** on the row. The "Connect a CLI
agent" panel that pops up has copy-pasteable curl recipes for every
transport.

If you'd rather script it:

```sh
# Create an agent (admin session bearer required)
curl -X POST 'https://your-host/api/mcp/admin/agents' \
  -H 'Authorization: Bearer $ADMIN_SESSION' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "my-agent",
    "scopes": { "crm.contact": ["read", "write"] },
    "riskCeiling": "low-mutation",
    "rateLimits": { "low-mutation": 60 },
    "budget": { "dailyWriteCap": 500 }
  }'
# → { "agent": { "id": "...", ... } }

# Issue a bearer token (plaintext returned ONCE)
curl -X POST 'https://your-host/api/mcp/admin/agents/<id>/tokens' \
  -H 'Authorization: Bearer $ADMIN_SESSION'
# → { "token": "mcp_...", "tokenId": "...", "expiresAt": null }
```

Store `token` in your secret manager. **The plaintext is never shown
again** — only its SHA-256 hash is persisted.

### 2. Pick a transport

| Transport | When to use it                                                  |
|-----------|-----------------------------------------------------------------|
| HTTP      | Stateless agents, batch tooling, anything that already speaks   |
|           | REST. Low-latency calls, no push.                               |
| SSE       | Long-lived agents that benefit from notifications +             |
|           | server-initiated sampling on the same connection.               |
| stdio     | Local CLI agents, Claude Desktop, IDE plugins. Bin runs as a    |
|           | subprocess; the agent owns the lifecycle.                       |

All three speak the same JSON-RPC 2.0 envelope and the same method set.

### 3. Initialize

```jsonc
// Request (over any transport)
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "my-agent", "version": "1.0.0" }
  }
}
```

```jsonc
// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": { "name": "gutu-mcp-server", "version": "1.0.0" },
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "subscribe": true, "listChanged": true },
      "prompts": { "listChanged": false },
      "logging": {},
      "sampling": {}
    },
    "instructions": "<agent-specific guidance configured by the operator>"
  }
}
```

### 4. List + call tools

```jsonc
{ "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {} }
```

The response enumerates every tool the agent has scope for —
`<resource>.list`, `.get`, `.search`, `.create`, `.update`, `.delete`,
plus any plugin-registered tools.

```jsonc
{
  "jsonrpc": "2.0", "id": 3,
  "method": "tools/call",
  "params": {
    "name": "crm.contact.create",
    "arguments": {
      "data": { "name": "Aisha Patel", "email": "aisha@example.com" }
    },
    "_meta": { "idempotencyKey": "create-aisha-2026-04-27" }
  }
}
```

The `_meta.idempotencyKey` is optional but recommended for any
mutation. Replays return the original response and don't re-execute.

---

## Transport reference

### HTTP — POST `/api/mcp`

* **Headers**: `Authorization: Bearer <token>`,
  `Content-Type: application/json`.
* **Body**: a single JSON-RPC envelope OR a batch (array of envelopes,
  capped at 100).
* **Response**: a single JSON object (or array, mirroring the request).

For change notifications without SSE, poll the custom RPC:

```jsonc
{ "jsonrpc": "2.0", "id": 4, "method": "notifications/poll", "params": {} }
// → { "result": { "notifications": [ ... ] } }
```

### SSE upgrade — POST `/api/mcp` with `Accept: text/event-stream`

The same endpoint, but now the response stays open as a Server-Sent
Events stream. Each SSE frame is `event: message\ndata: <json>\n\n`,
where `<json>` is one JSON-RPC envelope.

The stream carries:

1. **The response(s)** to the initial batch — same payload as the JSON
   path.
2. **Notifications** (`notifications/resources/updated`,
   `notifications/message`) drained from the per-agent queue.
3. **Server-initiated requests** — currently only
   `sampling/createMessage`. The agent is expected to reply by POSTing
   the response envelope to the same endpoint (plain JSON, no SSE).
4. **Keepalive comments** every 15s (`: keepalive ...\n\n`) to prevent
   reverse-proxy idle close.

Closing the stream (TCP FIN, abort, process exit) cancels every
in-flight sampling request the server had pushed to that stream.

### stdio — `bun run mcp:stdio`

A long-running Bun bin that pipes JSON-RPC over stdin/stdout. Designed
for parent-controlled lifecycles (Claude Desktop, IDE plugins, CI
tools).

```sh
MCP_AGENT_TOKEN='mcp_...' bun run mcp:stdio
```

* **Wire format**: newline-delimited JSON. Each non-empty line on stdin
  is one JSON-RPC envelope; each outgoing envelope on stdout is JSON +
  `\n`. Stderr is free-form logging — never parse it.
* **Boot**: runs the same migrations and plugin contract as the HTTP
  host, then verifies the token. Boot takes ~250ms on a warm cache.
* **Shutdown**: SIGINT, SIGTERM, or stdin EOF triggers a clean exit —
  in-flight tool calls finish (5s ceiling), pending sampling requests
  are cancelled, plugins get their stop hooks fired.

#### Claude Desktop wiring

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```jsonc
{
  "mcpServers": {
    "gutu": {
      "command": "bun",
      "args": ["run", "mcp:stdio"],
      "env": { "MCP_AGENT_TOKEN": "mcp_..." },
      "cwd": "/absolute/path/to/admin-panel/backend"
    }
  }
}
```

Restart Claude Desktop, then ask "what tools do you have from gutu?"
to confirm the connection.

---

## Lifecycle of one call

This is what happens between `tools/call` arriving and the response
going out. Skim it once; the safety gates only matter when you trip
one.

1. **Token + tenancy** — `verifyAgentToken` looks up the SHA-256 hash,
   confirms the agent is `active`, and returns `{ agent }`.
   Cross-tenant requests are rejected.
2. **Rate limit** — per-(agent, risk-bucket) token bucket with
   configurable refill. Returns `-32003 ERR_RATE_LIMITED`.
3. **Circuit breaker** — too many recent errors trips a per-agent
   circuit; subsequent calls 503 with `-32006 ERR_CIRCUIT_OPEN` for the
   cooldown window.
4. **Scope gate** — the tool's required `(resource, action)` is
   checked against `agent.scopes`. Missing scope → `-32002 ERR_FORBIDDEN`.
5. **Risk ceiling** — every tool declares a risk
   (`safe-read | low-mutation | high-mutation | irreversible`). If the
   tool's risk exceeds the agent's ceiling → `-32004 ERR_RISK_BLOCKED`.
6. **Dual-key check** — irreversible tools require a single-use,
   args-bound, expiring `dualKeyToken` issued by an admin. Without it
   → `ERR_RISK_BLOCKED`.
7. **Idempotency** — if `_meta.idempotencyKey` is present, look it up
   in `mcp_idempotency`. If a row exists with the same hash, return the
   stored response.
8. **Budget cap** — for write tools, enforce
   `agent.budget.dailyWriteCap`. Exceeded → `-32007 ERR_BUDGET_EXCEEDED`.
9. **Cancellation hook** — register an `AbortController` keyed by
   request id. Tool implementations get the signal and should bail when
   it fires.
10. **Tool body** — runs as the agent's `mirrorUser` identity (or the
    agent's issuer if no mirror). Any rows it writes go into
    `mcp_undo_log` with the BEFORE/AFTER state.
11. **Audit** — `mcp_call_log` row written with latency, status, args
    hash, and the tool's risk bucket.
12. **Idempotency persist** — successful response cached under the key.

To cancel an in-flight call, send a notification:

```jsonc
{ "jsonrpc": "2.0", "method": "notifications/cancelled", "params": { "requestId": 3, "reason": "user pressed Esc" } }
```

---

## Methods we implement

### Lifecycle
* `initialize` — handshake.
* `ping` — round-trip latency probe.

### Tools
* `tools/list` — enumerate. Filtered by agent scopes.
* `tools/call` — execute. See [Lifecycle of one call](#lifecycle-of-one-call).

### Resources
* `resources/list`, `resources/read`
* `resources/subscribe` / `resources/unsubscribe` — change notifications
  emitted on the agent's queue.

### Prompts
* `prompts/list` — enumerate built-in + plugin-contributed prompt packs.
* `prompts/get` — render a prompt with arguments.

### Sampling (server → agent)
* `sampling/createMessage` — server pushes a request to the agent;
  agent replies with the LLM result (typically by POSTing a response
  envelope back to `/api/mcp`).

### Logging
* `logging/setLevel` — agent sets a floor; server-emitted
  `notifications/message` entries below the floor are dropped.

### Notifications (server → agent)
* `notifications/resources/updated` — a subscribed URI changed.
* `notifications/message` — log emission.

### Notifications (agent → server)
* `notifications/initialized` — handshake complete.
* `notifications/cancelled` — abort an in-flight request.

### Custom RPCs (Gutu-specific)
* `notifications/poll` — long-poll fallback for notifications when SSE
  isn't available.
* `plans/propose` — propose a multi-step plan for human approval.
  Operator approves via the admin UI; the executor then runs the steps
  with optional auto-rollback on failure.

---

## Operating responsibilities

* **Rotate tokens regularly** — set `expiresAt` when issuing or revoke
  + reissue on a schedule.
* **Watch the audit log** — `GET /api/mcp/admin/calls` and the per-agent
  stats. Alert on `errorRate > 5%`, on dual-key requests denied, on
  circuit-breaker trips.
* **Mind the undo window** — `mcp_undo_log` entries expire after 30
  days. The Undo log tab shows what's still revertible.
* **Plans are async** — `POST /admin/plans/:id/execute` returns 202
  immediately; the executor runs steps in the background and updates
  the plan status. Poll for completion.

For incidents (compromised token, runaway agent), **revoke the agent**
(`DELETE /api/mcp/admin/agents/:id`) — every token is invalidated and
every in-flight SSE/stdio connection is dropped.

---

## Testing your integration

```sh
# Confirm discovery + auth
curl -s 'https://your-host/api/mcp' | jq .
curl -s -X POST 'https://your-host/api/mcp' \
  -H 'Authorization: Bearer mcp_...' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' | jq .

# Confirm SSE
curl -N -X POST 'https://your-host/api/mcp' \
  -H 'Authorization: Bearer mcp_...' \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}'
# Wait for: event: message\ndata: {"id":1,"result":{...}}

# Confirm stdio
echo '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' | \
  MCP_AGENT_TOKEN='mcp_...' bun run mcp:stdio
# Wait for: {"jsonrpc":"2.0","id":1,"result":{...}}\n
```

Backend test coverage of these paths lives in
`src/lib/mcp/sampling.test.ts`, `src/lib/mcp/sse.test.ts`, and
`src/lib/mcp/stdio.test.ts`. Run with:

```sh
bun test src/lib/mcp/
```
