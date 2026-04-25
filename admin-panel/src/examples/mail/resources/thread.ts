import { z } from "zod";
import { defineResource } from "@/builders";

const Address = z.object({ name: z.string().optional(), email: z.string() });

export const ThreadSchema = z.object({
  id: z.string(),
  threadId: z.string().optional(),
  connectionId: z.string(),
  tenantId: z.string().optional(),
  userId: z.string(),
  providerThreadId: z.string(),
  providerLastMessageId: z.string().optional(),
  subject: z.string(),
  fromName: z.string().optional(),
  fromEmail: z.string().optional(),
  participants: z.array(Address).default([]),
  labelIds: z.array(z.string()).default([]),
  folder: z.string().default("inbox"),
  hasAttachment: z.boolean().default(false),
  hasCalendarInvite: z.boolean().default(false),
  unreadCount: z.number().int().default(0),
  messageCount: z.number().int().default(0),
  preview: z.string().default(""),
  lastMessageAt: z.string(),
  starred: z.boolean().default(false),
  pinned: z.boolean().optional(),
  muted: z.boolean().optional(),
  snoozedUntil: z.string().nullable().optional(),
  important: z.boolean().optional(),
  categoryAuto: z.enum(["primary", "promotions", "social", "updates", "forums"]).optional(),
  phishScore: z.number().optional(),
  size: z.number().optional(),
  sharedStatus: z.enum(["open", "pending", "closed"]).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const threadResource = defineResource({
  id: "mail.thread",
  singular: "Conversation",
  plural: "Conversations",
  schema: ThreadSchema,
  displayField: "subject",
  searchable: ["subject", "fromEmail", "fromName", "preview"],
  icon: "MessageSquare",
});
