/** /api/mail/agent — streaming AI agent over SSE.
 *
 *  The agent runs a constrained tool-use loop: read mail / search / draft.
 *  Sending requires explicit user confirmation; the route surfaces "needs
 *  confirmation" events to the client so the user can approve. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { runChat, type AiMessage } from "../../lib/mail/ai";
import { agentSystemPrompt } from "../../lib/mail/ai/prompts";
import { errorResponse, tenantId, userIdOf } from "./_helpers";

export const agentRoutes = new Hono();
agentRoutes.use("*", requireAuth);

const TOOL_DESCRIPTIONS = `
- search(q: string)             → returns top-20 matching threads + snippets
- summarize(threadId: string)   → returns the AI summary of a thread
- draft({ to, subject, brief }) → returns a draft body (not yet sent)
- propose_send({ draftId })     → asks the user to confirm sending
`;

agentRoutes.post("/stream", async (c) => {
  let body: { messages?: AiMessage[]; threadId?: string } = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  const messages: AiMessage[] = [
    ...agentSystemPrompt(TOOL_DESCRIPTIONS),
    ...(body.messages ?? []),
  ];
  const userId = userIdOf(c);
  const tenant = tenantId();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown): void => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const result = await runChat({
          action: "agent",
          userId,
          tenantId: tenant,
          threadId: body.threadId,
          messages,
          temperature: 0.4,
          maxTokens: 800,
          onDelta: (chunk) => send("delta", { text: chunk }),
        });
        send("done", { text: result.text, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "unknown error" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
});
