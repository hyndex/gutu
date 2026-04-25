import { z } from "zod";
import { defineResource } from "@/builders";

export const SecurityKeySchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  kind: z.enum(["pgp", "smime"]),
  publicKey: z.string(),
  fingerprint: z.string(),
  expiresAt: z.string().optional(),
  trusted: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const securityKeyResource = defineResource({
  id: "mail.security-key",
  singular: "Security key",
  plural: "Security keys",
  schema: SecurityKeySchema,
  displayField: "fingerprint",
  searchable: ["fingerprint"],
  icon: "KeyRound",
});
