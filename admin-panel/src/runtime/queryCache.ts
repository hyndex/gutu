import { Emitter } from "@/lib/emitter";

/** Minimal key-based query cache with subscriptions.
 *  Enough for the admin panel's list/get flows — no dep on React Query. */

type QueryKey = string | readonly unknown[];
type Fetcher<T> = () => Promise<T>;

export interface QueryState<T> {
  data?: T;
  error?: unknown;
  status: "idle" | "loading" | "success" | "error";
  updatedAt: number;
}

interface CacheEntry<T = unknown> {
  state: QueryState<T>;
  inflight?: Promise<T>;
}

const EMPTY_STATE: QueryState<unknown> = Object.freeze({
  status: "idle",
  updatedAt: 0,
});

export class QueryCache {
  private entries = new Map<string, CacheEntry>();
  private emitter = new Emitter<{ change: { key: string } }>();

  private serialize(key: QueryKey): string {
    if (typeof key === "string") return key;
    return JSON.stringify(key);
  }

  /** Returns a STABLE reference — required by useSyncExternalStore.
   *  Never construct a new object inline here, or React will loop. */
  get<T>(key: QueryKey): QueryState<T> {
    const k = this.serialize(key);
    const entry = this.entries.get(k);
    if (entry) return entry.state as QueryState<T>;
    return EMPTY_STATE as QueryState<T>;
  }

  subscribe(key: QueryKey, fn: () => void): () => void {
    const k = this.serialize(key);
    return this.emitter.on("change", (p) => {
      if (p.key === k) fn();
    });
  }

  subscribeAll(fn: (key: string) => void): () => void {
    return this.emitter.on("change", (p) => fn(p.key));
  }

  async fetch<T>(key: QueryKey, fetcher: Fetcher<T>, force = false): Promise<T> {
    const k = this.serialize(key);
    const entry: CacheEntry<T> =
      (this.entries.get(k) as CacheEntry<T>) ??
      ({ state: { status: "idle", updatedAt: 0 } } as CacheEntry<T>);

    if (!force && entry.inflight) return entry.inflight;
    if (
      !force &&
      entry.state.status === "success" &&
      Date.now() - entry.state.updatedAt < 500
    ) {
      return entry.state.data as T;
    }

    entry.state = { ...entry.state, status: "loading" };
    this.entries.set(k, entry);
    this.emitter.emit("change", { key: k });

    const promise = fetcher()
      .then((data) => {
        entry.state = { data, status: "success", updatedAt: Date.now() };
        entry.inflight = undefined;
        this.emitter.emit("change", { key: k });
        return data;
      })
      .catch((error) => {
        entry.state = { ...entry.state, status: "error", error };
        entry.inflight = undefined;
        this.emitter.emit("change", { key: k });
        throw error;
      });

    entry.inflight = promise;
    return promise;
  }

  invalidate(predicate: string | ((key: string) => boolean)): void {
    const match =
      typeof predicate === "string"
        ? (k: string) => k === predicate || k.startsWith(`${predicate}:`)
        : predicate;
    for (const k of Array.from(this.entries.keys())) {
      if (match(k)) {
        this.entries.delete(k);
        this.emitter.emit("change", { key: k });
      }
    }
  }

  invalidateResource(resource: string): void {
    this.invalidate((k) => k.includes(`"resource":"${resource}"`));
  }

  clear(): void {
    this.entries.clear();
    this.emitter.clear();
  }
}
