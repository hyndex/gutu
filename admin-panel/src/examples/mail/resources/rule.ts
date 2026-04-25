import { z } from "zod";
import { defineResource } from "@/builders";

const Leaf = z.object({ field: z.string(), op: z.string(), value: z.unknown().optional() });
const Condition: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal("leaf"), leaf: Leaf }),
    z.object({ kind: z.enum(["and", "or"]), children: z.array(Condition) }),
  ]),
);

export const RuleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  name: z.string(),
  enabled: z.boolean().default(true),
  order: z.number().int().default(100),
  when: Condition,
  then: z.array(z.object({
    kind: z.enum(["applyLabel", "archive", "trash", "star", "markRead", "forward", "snooze", "runWebhook", "rewriteSubject"]),
    args: z.record(z.unknown()).optional(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ruleResource = defineResource({
  id: "mail.rule",
  singular: "Rule",
  plural: "Rules",
  schema: RuleSchema,
  displayField: "name",
  searchable: ["name"],
  icon: "Filter",
});
