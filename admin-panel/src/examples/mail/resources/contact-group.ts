import { z } from "zod";
import { defineResource } from "@/builders";

export const ContactGroupSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  name: z.string(),
  members: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const contactGroupResource = defineResource({
  id: "mail.contact-group",
  singular: "Contact group",
  plural: "Contact groups",
  schema: ContactGroupSchema,
  displayField: "name",
  searchable: ["name"],
  icon: "Users",
});
