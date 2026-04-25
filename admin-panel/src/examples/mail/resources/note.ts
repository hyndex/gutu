import { z } from "zod";
import { defineResource } from "@/builders";

export const NoteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  threadId: z.string(),
  content: z.string(),
  color: z.string().default("default"),
  isPinned: z.boolean().default(false),
  order: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const noteResource = defineResource({
  id: "mail.note",
  singular: "Note",
  plural: "Notes",
  schema: NoteSchema,
  displayField: "content",
  searchable: ["content"],
  icon: "StickyNote",
});
