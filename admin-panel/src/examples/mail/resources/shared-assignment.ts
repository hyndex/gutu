import { z } from "zod";
import { defineResource } from "@/builders";

export const SharedAssignmentSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  assigneeUserId: z.string(),
  assignedBy: z.string(),
  tenantId: z.string().optional(),
  dueAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sharedAssignmentResource = defineResource({
  id: "mail.shared-inbox-assignment",
  singular: "Assignment",
  plural: "Assignments",
  schema: SharedAssignmentSchema,
  displayField: "id",
  icon: "UserCheck",
});
