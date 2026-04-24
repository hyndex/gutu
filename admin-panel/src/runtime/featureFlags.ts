import type {
  Capability,
  CapabilityRegistry,
  FeatureFlagStore,
  FlagRule,
  FlagValue,
} from "@/contracts/feature-flags";

const STORAGE_KEY = "gutu-admin-flag-overrides";

class FeatureFlagStoreImpl implements FeatureFlagStore {
  private readonly rules: FlagRule[] = [];
  private readonly overrides: Record<string, FlagValue>;

  constructor(initial: readonly FlagRule[] = []) {
    this.rules.push(...initial);
    this.overrides = this.loadOverrides();
  }

  private loadOverrides(): Record<string, FlagValue> {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private persistOverrides(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides));
    } catch {
      /* quota or private mode — silently drop */
    }
  }

  get<T extends FlagValue = boolean>(key: string, fallback: T): T {
    if (key in this.overrides) return this.overrides[key] as T;
    const match = this.rules.find((r) => r.key === key);
    if (!match) return fallback;
    return match.value as T;
  }

  isEnabled(key: string): boolean {
    const v = this.get<FlagValue>(key, false);
    return v === true;
  }

  setOverride(key: string, value: FlagValue): void {
    this.overrides[key] = value;
    this.persistOverrides();
  }

  clearOverride(key: string): void {
    delete this.overrides[key];
    this.persistOverrides();
  }

  all(): Record<string, FlagValue> {
    const out: Record<string, FlagValue> = {};
    for (const r of this.rules) out[r.key] = r.value;
    return { ...out, ...this.overrides };
  }

  register(rules: readonly FlagRule[]): void {
    this.rules.push(...rules);
  }
}

export function createFeatureFlags(rules?: readonly FlagRule[]): FeatureFlagStore {
  return new FeatureFlagStoreImpl(rules);
}

class CapabilityRegistryImpl implements CapabilityRegistry {
  private readonly map = new Map<Capability, Set<string>>();

  has(capability: Capability): boolean {
    return (this.map.get(capability)?.size ?? 0) > 0;
  }

  providers(capability: Capability): readonly string[] {
    return Array.from(this.map.get(capability) ?? []);
  }

  register(pluginId: string, capabilities: readonly Capability[]): void {
    for (const cap of capabilities) {
      const set = this.map.get(cap) ?? new Set<string>();
      set.add(pluginId);
      this.map.set(cap, set);
    }
  }
}

export function createCapabilityRegistry(): CapabilityRegistry {
  return new CapabilityRegistryImpl();
}
