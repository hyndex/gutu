/** Platform-wide permission contract.
 *
 * Plugins declare PolicyRules; the shell evaluates them via PermissionEvaluator
 * before rendering actions, columns, and routes. Denied routes surface a
 * "Request access" dialog rather than a cryptic 403.
 */

export type Verb =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "bulk"
  | "export"
  | "approve"
  | "impersonate";

export type Scope = "own" | "team" | "tenant" | "global";

export interface ConditionLeaf {
  field: string;
  op:
    | "eq"
    | "neq"
    | "lt"
    | "lte"
    | "gt"
    | "gte"
    | "in"
    | "nin"
    | "contains"
    | "null"
    | "not_null";
  value?: unknown;
}

export type ConditionTree =
  | ConditionLeaf
  | { and: ConditionTree[] }
  | { or: ConditionTree[] }
  | { not: ConditionTree };

export interface FieldMask {
  hidden?: readonly string[];
  readOnly?: readonly string[];
}

export interface PolicyRule {
  /** `plugin.resource` or `*` */
  resource: string;
  verbs: readonly Verb[];
  scope: Scope;
  condition?: ConditionTree;
  fieldMask?: FieldMask;
  /** role ids this rule grants to; combined via OR at evaluation. */
  roles: readonly string[];
}

export interface PermissionContext {
  userId: string;
  roles: readonly string[];
  teamIds?: readonly string[];
  tenantId: string;
  record?: Record<string, unknown>;
}

export interface PermissionDecision {
  allowed: boolean;
  reason?: string;
  requiredRoles?: readonly string[];
}

export type PermissionGate = (ctx: PermissionContext) => PermissionDecision;

export interface PermissionEvaluator {
  /** Evaluate verb on resource, optionally against a specific record. */
  can(resource: string, verb: Verb, ctx: PermissionContext): PermissionDecision;
  /** Return the merged field mask for a resource in context. */
  fieldMask(resource: string, ctx: PermissionContext): FieldMask;
  /** Register additional policy rules at runtime (plugin activation). */
  register(rules: readonly PolicyRule[]): void;
}
