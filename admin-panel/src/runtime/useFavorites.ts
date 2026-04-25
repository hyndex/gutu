/** useFavorites — React hook over `/api/favorites`.
 *
 *  Backed by a module-level cache so multiple components stay in sync
 *  without re-fetching. The cache is hydrated once per session (the
 *  first hook to mount triggers the GET); subsequent mounts read the
 *  cache synchronously. Mutations (`add`, `remove`, `update`) update the
 *  cache optimistically AND fire the matching backend call; listeners
 *  fan-out so every mounted hook re-renders.
 *
 *  Auth: requests carry the bearer from `authStore` and the active
 *  tenant via `x-tenant`, mirroring `runtime/savedViews.ts`. If the user
 *  isn't signed in we behave as an empty list and skip the network.
 */
import * as React from "react";
import { authStore } from "./auth";

export type FavoriteKind = "view" | "record" | "page" | "link";

export interface Favorite {
  tenantId: string;
  userId: string;
  kind: FavoriteKind;
  targetId: string;
  label: string | null;
  icon: string | null;
  folder: string | null;
  position: number;
  createdAt: string;
}

export interface FavoriteAddInput {
  kind: FavoriteKind;
  targetId: string;
  label?: string;
  icon?: string;
  folder?: string;
  position?: number;
}

export interface FavoriteUpdateInput {
  label?: string;
  icon?: string;
  folder?: string | null;
  position?: number;
}

/* ------------------------------------------------------------------ */
/*  Module-level cache + listener fan-out                              */
/* ------------------------------------------------------------------ */

interface CacheState {
  rows: Favorite[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
}

let cache: CacheState = {
  rows: [],
  status: "idle",
  error: null,
};
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function notify(): void {
  for (const fn of listeners) fn();
}

function setCache(next: Partial<CacheState>): void {
  cache = { ...cache, ...next };
  notify();
}

function key(kind: FavoriteKind, targetId: string): string {
  return `${kind}:${targetId}`;
}

/* ------------------------------------------------------------------ */
/*  HTTP helpers                                                       */
/* ------------------------------------------------------------------ */

function apiBase(): string {
  const base =
    (typeof import.meta !== "undefined"
      ? (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE
      : undefined) ?? "/api";
  return base.toString().replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`;
  if (authStore.activeTenant?.id) headers["x-tenant"] = authStore.activeTenant.id;
  return headers;
}

async function fetchAll(): Promise<Favorite[]> {
  if (!authStore.token) return [];
  const res = await fetch(`${apiBase()}/favorites`, {
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`favorites ${res.status}`);
  const data = (await res.json()) as { rows: Favorite[] };
  return data.rows ?? [];
}

async function postAdd(input: FavoriteAddInput): Promise<void> {
  if (!authStore.token) return;
  await fetch(`${apiBase()}/favorites`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(input),
  });
}

async function patchOne(
  kind: FavoriteKind,
  targetId: string,
  patch: FavoriteUpdateInput,
): Promise<void> {
  if (!authStore.token) return;
  await fetch(
    `${apiBase()}/favorites/${encodeURIComponent(kind)}/${encodeURIComponent(targetId)}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(patch),
    },
  );
}

