import { z } from "zod";
import { defineResource } from "@/builders";

export const SummarySchema = z.object({
  id: z.string(),
  threadId: z.string(),
  messageId: z.string().optional(),
  tenantId: z.string().optional(),
  content: z.string(),
  cachedFor: z.string().optional(),
  tags: z.array(z.string()).default([]),
  suggestedReply: z.string().optional(),
  model: z.string().optional(),
  tokensIn: z.number().int().optional(),
  tokensOut: z.number().int().optional(),
  cachedUntil: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const summaryResource = defineResource({
  id: "mail.summary",
  singular: "AI summary",
  plural: "AI summaries",
  schema: SummarySchema,
  displayField: "id",
  icon: "Sparkles",
});
