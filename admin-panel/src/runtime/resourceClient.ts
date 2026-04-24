import { QueryCache } from "./queryCache";
import type { ListQuery, ListResult, ResourceAdapter } from "./types";

/** The façade plugins + views talk to. Wraps adapter calls with cache +
 *  invalidation. Plugin code should never touch the adapter directly. */
export class ResourceClient {
  readonly cache = new QueryCache();
  constructor(private adapter: ResourceAdapter) {}

  key(resource: string, op: string, params?: unknown) {
    return ["resource", resource, op, params] as const;
  }

  list(resource: string, query: ListQuery = {}): Promise<ListResult> {
    return this.cache.fetch(
      JSON.stringify({ resource, op: "list", query }),
      () => this.adapter.list(resource, query),
    );
  }

  get(resource: string, id: string): Promise<Record<string, unknown> | null> {
    return this.cache.fetch(
      JSON.stringify({ resource, op: "get", id }),
      () => this.adapter.get(resource, id),
    );
  }

  async create(resource: string, data: Record<string, unknown>) {
    const row = await this.adapter.create(resource, data);
    this.cache.invalidateResource(resource);
    return row;
  }

  async update(resource: string, id: string, data: Record<string, unknown>) {
    const row = await this.adapter.update(resource, id, data);
    this.cache.invalidateResource(resource);
    return row;
  }

  async delete(resource: string, id: string) {
    await this.adapter.delete(resource, id);
    this.cache.invalidateResource(resource);
  }

  /** Force refresh of all cached queries for a resource. */
  refresh(resource?: string): void {
    if (resource) this.cache.invalidateResource(resource);
    else this.cache.clear();
  }
}
