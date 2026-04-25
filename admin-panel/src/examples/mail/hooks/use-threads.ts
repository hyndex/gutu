import * as React from "react";
import { mailApi, type MailThread } from "../lib/api";

export interface UseThreadsArgs {
  folder: string;
  label?: string;
  connectionId?: string;
  pageSize?: number;
}

export interface UseThreadsResult {
  rows: MailThread[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  reload: () => void;
  loadMore: () => void;
}

export function useThreads(args: UseThreadsArgs): UseThreadsResult {
  const [rows, setRows] = React.useState<MailThread[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [cursor, setCursor] = React.useState<string | undefined>();
  const versionRef = React.useRef(0);

  const fetch = React.useCallback(
    async (c?: string, append = false): Promise<void> => {
      const v = ++versionRef.current;
      setLoading(true);
      try {
        const r = await mailApi.listThreads({
          folder: args.folder, label: args.label, connectionId: args.connectionId,
          limit: args.pageSize ?? 50, cursor: c,
        });
        if (v !== versionRef.current) return;
        setRows((prev) => (append ? [...prev, ...r.rows] : r.rows));
        setHasMore(r.hasMore);
        setCursor(r.nextCursor);
        setError(null);
      } catch (err) {
        if (v !== versionRef.current) return;
        setError(err instanceof Error ? err : new Error("load failed"));
      } finally {
        if (v === versionRef.current) setLoading(false);
      }
    },
    [args.folder, args.label, args.connectionId, args.pageSize],
  );

  React.useEffect(() => { void fetch(undefined, false); }, [fetch]);

  const reload = React.useCallback(() => { void fetch(undefined, false); }, [fetch]);
  const loadMore = React.useCallback(() => { if (cursor && !loading) void fetch(cursor, true); }, [fetch, cursor, loading]);

  // Realtime: listen on the framework's WS bus by subscribing to a custom
  // event the host emits. Falls back to a 30s poll if no bus is available.
  React.useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ resource?: string }>).detail;
      if (detail?.resource === "mail.thread") void fetch(undefined, false);
    };
    window.addEventListener("realtime:resource-changed", handler);
    return (): void => window.removeEventListener("realtime:resource-changed", handler);
  }, [fetch]);

  return { rows, loading, error, hasMore, reload, loadMore };
}
