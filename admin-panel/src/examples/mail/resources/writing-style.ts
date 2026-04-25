import { z } from "zod";
import { defineResource } from "@/builders";

export const WritingStyleSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  numMessages: z.number().int().default(0),
  vector: z.array(z.number()).default([]),
  tone: z.string().optional(),
  vocabulary: z.record(z.unknown()).optional(),
  updatedAt: z.string(),
});

export const writingStyleResource = defineResource({
  id: "mail.writing-style",
  singular: "Writing style",
  plural: "Writing styles",
  schema: WritingStyleSchema,
  displayField: "id",
  icon: "PenLine",
});
