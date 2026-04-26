/** Cross-plugin hook for the `timeline-core` plugin.
 *
 *  Production deployments wire this to timeline-core's REST + WS
 *  surface. The default ships a noop adapter so widgets render an
 *  empty state when the plugin is not installed. */

import * as React from "react";

export interface TimelineEvent {
  id: string;
  /** ISO timestamp. */
  ts: string;
  /** Event kind (e.g., "invoice.send", "user.login"). */
  kind: string;
  /** Actor — user / automation / webhook. */
  actor?: string;
  /** One-line title. */
  title: string;
  /** Optional body. */
  body?: string;
  /** Optional drill href. */
  href?: string;
  /** Severity tier. */
  severity?: "info" | "success" | "warning" | "danger" | "neutral";
}

export interface TimelineFilter {
  /** Filter by entity. */
  entity?: { type: string; id: string };
  /** Filter by kind prefix (e.g., "invoice."). */
  kindPrefix?: string;
  /** Filter by severity tier. */
  severity?: TimelineEvent["severity"];
  /** Limit (default 100). */
  limit?: number;
}

export interface TimelineEventsAdapter {
  /** Read events matching filter. */
  list: (filter: TimelineFilter) => Promise<TimelineEvent[]>;
  /** Optional live-tail subscription. Returns an unsubscribe function. */
  subscribe?: (
    filter: TimelineFilter,
    onEvent: (event: TimelineEvent) => void,
  ) => () => void;
}

const NOOP_ADAPTER: TimelineEventsAdapter = {
  list: async () => [],
};

const TimelineContext = React.createContext<TimelineEventsAdapter>(NOOP_ADAPTER);

export interface TimelineEventsProviderProps {
  adapter: TimelineEventsAdapter;
  children: React.ReactNode;
}

export function TimelineEventsProvider({ adapter, children }: TimelineEventsProviderProps) {
  return <TimelineContext.Provider value={adapter}>{children}</TimelineContext.Provider>;
}

export interface UseTimelineEventsResult {
  events: TimelineEvent[];
  loading: boolean;
  error: unknown;
  /** Manually re-fetch. */
  refresh: () => Promise<void>;
}

/** Reads timeline events with optional live-tail subscription.
 *  When the adapter exposes `subscribe`, the hook auto-subscribes; new
 *  events are merged at the top of the list. */
export function useTimelineEvents(
  filter: TimelineFilter,
  options: { live?: boolean } = {},
): UseTimelineEventsResult {
  const adapter = React.useContext(TimelineContext);
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(undefined);
  const reqIdRef = React.useRef(0);

  // Stable filter signature so we don't re-subscribe on every render.
  const sig = React.useMemo(() => JSON.stringify(filter), [filter]);

  const refresh = React.useCallback(async () => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await adapter.list(filter);
      if (id === reqIdRef.current) {
        setEvents(result);
        setLoading(false);
      }
    } catch (err) {
      if (id === reqIdRef.current) {
        setError(err);
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, sig]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!options.live || !adapter.subscribe) return;
    const off = adapter.subscribe(filter, (event) => {
      setEvents((prev) => [event, ...prev].slice(0, filter.limit ?? 200));
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, sig, options.live]);

  return { events, loading, error, refresh };
}

/** Static adapter for tests / demos. */
export function staticTimelineAdapter(events: readonly TimelineEvent[]): TimelineEventsAdapter {
  return {
    list: async (filter) => {
      let out = [...events];
      if (filter.kindPrefix) {
        out = out.filter((e) => e.kind.startsWith(filter.kindPrefix!));
      }
      if (filter.severity) {
        out = out.filter((e) => e.severity === filter.severity);
      }
      return out.slice(0, filter.limit ?? 100);
    },
  };
}
