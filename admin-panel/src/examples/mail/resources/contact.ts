import { z } from "zod";
import { defineResource } from "@/builders";

export const ContactSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  email: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  useCount: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const contactResource = defineResource({
  id: "mail.contact",
  singular: "Contact",
  plural: "Contacts",
  schema: ContactSchema,
  displayField: "name",
  searchable: ["name", "email"],
  icon: "UserSquare",
});
