import { z } from "zod";
import { defineResource } from "@/builders";

export const TemplateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  name: z.string(),
  subject: z.string(),
  bodyHtml: z.string(),
  to: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const templateResource = defineResource({
  id: "mail.template",
  singular: "Template",
  plural: "Templates",
  schema: TemplateSchema,
  displayField: "name",
  searchable: ["name", "subject"],
  icon: "FileText",
});
