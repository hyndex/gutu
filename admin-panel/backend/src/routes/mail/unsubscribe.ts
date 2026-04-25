/** /api/mail/unsubscribe/:messageId — execute the List-Unsubscribe action. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { recordAudit } from "../../lib/audit";
import { parseUnsubscribe } from "../../lib/mail/unsubscribe";
import { errorResponse, loadRecord, userIdOf } from "./_helpers";

export const unsubscribeRoutes = new Hono();
unsubscribeRoutes.use("*", requireAuth);

unsubscribeRoutes.post("/:messageId", async (c) => {
  const messageId = c.req.param("messageId") ?? "";
  const message = loadRecord<Record<string, unknown>>("mail.message", messageId);
  if (!message || message.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "message not found");
  const headers = (message.headers as Record<string, string> | undefined) ?? {};
  const plan = parseUnsubscribe(headers["list-unsubscribe"], headers["list-unsubscribe-post"]);
  if (!plan) return errorResponse(c, 400, "no-method", "no unsubscribe method available");
  if (plan.http) {
    try {
      const res = await fetch(plan.http.url, {
        method: plan.http.method,
        headers: plan.http.body ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
        body: plan.http.body,
      });
      recordAudit({ actor: userIdOf(c), action: "mail.unsubscribe.executed", resource: "mail.message", recordId: messageId, payload: { method: "http", status: res.status } });
      return c.json({ ok: true, method: "http", status: res.status });
    } catch (err) {
      return errorResponse(c, 502, "http-failed", err instanceof Error ? err.message : "http failed");
    }
  }
  if (plan.mailto) {
    // Defer to send pipeline — synthesize a queue row to be sent next sweep.
    // Since this is non-trivial without a connection picker, we report the
    // mailto plan back to the caller for the UI to compose-and-send via a
    // normal compose flow.
    recordAudit({ actor: userIdOf(c), action: "mail.unsubscribe.mailto", resource: "mail.message", recordId: messageId, payload: { to: plan.mailto.to } });
    return c.json({ ok: true, method: "mailto", to: plan.mailto.to, subject: plan.mailto.subject ?? "Unsubscribe", body: plan.mailto.body ?? "Unsubscribe" });
  }
  return errorResponse(c, 400, "no-method", "no unsubscribe method available");
});
