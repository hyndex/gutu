/** /api/mail/ical — RSVP from the reader. */

import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { db, nowIso } from "../../db";
import { recordAudit } from "../../lib/audit";
import { broadcastResourceChange } from "../../lib/ws";
import { buildReply } from "../../lib/mail/ical";
import { errorResponse, loadRecord, saveRecord, tenantId, userIdOf } from "./_helpers";

export const icalRoutes = new Hono();
icalRoutes.use("*", requireAuth);

icalRoutes.post("/rsvp/:messageId", async (c) => {
  const messageId = c.req.param("messageId") ?? "";
  const message = loadRecord<Record<string, unknown>>("mail.message", messageId);
  if (!message || message.userId !== userIdOf(c)) return errorResponse(c, 404, "not-found", "message not found");
  let body: { partstat?: "ACCEPTED" | "DECLINED" | "TENTATIVE" } = {};
  try { body = await c.req.json(); } catch { return errorResponse(c, 400, "invalid-json", "JSON body"); }
  if (!body.partstat) return errorResponse(c, 400, "missing-partstat", "partstat required");

  const eventId = (message.icsEventId as string | undefined) ?? "";
  const event = eventId ? loadRecord<Record<string, unknown>>("mail.ics-event", eventId) : null;
  if (!event) return errorResponse(c, 400, "no-ics", "no calendar event attached");
  const ics = buildReply(
    {
      uid: String(event.uid ?? ""),
      sequence: Number(event.sequence ?? 0),
      summary: String(event.summary ?? ""),
      start: String(event.start ?? ""),
      end: String(event.end ?? ""),
      organizer: event.organizer as { email: string; cn?: string } | undefined,
      attendees: [],
    },
    { email: c.req.header("x-mail-user-email") ?? "", cn: undefined },
    body.partstat,
  );
  const id = `rsvp_${messageId}_${Date.now()}`;
  saveRecord("mail.ics-rsvp", {
    id,
    messageId,
    userId: userIdOf(c),
    tenantId: tenantId(),
    partstat: body.partstat,
    ics,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  recordAudit({ actor: userIdOf(c), action: "mail.ical.rsvp", resource: "mail.message", recordId: messageId, payload: { partstat: body.partstat } });
  broadcastResourceChange("mail.ics-rsvp", id, "create", userIdOf(c));
  void db;
  return c.json({ ok: true, id, partstat: body.partstat });
});
