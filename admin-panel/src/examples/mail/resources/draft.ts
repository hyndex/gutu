import { z } from "zod";
import { defineResource } from "@/builders";

export const DraftSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  connectionId: z.string().optional(),
  threadId: z.string().optional(),
  inReplyToMessageId: z.string().optional(),
  to: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  signatureId: z.string().optional(),
  templateId: z.string().optional(),
  attachmentIds: z.array(z.string()).default([]),
  fromIdentityId: z.string().optional(),
  lastSavedAt: z.string().optional(),
  dirty: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const draftResource = defineResource({
  id: "mail.draft",
  singular: "Draft",
  plural: "Drafts",
  schema: DraftSchema,
  displayField: "subject",
  searchable: ["subject", "to", "cc"],
  icon: "PencilLine",
});
