import { z } from "zod";
import { defineResource } from "@/builders";

export const LabelSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  connectionId: z.string().optional(),
  providerLabelId: z.string().optional(),
  name: z.string(),
  color: z.string().optional(),
  parentId: z.string().optional(),
  order: z.number().int().optional(),
  system: z.boolean().optional(),
});

export const labelResource = defineResource({
  id: "mail.label",
  singular: "Label",
  plural: "Labels",
  schema: LabelSchema,
  displayField: "name",
  searchable: ["name"],
  icon: "Tag",
});
