/** AI service abstraction — provider-pluggable.
 *
 *  Operators choose a provider via env (`MAIL_AI_PROVIDER`):
 *    - `openai`    → POST https://api.openai.com/v1/chat/completions
 *    - `anthropic` → POST https://api.anthropic.com/v1/messages
 *    - `groq`      → POST https://api.groq.com/openai/v1/chat/completions
 *    - `ollama`    → POST {URL}/api/chat
 *    - `none`      → AI calls return a deterministic stub (used for tests)
 *
 *  All AI calls flow through `runChat()` which:
 *    1. Checks the per-user + per-tenant rate-limit budget.
 *    2. Redacts PII from inputs before transmission (configurable).
 *    3. Streams or returns a complete response.
 *    4. Records token usage in `mail_ai_usage`. */

import { db, nowIso } from "../../../db";
import { uuid } from "../../id";
import { POLICIES, takeToken } from "../rate-limit";

export type AiAction =
  | "smart-reply"
  | "summary"
  | "subject"
  | "classify"
  | "draft"
  | "improve"
  | "agent"
  | "translate";

export interface AiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface RunChatOptions {
  action: AiAction;
  userId: string;
  tenantId: string;
  messageId?: string;
  threadId?: string;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  redactPII?: boolean;
  /** When set, the function streams string chunks via the callback rather
   *  than returning the full body. */
  onDelta?: (chunk: string) => void;
}

export interface RunChatResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsdMicros: number;
  model: string;
  provider: string;
  latencyMs: number;
}

const PROVIDER = (process.env.MAIL_AI_PROVIDER ?? "none").toLowerCase();
const OPENAI_MODEL = process.env.MAIL_AI_OPENAI_MODEL ?? "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.MAIL_AI_ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const GROQ_MODEL = process.env.MAIL_AI_GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OLLAMA_MODEL = process.env.MAIL_AI_OLLAMA_MODEL ?? "llama3.2";

const COST_PER_M_TOKENS_USD: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
  "claude-haiku-4-5-20251001": { in: 0.8, out: 4 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
};

export async function runChat(opts: RunChatOptions): Promise<RunChatResult> {
  // Rate limit (best effort).
  const userDecision = takeToken(`ai-user:${opts.userId}`, POLICIES.aiUserDay);
  if (!userDecision.allowed) {
    throw new AiQuotaError("daily AI budget exceeded for user");
  }
  const tenantDecision = takeToken(`ai-tenant:${opts.tenantId}`, POLICIES.aiTenantDay);
  if (!tenantDecision.allowed) {
    throw new AiQuotaError("daily AI budget exceeded for tenant");
  }
  const start = Date.now();
  const redacted = opts.redactPII === false ? opts.messages : opts.messages.map((m) => ({ ...m, content: redactPII(m.content) }));
  let result: RunChatResult;
  try {
    if (PROVIDER === "openai") result = await runOpenAi(redacted, opts);
    else if (PROVIDER === "anthropic") result = await runAnthropic(redacted, opts);
    else if (PROVIDER === "groq") result = await runGroq(redacted, opts);
    else if (PROVIDER === "ollama") result = await runOllama(redacted, opts);
    else result = stubResult(opts);
  } catch (err) {
    recordUsage({ ...opts, model: "?", provider: PROVIDER, ok: false, tokensIn: 0, tokensOut: 0, costUsdMicros: 0, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : "unknown" });
    throw err;
  }
  recordUsage({ ...opts, model: result.model, provider: result.provider, ok: true, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsdMicros: result.costUsdMicros, latencyMs: result.latencyMs });
  return result;
}

export class AiQuotaError extends Error {}
export class AiProviderError extends Error {}

function stubResult(opts: RunChatOptions): RunChatResult {
  const text = stubFor(opts.action, opts.messages);
  return {
    text,
    tokensIn: opts.messages.reduce((a, m) => a + m.content.length / 4, 0) | 0,
    tokensOut: text.length / 4 | 0,
    costUsdMicros: 0,
    model: "stub",
    provider: "none",
    latencyMs: 0,
  };
}

function stubFor(action: AiAction, messages: AiMessage[]): string {
  const last = messages[messages.length - 1]?.content ?? "";
  switch (action) {
    case "summary": return `Summary of message: ${last.slice(0, 160)}…`;
    case "smart-reply": return ["Got it, thanks!", "Sounds good — circling back tomorrow.", "Could you share more detail?"].join("\n---\n");
    case "subject": return "Re: follow-up";
    case "classify": return JSON.stringify({ category: "primary", spam: false, confidence: 0.5 });
    case "draft": return "Hi,\n\nThanks for reaching out. Let me look into this and get back to you.\n\nBest";
    case "improve": return last;
    case "translate": return last;
    case "agent": return "Agent stub response.";
    default: return "";
  }
}

