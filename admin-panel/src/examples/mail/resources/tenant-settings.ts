import { z } from "zod";
import { defineResource } from "@/builders";

export const TenantSettingsSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  aiAllowed: z.boolean().default(true),
  defaultRetentionDays: z.number().int().default(0),
  requireMfa: z.boolean().default(false),
  allowedProviders: z.array(z.string()).default(["google", "microsoft", "imap"]),
  requireDkim: z.boolean().default(false),
  imageProxyEnforced: z.boolean().default(true),
  vacationGloballyOff: z.boolean().default(false),
  maxConnectionsPerUser: z.number().int().default(5),
  updatedAt: z.string(),
});

export const tenantSettingsResource = defineResource({
  id: "mail.tenant-settings",
  singular: "Tenant policy",
  plural: "Tenant policies",
  schema: TenantSettingsSchema,
  displayField: "id",
  icon: "ShieldCheck",
});
