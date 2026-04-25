import { z } from "zod";
import { defineResource } from "@/builders";

export const SignatureSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  name: z.string(),
  bodyHtml: z.string(),
  default: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const signatureResource = defineResource({
  id: "mail.signature",
  singular: "Signature",
  plural: "Signatures",
  schema: SignatureSchema,
  displayField: "name",
  searchable: ["name"],
  icon: "Edit3",
});
