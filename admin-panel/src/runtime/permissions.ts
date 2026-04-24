import type {
  ConditionLeaf,
  ConditionTree,
  FieldMask,
  PermissionContext,
  PermissionDecision,
  PermissionEvaluator,
  PolicyRule,
  Verb,
} from "@/contracts/permissions";

function evalLeaf(leaf: ConditionLeaf, record: Record<string, unknown>): boolean {
  const v = record[leaf.field];
  switch (leaf.op) {
    case "eq": return v === leaf.value;
    case "neq": return v !== leaf.value;
    case "lt": return typeof v === "number" && typeof leaf.value === "number" && v < leaf.value;
    case "lte": return typeof v === "number" && typeof leaf.value === "number" && v <= leaf.value;
    case "gt": return typeof v === "number" && typeof leaf.value === "number" && v > leaf.value;
    case "gte": return typeof v === "number" && typeof leaf.value === "number" && v >= leaf.value;
    case "in": return Array.isArray(leaf.value) && (leaf.value as unknown[]).includes(v);
    case "nin": return Array.isArray(leaf.value) && !(leaf.value as unknown[]).includes(v);
    case "contains": return typeof v === "string" && typeof leaf.value === "string" && v.includes(leaf.value);
    case "null": return v === null || v === undefined;
    case "not_null": return v !== null && v !== undefined;
    default: return false;
  }
}

function evalCondition(tree: ConditionTree, record: Record<string, unknown>): boolean {
  if ("and" in tree) return tree.and.every((c) => evalCondition(c, record));
  if ("or" in tree) return tree.or.some((c) => evalCondition(c, record));
  if ("not" in tree) return !evalCondition(tree.not, record);
  return evalLeaf(tree as ConditionLeaf, record);
}

function ruleApplies(rule: PolicyRule, resource: string, verb: Verb, ctx: PermissionContext): boolean {
  if (rule.resource !== "*" && rule.resource !== resource) return false;
  if (!rule.verbs.includes(verb)) return false;
  if (!rule.roles.some((r) => r === "*" || ctx.roles.includes(r))) return false;
  if (rule.scope === "own" && ctx.record) {
    const owner = ctx.record.ownerUserId ?? ctx.record.createdBy ?? ctx.record.owner;
    if (owner !== ctx.userId) return false;
  }
  if (rule.scope === "team" && ctx.record) {
    const teamId = ctx.record.teamId;
    if (typeof teamId === "string" && !(ctx.teamIds ?? []).includes(teamId)) return false;
  }
  if (rule.condition && ctx.record && !evalCondition(rule.condition, ctx.record)) return false;
  return true;
}

export class PermissionEvaluatorImpl implements PermissionEvaluator {
  private readonly rules: PolicyRule[] = [];

  constructor(initial: readonly PolicyRule[] = []) {
    this.rules.push(...initial);
  }

  can(resource: string, verb: Verb, ctx: PermissionContext): PermissionDecision {
    for (const rule of this.rules) {
      if (ruleApplies(rule, resource, verb, ctx)) {
        return { allowed: true };
      }
    }
    const matching = this.rules.filter((r) => r.resource === resource && r.verbs.includes(verb));
    const requiredRoles = Array.from(
      new Set(matching.flatMap((r) => r.roles).filter((r) => r !== "*")),
    );
    return {
      allowed: false,
      reason: requiredRoles.length > 0
        ? `Requires role: ${requiredRoles.join(" or ")}`
        : `No policy grants ${verb} on ${resource}`,
      requiredRoles,
    };
  }

  fieldMask(resource: string, ctx: PermissionContext): FieldMask {
    const hidden = new Set<string>();
    const readOnly = new Set<string>();
    for (const rule of this.rules) {
      if (rule.resource !== resource && rule.resource !== "*") continue;
      if (!rule.roles.some((r) => r === "*" || ctx.roles.includes(r))) continue;
      for (const h of rule.fieldMask?.hidden ?? []) hidden.add(h);
      for (const r of rule.fieldMask?.readOnly ?? []) readOnly.add(r);
    }
    return { hidden: [...hidden], readOnly: [...readOnly] };
  }

  register(rules: readonly PolicyRule[]): void {
    this.rules.push(...rules);
  }
}

/** Default permissive rules — every authenticated user can view+create+edit
 *  their own records, admins can do everything, viewers read-only. */
export const DEFAULT_POLICY_RULES: readonly PolicyRule[] = [
  { resource: "*", verbs: ["view", "create", "edit", "delete", "bulk", "export", "approve"], scope: "global", roles: ["admin"] },
  { resource: "*", verbs: ["view", "create", "edit", "export"], scope: "tenant", roles: ["member"] },
  { resource: "*", verbs: ["view", "export"], scope: "tenant", roles: ["viewer"] },
];

export function createPermissionEvaluator(
  rules: readonly PolicyRule[] = DEFAULT_POLICY_RULES,
): PermissionEvaluator {
  return new PermissionEvaluatorImpl(rules);
}
