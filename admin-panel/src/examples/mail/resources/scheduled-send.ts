import { z } from "zod";
import { defineResource } from "@/builders";

export const ScheduledSendSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  connectionId: z.string(),
  releaseAt: z.string(),
  status: z.enum(["queued", "sending", "sent", "failed", "cancelled"]).default("queued"),
  attempts: z.number().int().default(0),
  lastError: z.string().nullable().optional(),
  kind: z.enum(["undo", "scheduled"]).default("undo"),
  threadId: z.string().nullable().optional(),
  inReplyTo: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  providerMessageId: z.string().nullable().optional(),
  providerThreadId: z.string().nullable().optional(),
  snapshot: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const scheduledSendResource = defineResource({
  id: "mail.scheduled-send",
  singular: "Scheduled send",
  plural: "Scheduled sends",
  schema: ScheduledSendSchema,
  displayField: "id",
  icon: "CalendarClock",
});
