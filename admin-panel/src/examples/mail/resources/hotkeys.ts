import { z } from "zod";
import { defineResource } from "@/builders";

export const HotkeysSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  bindings: z.record(z.array(z.string())).default({}),
  updatedAt: z.string(),
});

export const hotkeysResource = defineResource({
  id: "mail.hotkeys",
  singular: "Hotkey set",
  plural: "Hotkey sets",
  schema: HotkeysSchema,
  displayField: "id",
  icon: "Keyboard",
});
