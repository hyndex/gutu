import { z } from "zod";
import { defineResource } from "@/builders";

export const SharedInboxSchema = z.object({
  id: z.string(),
  tenantId: z.string().optional(),
  connectionId: z.string(),
  email: z.string(),
  displayName: z.string().optional(),
  members: z.array(z.string()).default([]),
  defaultAssignee: z.string().optional(),
  slaMinutes: z.number().int().default(240),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sharedInboxResource = defineResource({
  id: "mail.shared-inbox",
  singular: "Shared mailbox",
  plural: "Shared mailboxes",
  schema: SharedInboxSchema,
  displayField: "email",
  searchable: ["email", "displayName"],
  icon: "Inbox",
});
