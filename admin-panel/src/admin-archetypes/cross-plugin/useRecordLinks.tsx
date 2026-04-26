/** Cross-plugin hook for the `record-links-core` plugin.
 *
 *  Production deployments wire this to record-links-core's REST/RPC
 *  surface. The default ships a noop adapter so widgets render an empty
 *  state rather than crashing in environments where the plugin is not
 *  installed. */

import * as React from "react";

export interface RecordLinkGroup {
  /** Display label (e.g., "Open deals"). */
  label: string;
  /** Total count in the group. */
  count: number;
  /** Optional summary value (e.g., "$320k"). */
  summary?: string;
  /** Lucide icon name. */
  icon?: string;
  /** Drill destination. */
  href?: string;
  /** Severity tinting. */
  severity?: "info" | "success" | "warning" | "danger" | "neutral";
}

export interface RecordLinksAdapter {
  /** List link groups for an entity. */
  listGroups: (entity: { type: string; id: string }) => Promise<RecordLinkGroup[]>;
}

const NOOP_ADAPTER: RecordLinksAdapter = {
  listGroups: async () => [],
};

const RecordLinksContext = React.createContext<RecordLinksAdapter>(NOOP_ADAPTER);

export interface RecordLinksProviderProps {
  adapter: RecordLinksAdapter;
  children: React.ReactNode;
}

export function RecordLinksProvider({ adapter, children }: RecordLinksProviderProps) {
  return <RecordLinksContext.Provider value={adapter}>{children}</RecordLinksContext.Provider>;
}

export interface UseRecordLinksResult {
  groups: RecordLinkGroup[];
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

/** Loads record-links groups for the given entity. Re-fetches when
 *  the entity id changes. Errors are surfaced; widgets render the
 *  empty state on error rather than throwing. */
export function useRecordLinks(
  entity: { type: string; id: string } | null,
): UseRecordLinksResult {
  const adapter = React.useContext(RecordLinksContext);
  const [groups, setGroups] = React.useState<RecordLinkGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(undefined);
  const reqIdRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!entity) {
      setGroups([]);
      setLoading(false);
      setError(undefined);
      return;
    }
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await adapter.listGroups(entity);
      if (id === reqIdRef.current) {
        setGroups(result);
        setLoading(false);
      }
    } catch (err) {
      if (id === reqIdRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [adapter, entity]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { groups, loading, error, refresh };
}

/** Static adapter helper — useful for tests / demos / when the
 *  record-links-core plugin isn't deployed yet. */
export function staticRecordLinksAdapter(
  table: ReadonlyMap<string, RecordLinkGroup[]>,
): RecordLinksAdapter {
  return {
    listGroups: async ({ type, id }) => table.get(`${type}:${id}`) ?? [],
  };
}
