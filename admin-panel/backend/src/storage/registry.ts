/** In-process registry of storage adapters.
 *
 *  Two axes:
 *  - **Factories** keyed by `kind` (e.g. "local", "s3"). Registered once at
 *    boot by each storage-* plugin.
 *  - **Instances** keyed by `id` (e.g. "default", "tenant-acme-s3",
 *    "cold-archive"). Multiple instances of the same kind can coexist —
 *    one tenant might point at AWS us-east-1, another at Cloudflare R2 in
 *    Europe, a third at a local MinIO dev cluster.
 *
 *  The core plugin hydrates instances from config (env / storage_backends
 *  table) at boot and exposes `getAdapter(id)` to the backend routes.
 */

import type { StorageAdapter, StorageAdapterFactory } from "./contract";
import { StorageError } from "./errors";

export interface StorageBackendConfig {
  /** Stable instance id. Used in the files.storageAdapter column. */
  id: string;
  /** Which factory to use. */
  kind: string;
  /** Human label for admin UI. */
  label: string;
  /** Factory-specific config object. Validated by the factory. */
  config: unknown;
  /** If true, new uploads prefer this backend unless overridden per-request. */
  isDefault?: boolean;
  /** If false, the backend is accepted for reads but refused for new writes.
   *  Used to drain a backend before decommission. */
  acceptsWrites?: boolean;
}

export class StorageRegistry {
  private readonly factories = new Map<string, StorageAdapterFactory>();
  private readonly instances = new Map<string, StorageAdapter>();
  private readonly configs = new Map<string, StorageBackendConfig>();
  private defaultId: string | null = null;

  /** Register an adapter kind. Called by each storage-* plugin at activate. */
  registerFactory(factory: StorageAdapterFactory): void {
    if (this.factories.has(factory.kind)) {
      throw new StorageError({
        code: "invalid-argument",
        message: `storage factory "${factory.kind}" already registered`,
        adapter: "registry",
      });
    }
    this.factories.set(factory.kind, factory);
  }

  /** Declare a backend instance from config. The factory must already be
   *  registered; use `materialize()` later to actually instantiate. */
  declareBackend(config: StorageBackendConfig, tenantId: string): void {
    const factory = this.factories.get(config.kind);
    if (!factory) {
      throw new StorageError({
        code: "invalid-argument",
        message: `no factory registered for kind "${config.kind}"`,
        adapter: "registry",
      });
    }
    const err = factory.validateConfig(config.config);
    if (err) {
      throw new StorageError({
        code: "invalid-argument",
        message: `invalid config for backend "${config.id}": ${err}`,
        adapter: "registry",
      });
    }
    const adapter = factory.create(config.config, tenantId);
    this.configs.set(config.id, config);
    this.instances.set(config.id, adapter);
    if (config.isDefault) this.defaultId = config.id;
  }

  /** Swap a backend's implementation (e.g. after credential rotation).
   *  Callers currently holding a reference get stale; they should reacquire. */
  replaceBackend(id: string, tenantId: string, next: StorageBackendConfig): void {
    this.removeBackend(id);
    this.declareBackend(next, tenantId);
  }

  removeBackend(id: string): void {
    const existing = this.instances.get(id);
    if (existing?.close) {
      // Fire-and-forget; caller shouldn't wait on registry mutation.
      existing.close().catch(() => { /* noop */ });
    }
    this.instances.delete(id);
    this.configs.delete(id);
    if (this.defaultId === id) this.defaultId = null;
  }

  /** Resolve an adapter by id. Throws if unknown — callers SHOULD validate
   *  early rather than at the moment they need to stream bytes. */
  getAdapter(id: string): StorageAdapter {
    const a = this.instances.get(id);
    if (!a) {
      throw new StorageError({
        code: "invalid-argument",
        message: `storage backend "${id}" is not registered`,
        adapter: "registry",
      });
    }
    return a;
  }

  /** Best-effort lookup returning null instead of throwing. */
  findAdapter(id: string): StorageAdapter | null {
    return this.instances.get(id) ?? null;
  }

  /** The backend to use when the caller doesn't specify one. */
  getDefault(): StorageAdapter {
    if (!this.defaultId) {
      throw new StorageError({
        code: "invalid-argument",
        message: "no default storage backend configured",
        adapter: "registry",
      });
    }
    return this.getAdapter(this.defaultId);
  }

  getDefaultId(): string | null {
    return this.defaultId;
  }

  listBackends(): readonly StorageBackendConfig[] {
    return [...this.configs.values()];
  }

  listKinds(): readonly string[] {
    return [...this.factories.keys()];
  }

  async closeAll(): Promise<void> {
    await Promise.all(
      [...this.instances.values()].map((a) => a.close?.().catch(() => { /* noop */ })),
    );
    this.instances.clear();
    this.configs.clear();
    this.defaultId = null;
  }
}

/** A single process-wide registry instance. The core plugin owns this;
 *  other code reads from it via `getStorageRegistry()`. */
let _registry: StorageRegistry | null = null;

export function getStorageRegistry(): StorageRegistry {
  if (!_registry) _registry = new StorageRegistry();
  return _registry;
}

/** Test helper — never call in production. */
export function resetStorageRegistry(): void {
  _registry?.closeAll().catch(() => { /* noop */ });
  _registry = null;
}