async function deleteOne(kind: FavoriteKind, targetId: string): Promise<void> {
  if (!authStore.token) return;
  await fetch(
    `${apiBase()}/favorites/${encodeURIComponent(kind)}/${encodeURIComponent(targetId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    },
  );
}

/** Hydrate once per session. Subsequent calls are no-ops while a load
 *  is in flight or after a successful load. */
function hydrate(): void {
  if (cache.status === "ready" || cache.status === "loading") return;
  if (!authStore.token) {
    setCache({ status: "ready", rows: [], error: null });
    return;
  }
  setCache({ status: "loading", error: null });
  inflight = fetchAll()
    .then((rows) => {
      setCache({ rows, status: "ready", error: null });
    })
    .catch((err: unknown) => {
      setCache({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => {
      inflight = null;
    });
}

/** Force refetch — exposed for callers that want explicit reload (e.g.
 *  after switching tenant). */
export function refreshFavorites(): Promise<void> {
  if (!authStore.token) {
    setCache({ status: "ready", rows: [], error: null });
    return Promise.resolve();
  }
  setCache({ status: "loading", error: null });
  inflight = fetchAll()
    .then((rows) => {
      setCache({ rows, status: "ready", error: null });
    })
    .catch((err: unknown) => {
      setCache({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/* ------------------------------------------------------------------ */
/*  Reset cache on auth/tenant change                                  */
/* ------------------------------------------------------------------ */

if (typeof window !== "undefined") {
  authStore.emitter.on("change", () => {
    cache = { rows: [], status: "idle", error: null };
    notify();
  });
  authStore.emitter.on("tenant", () => {
    cache = { rows: [], status: "idle", error: null };
    notify();
  });
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export interface UseFavoritesResult {
  /** All favorites for the current user, in their canonical order. */
  list: () => readonly Favorite[];
  /** True when the (kind, targetId) pair is in the favorites cache. */
  isFavorite: (kind: FavoriteKind, targetId: string) => boolean;
  /** Add a favorite. Optimistic; idempotent (POST is INSERT OR IGNORE). */
  add: (input: FavoriteAddInput) => Promise<void>;
  /** Remove a favorite by (kind, targetId). Optimistic. */
  remove: (kind: FavoriteKind, targetId: string) => Promise<void>;
  /** Patch label / icon / folder / position. Optimistic. */
  update: (
    kind: FavoriteKind,
    targetId: string,
    patch: FavoriteUpdateInput,
  ) => Promise<void>;
  /** Loading flag — true on the very first hydration. */
  loading: boolean;
  /** Last error message from the network, if any. */
  error: string | null;
}

export function useFavorites(): UseFavoritesResult {
  const [, force] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    listeners.add(force);
    hydrate();
    return () => {
      listeners.delete(force);
    };
  }, []);

  const list = React.useCallback(() => cache.rows, []);

  const isFavorite = React.useCallback(
    (kind: FavoriteKind, targetId: string) =>
      cache.rows.some((r) => r.kind === kind && r.targetId === targetId),
    [],
  );

  const add = React.useCallback(async (input: FavoriteAddInput) => {
    // Optimistic — append if not present.
    const present = cache.rows.some(
      (r) => r.kind === input.kind && r.targetId === input.targetId,
    );
    if (!present) {
      const stub: Favorite = {
        tenantId: authStore.activeTenant?.id ?? "default",
        userId: authStore.user?.id ?? "",
        kind: input.kind,
        targetId: input.targetId,
        label: input.label ?? null,
        icon: input.icon ?? null,
        folder: input.folder ?? null,
        position: input.position ?? 0,
        createdAt: new Date().toISOString(),
      };
      setCache({ rows: [...cache.rows, stub] });
    }
    try {
      await postAdd(input);
    } catch {
      // Rollback on failure.
      setCache({
        rows: cache.rows.filter(
          (r) => !(r.kind === input.kind && r.targetId === input.targetId),
        ),
      });
    }
  }, []);

  const remove = React.useCallback(
    async (kind: FavoriteKind, targetId: string) => {
      const before = cache.rows;
      const removed = before.find(
        (r) => r.kind === kind && r.targetId === targetId,
      );
      setCache({
        rows: before.filter(
          (r) => !(r.kind === kind && r.targetId === targetId),
        ),
      });
      try {
        await deleteOne(kind, targetId);
      } catch {
        // Rollback.
        if (removed) setCache({ rows: [...cache.rows, removed] });
      }
    },
    [],
  );

  const update = React.useCallback(
    async (
      kind: FavoriteKind,
      targetId: string,
      patch: FavoriteUpdateInput,
    ) => {
      const before = cache.rows;
      setCache({
        rows: before.map((r) =>
          r.kind === kind && r.targetId === targetId
            ? {
                ...r,
                ...(patch.label !== undefined ? { label: patch.label } : {}),
                ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
                ...(patch.folder !== undefined ? { folder: patch.folder } : {}),
                ...(patch.position !== undefined
                  ? { position: patch.position }
                  : {}),
              }
            : r,
        ),
      });
      try {
        await patchOne(kind, targetId, patch);
      } catch {
        // Rollback to pre-patch state.
        setCache({ rows: before });
      }
    },
    [],
  );

  // Note: we intentionally do NOT memoise `list`/`isFavorite` against
  // cache.rows in the dep array — they read directly from the module
  // cache, and the listener-driven re-render keeps callers fresh.
  return {
    list,
    isFavorite,
    add,
    remove,
    update,
    loading: cache.status === "loading",
    error: cache.error,
  };
}

/** Lightweight non-hook accessor for non-React code (e.g. command palette
 *  builders). Triggers hydration if the cache hasn't loaded yet. */
export function getFavoritesSnapshot(): readonly Favorite[] {
  hydrate();
  return cache.rows;
}
