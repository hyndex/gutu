import { z } from "zod";
import { defineResource } from "@/builders";

export const ConnectionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  provider: z.enum(["google", "microsoft", "imap", "oidc"]),
  email: z.string().email(),
  displayName: z.string().optional(),
  status: z.enum(["active", "auth_required", "error", "disabled"]).default("active"),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
  oauthScope: z.string().optional(),
  imapHost: z.string().optional(),
  imapPort: z.number().int().optional(),
  imapTLS: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().optional(),
  smtpTLS: z.boolean().optional(),
  username: z.string().optional(),
  lastSyncAt: z.string().optional(),
  lastError: z.string().nullable().optional(),
  quotaBytesUsed: z.number().int().optional(),
  quotaBytesTotal: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const connectionResource = defineResource({
  id: "mail.connection",
  singular: "Mailbox",
  plural: "Mailboxes",
  schema: ConnectionSchema,
  displayField: "email",
  searchable: ["email", "displayName"],
  icon: "AtSign",
});
