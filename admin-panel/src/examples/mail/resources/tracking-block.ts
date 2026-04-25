import { z } from "zod";
import { defineResource } from "@/builders";

export const TrackingBlockSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  host: z.string(),
  pixelHash: z.string().optional(),
  blocked: z.boolean().default(true),
  reason: z.string().optional(),
  at: z.string(),
});

export const trackingBlockResource = defineResource({
  id: "mail.tracking-block",
  singular: "Tracker block",
  plural: "Tracker blocks",
  schema: TrackingBlockSchema,
  displayField: "host",
  icon: "ShieldOff",
});
