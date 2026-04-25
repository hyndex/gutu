import { z } from "zod";
import { defineResource } from "@/builders";

export const SnoozeSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  wakeAt: z.string(),
  wakeFolder: z.string().optional(),
  reason: z.string().optional(),
  completed: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const snoozeResource = defineResource({
  id: "mail.snooze",
  singular: "Snooze",
  plural: "Snoozes",
  schema: SnoozeSchema,
  displayField: "reason",
  icon: "Clock",
});
