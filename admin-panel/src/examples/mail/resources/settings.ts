import { z } from "zod";
import { defineResource } from "@/builders";

export const SettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  appearance: z.object({ theme: z.enum(["light", "dark", "system"]).optional(), density: z.enum(["comfortable", "compact"]).optional() }).optional(),
  notifications: z.object({ push: z.boolean().optional(), inApp: z.boolean().optional(), emailDigest: z.enum(["off", "daily", "weekly"]).optional() }).optional(),
  privacy: z.object({ blockTrackers: z.boolean().optional(), imageProxy: z.enum(["always", "on-trust", "never"]).optional(), allowReadReceipts: z.boolean().optional() }).optional(),
  shortcuts: z.record(z.array(z.string())).optional(),
  ai: z.object({ model: z.string().optional(), customPrompt: z.string().optional(), redactPII: z.boolean().optional(), retentionDays: z.number().int().optional() }).optional(),
  vacation: z.object({ enabled: z.boolean().optional(), subject: z.string().optional(), body: z.string().optional(), from: z.string().optional(), to: z.string().optional(), onlyContacts: z.boolean().optional() }).optional(),
  forwarding: z.object({ enabled: z.boolean().optional(), to: z.string().optional(), keepCopy: z.boolean().optional() }).optional(),
  defaultConnectionId: z.string().optional(),
  composeShortcut: z.string().optional(),
  undoSeconds: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const settingsResource = defineResource({
  id: "mail.settings",
  singular: "Mail settings",
  plural: "Mail settings",
  schema: SettingsSchema,
  displayField: "id",
  icon: "Settings",
});
