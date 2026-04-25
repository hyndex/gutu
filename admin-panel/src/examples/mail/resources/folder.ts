import { z } from "zod";
import { defineResource } from "@/builders";

export const FolderSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  name: z.string(),
  systemKind: z.enum(["inbox", "sent", "drafts", "archive", "trash", "spam", "all", "starred", "snoozed", "important", "custom"]).default("custom"),
  parentId: z.string().optional(),
  unreadCount: z.number().int().default(0),
  totalCount: z.number().int().default(0),
});

export const folderResource = defineResource({
  id: "mail.folder",
  singular: "Folder",
  plural: "Folders",
  schema: FolderSchema,
  displayField: "name",
  searchable: ["name"],
  icon: "Folder",
});
