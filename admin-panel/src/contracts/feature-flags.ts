/** Feature flag + capability contract.
 *
 * Flags gate whole pages or features per-tenant-per-user. Capabilities declare
 * what a plugin *supports* (used for conditional slot rendering).
 */

export type FlagValue = boolean | string | number;

export interface FlagRule {
  key: string;
  value: FlagValue;
  /** Scope filters are AND-ed. Missing filter = match all. */
  tenantIds?: readonly string[];
  userIds?: readonly string[];
  roles?: readonly string[];
  /** Percentage rollout 0–100. */
  rollout?: number;
}

export interface FeatureFlagStore {
  get<T extends FlagValue = boolean>(key: string, fallback: T): T;
  isEnabled(key: string): boolean;
  setOverride(key: string, value: FlagValue): void;
  clearOverride(key: string): void;
  all(): Record<string, FlagValue>;
  register(rules: readonly FlagRule[]): void;
}

export type Capability =
  | "billing"
  | "audit"
  | "realtime"
  | "ai"
  | "automation"
  | "multi-currency"
  | "multi-tenant"
  | "file-upload"
  | "sso"
  | "mfa"
  | "approvals"
  | "import"
  | "export"
  | "offline";

export interface CapabilityRegistry {
  has(capability: Capability): boolean;
  providers(capability: Capability): readonly string[];
  register(pluginId: string, capabilities: readonly Capability[]): void;
}
