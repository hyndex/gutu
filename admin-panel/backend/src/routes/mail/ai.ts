/** /api/mail/ai — summary, smart reply, subject, classify, draft, improve. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db } from "../../db";
import { errorResponse, tenantId, userIdOf } from "./_helpers";
import {
  classifyMessage,
  generateDraft,
  improveText,
  smartReply,
  suggestSubject,
  summarizeThread,
  translateText,
} from "../../lib/mail/ai/services";
import { AiQuotaError, AiProviderError } from "../../lib/mail/ai";

export const aiRoutes = new Hono();
aiRoutes.use("*", requireAuth);

aiRoutes.post("/summary", async (c) => {
  const body = await safeJson<{ threadId?: string }>(c);
  if (!body?.threadId) return errorResponse(c, 400, "missing-threadId", "threadId required");
  return runOrError(c, () => summarizeThread({ userId: userIdOf(c), tenantId: tenantId(), threadId: body.threadId! }));
});

aiRoutes.post("/smart-reply", async (c) => {
  const body = await safeJson<{ threadId?: string; styleHint?: string }>(c);
  if (!body?.threadId) return errorResponse(c, 400, "missing-threadId", "threadId required");
  return runOrError(c, () => smartReply({ userId: userIdOf(c), tenantId: tenantId(), threadId: body.threadId!, styleHint: body.styleHint }));
});

aiRoutes.post("/subject", async (c) => {
  const body = await safeJson<{ bodyText?: string }>(c);
  if (!body?.bodyText) return errorResponse(c, 400, "missing-body", "bodyText required");
  return runOrError(c, () => suggestSubject({ userId: userIdOf(c), tenantId: tenantId(), bodyText: body.bodyText! }));
});

aiRoutes.post("/classify", async (c) => {
  const body = await safeJson<{ text?: string }>(c);
  if (!body?.text) return errorResponse(c, 400, "missing-text", "text required");
  return runOrError(c, () => classifyMessage({ userId: userIdOf(c), tenantId: tenantId(), text: body.text! }));
});

aiRoutes.post("/draft", async (c) => {
  const body = await safeJson<{ brief?: string; recipientName?: string; styleHint?: string }>(c);
  if (!body?.brief) return errorResponse(c, 400, "missing-brief", "brief required");
  return runOrError(c, () => generateDraft({ userId: userIdOf(c), tenantId: tenantId(), brief: body.brief!, recipientName: body.recipientName, styleHint: body.styleHint }));
});

aiRoutes.post("/improve", async (c) => {
  const body = await safeJson<{ text?: string; mode?: "shorter" | "friendlier" | "more-formal" | "fix-grammar" }>(c);
  if (!body?.text) return errorResponse(c, 400, "missing-text", "text required");
  return runOrError(c, () => improveText({ userId: userIdOf(c), tenantId: tenantId(), text: body.text!, mode: body.mode ?? "fix-grammar" }));
});

aiRoutes.post("/translate", async (c) => {
  const body = await safeJson<{ text?: string; targetLocale?: string }>(c);
  if (!body?.text || !body?.targetLocale) return errorResponse(c, 400, "missing-fields", "text + targetLocale required");
  return runOrError(c, () => translateText({ userId: userIdOf(c), tenantId: tenantId(), text: body.text!, targetLocale: body.targetLocale! }));
});

aiRoutes.get("/usage", (c) => {
  const userId = userIdOf(c);
  const rows = db
    .prepare(
      `SELECT action, model, provider, SUM(tokens_in) AS tokensIn, SUM(tokens_out) AS tokensOut,
              SUM(cost_usd_micros) AS costUsdMicros, COUNT(*) AS calls
       FROM mail_ai_usage WHERE user_id = ? AND tenant_id = ? AND created_at >= ?
       GROUP BY action, model, provider`,
    )
    .all(userId, tenantId(), new Date(Date.now() - 30 * 86_400_000).toISOString()) as Record<string, unknown>[];
  return c.json({ window: "30d", rows });
});

async function safeJson<T>(c: import("hono").Context): Promise<T | null> {
  try { return (await c.req.json()) as T; } catch { return null; }
}

async function runOrError<T>(c: import("hono").Context, fn: () => Promise<T>): Promise<Response> {
  try { return c.json(await fn()); }
  catch (err) {
    if (err instanceof AiQuotaError) return errorResponse(c, 429, "quota-exceeded", err.message);
    if (err instanceof AiProviderError) return errorResponse(c, 502, "provider-error", err.message);
    return errorResponse(c, 500, "ai-failed", err instanceof Error ? err.message : "ai failed");
  }
}
