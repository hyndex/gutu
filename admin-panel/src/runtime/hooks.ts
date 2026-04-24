import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ListQuery, ListResult } from "./types";
import { useRuntime } from "./context";

export function useList(
  resource: string,
  query: ListQuery = {},
): { data?: ListResult; loading: boolean; error?: unknown; refetch: () => void } {
  const runtime = useRuntime();
  const key = JSON.stringify({ resource, op: "list", query });

  const snapshot = useSyncExternalStore(
    (onStore) => runtime.resources.cache.subscribe(key, onStore),
    () => runtime.resources.cache.get<ListResult>(key),
    () => runtime.resources.cache.get<ListResult>(key),
  );

  // Fetch whenever the key changes.
  useEffect(() => {
    void runtime.resources.list(resource, query).catch(() => {
      /* error is already stored in cache state and surfaced below */
    });
  }, [key, resource, runtime, query]);

  // Auto-refetch when the realtime channel invalidates this resource.
  useEffect(() => {
    const off = runtime.bus.on("realtime:resource-changed", (evt) => {
      if (evt.resource !== resource) return;
      void runtime.resources.list(resource, query).catch(() => {
        /* ignore — surfaced via snapshot.error */
      });
    });
    return off;
  }, [resource, runtime, query]);

  return {
    data: snapshot.data,
    loading: snapshot.status === "loading" || snapshot.status === "idle",
    error: snapshot.error,
    refetch: () => {
      runtime.resources.cache.invalidateResource(resource);
      void runtime.resources.list(resource, query).catch(() => undefined);
    },
  };
}

/** Convenience: fetch every record for a resource as a flat array. Pages used
 *  by rich dashboards (CRM overview, Sales pipeline, etc.) need the full
 *  collection — this hook hides pagination. Capped at 1000 rows. */
export function useAllRecords<T>(
  resource: string,
  query: Omit<ListQuery, "page" | "pageSize"> = {},
): { data: T[]; loading: boolean; error?: unknown; refetch: () => void } {
  const effective = useMemo<ListQuery>(() => ({ ...query, pageSize: 1000 }), [query]);
  const { data, loading, error, refetch } = useList(resource, effective);
  return {
    data: (data?.rows as unknown as T[]) ?? [],
    loading,
    error,
    refetch,
  };
}

export function useRecord(
  resource: string,
  id: string | undefined,
): { data?: Record<string, unknown> | null; loading: boolean; error?: unknown } {
  const runtime = useRuntime();
  const [state, setState] = useState<{
    data?: Record<string, unknown> | null;
    loading: boolean;
    error?: unknown;
  }>({ loading: true });

  useEffect(() => {
    if (!id) {
      setState({ loading: false, data: null });
      return;
    }
    let cancelled = false;
    setState({ loading: true });
    runtime.resources
      .get(resource, id)
      .then((data) => !cancelled && setState({ loading: false, data }))
      .catch((error) => !cancelled && setState({ loading: false, error }));
    return () => {
      cancelled = true;
    };
  }, [resource, id, runtime]);

  return state;
}