async function runOpenAi(messages: AiMessage[], opts: RunChatOptions): Promise<RunChatResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiProviderError("OPENAI_API_KEY missing");
  const start = Date.now();
  const body = {
    model: OPENAI_MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 800,
    stream: !!opts.onDelta,
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new AiProviderError(`openai ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  if (opts.onDelta && res.body) {
    let text = "";
    let tokensIn = 0;
    let tokensOut = 0;
    for await (const chunk of streamSse(res.body)) {
      if (!chunk) continue;
      try {
        const json = JSON.parse(chunk) as { choices?: { delta?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) { text += delta; opts.onDelta?.(delta); }
        if (json.usage) { tokensIn = json.usage.prompt_tokens ?? 0; tokensOut = json.usage.completion_tokens ?? 0; }
      } catch { /* keepalive */ }
    }
    return { text, tokensIn, tokensOut, costUsdMicros: cost(OPENAI_MODEL, tokensIn, tokensOut), model: OPENAI_MODEL, provider: "openai", latencyMs: Date.now() - start };
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const text = data.choices?.[0]?.message?.content ?? "";
  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;
  return { text, tokensIn, tokensOut, costUsdMicros: cost(OPENAI_MODEL, tokensIn, tokensOut), model: OPENAI_MODEL, provider: "openai", latencyMs: Date.now() - start };
}

async function runAnthropic(messages: AiMessage[], opts: RunChatOptions): Promise<RunChatResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiProviderError("ANTHROPIC_API_KEY missing");
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const userAsst = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
  const body = { model: ANTHROPIC_MODEL, system, messages: userAsst, max_tokens: opts.maxTokens ?? 1024, temperature: opts.temperature ?? 0.4 };
  const start = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AiProviderError(`anthropic ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  return { text, tokensIn: data.usage?.input_tokens ?? 0, tokensOut: data.usage?.output_tokens ?? 0, costUsdMicros: cost(ANTHROPIC_MODEL, data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0), model: ANTHROPIC_MODEL, provider: "anthropic", latencyMs: Date.now() - start };
}

async function runGroq(messages: AiMessage[], opts: RunChatOptions): Promise<RunChatResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new AiProviderError("GROQ_API_KEY missing");
  const start = Date.now();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: opts.temperature ?? 0.4, max_tokens: opts.maxTokens ?? 800 }),
  });
  if (!res.ok) throw new AiProviderError(`groq ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, tokensIn: data.usage?.prompt_tokens ?? 0, tokensOut: data.usage?.completion_tokens ?? 0, costUsdMicros: 0, model: GROQ_MODEL, provider: "groq", latencyMs: Date.now() - start };
}

async function runOllama(messages: AiMessage[], opts: RunChatOptions): Promise<RunChatResult> {
  const url = process.env.MAIL_EMBED_OLLAMA_URL ?? process.env.MAIL_AI_OLLAMA_URL ?? "http://127.0.0.1:11434";
  const start = Date.now();
  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, options: { temperature: opts.temperature ?? 0.4 }, stream: false }),
  });
  if (!res.ok) throw new AiProviderError(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string }; eval_count?: number; prompt_eval_count?: number };
  return {
    text: data.message?.content ?? "",
    tokensIn: data.prompt_eval_count ?? 0,
    tokensOut: data.eval_count ?? 0,
    costUsdMicros: 0,
    model: OLLAMA_MODEL,
    provider: "ollama",
    latencyMs: Date.now() - start,
  };
}

async function* streamSse(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      yield payload;
    }
  }
}

function cost(model: string, tIn: number, tOut: number): number {
  const c = COST_PER_M_TOKENS_USD[model];
  if (!c) return 0;
  // Cost in USD micros (1e-6 USD).
  const inUsd = (tIn / 1_000_000) * c.in;
  const outUsd = (tOut / 1_000_000) * c.out;
  return Math.round((inUsd + outUsd) * 1_000_000);
}

function recordUsage(args: {
  action: AiAction;
  userId: string;
  tenantId: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUsdMicros: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
  messageId?: string;
  threadId?: string;
}): void {
  db.prepare(
    `INSERT INTO mail_ai_usage
       (id, tenant_id, user_id, action, model, provider, tokens_in, tokens_out,
        cost_usd_micros, latency_ms, ok, error, message_id, thread_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    uuid(),
    args.tenantId,
    args.userId,
    args.action,
    args.model,
    args.provider,
    args.tokensIn,
    args.tokensOut,
    args.costUsdMicros,
    args.latencyMs,
    args.ok ? 1 : 0,
    args.error ?? null,
    args.messageId ?? null,
    args.threadId ?? null,
    nowIso(),
  );
}

const PII_PATTERNS: { name: string; re: RegExp; replacement: string }[] = [
  { name: "email", re: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, replacement: "<email>" },
  { name: "phone", re: /\+?\d[\d\s\-().]{7,}\d/g, replacement: "<phone>" },
  { name: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "<ssn>" },
  { name: "card", re: /\b(?:\d[ \-]?){13,19}\b/g, replacement: "<card>" },
];

export function redactPII(input: string): string {
  if (!input || (process.env.MAIL_AI_REDACT ?? "off") !== "on") return input;
  let out = input;
  for (const p of PII_PATTERNS) out = out.replace(p.re, p.replacement);
  return out;
}
