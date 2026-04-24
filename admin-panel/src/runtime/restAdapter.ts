import type { ListQuery, ListResult, ResourceAdapter } from "./types";
import { apiFetch } from "./auth";

/** HTTP ResourceAdapter — one class, hits the backend for every call.
 *  Mirrors the MockBackend shape so the ResourceClient stays unchanged. */
export class RestAdapter implements ResourceAdapter {
  private toParams(query: ListQuery): string {
    const p = new URLSearchParams();
    if (query.page != null) p.set("page", String(query.page));
    if (query.pageSize != null) p.set("pageSize", String(query.pageSize));
    if (query.sort) {
      p.set("sort", query.sort.field);
      p.set("dir", query.sort.dir);
    }
    if (query.search) p.set("search", query.search);
    for (const [k, v] of Object.entries(query.filters ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        p.set(`filter[${k}]`, String(v[0])); // first value — backend supports single-value filters
        continue;
      }
      if (typeof v === "object" && "from" in (v as object)) {
        const { from, to } = v as { from?: string; to?: string };
        if (from) p.set(`filter[${k}__gte]`, from);
        if (to) p.set(`filter[${k}__lte]`, to);
        continue;
      }
      p.set(`filter[${k}]`, String(v));
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  }

  async list(resource: string, query: ListQuery): Promise<ListResult> {
    return apiFetch<ListResult>(
      `/resources/${encodeURIComponent(resource)}${this.toParams(query)}`,
    );
  }

  async get(resource: string, id: string): Promise<Record<string, unknown> | null> {
    try {
      return await apiFetch<Record<string, unknown>>(
        `/resources/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`,
      );
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  create(resource: string, data: Record<string, unknown>) {
    return apiFetch<Record<string, unknown>>(
      `/resources/${encodeURIComponent(resource)}`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  update(resource: string, id: string, data: Record<string, unknown>) {
    return apiFetch<Record<string, unknown>>(
      `/resources/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async delete(resource: string, id: string) {
    await apiFetch<void>(
      `/resources/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  }
}
