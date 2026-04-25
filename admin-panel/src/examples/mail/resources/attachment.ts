import { z } from "zod";
import { defineResource } from "@/builders";

export const AttachmentSchema = z.object({
  id: z.string(),
  messageId: z.string().optional(),
  draftId: z.string().optional(),
  fileId: z.string().optional(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().default(0),
  cid: z.string().optional(),
  inline: z.boolean().default(false),
  isCalendar: z.boolean().default(false),
  scanStatus: z.enum(["pending", "clean", "infected", "unknown"]).default("pending"),
  scannerName: z.string().optional(),
  bytes: z.string().optional(),
});

export const attachmentResource = defineResource({
  id: "mail.attachment",
  singular: "Attachment",
  plural: "Attachments",
  schema: AttachmentSchema,
  displayField: "filename",
  searchable: ["filename", "contentType"],
  icon: "Paperclip",
});
