import * as React from "react";
import { apiFetch } from "./auth";
import { useRuntime } from "./context";

export interface LiveAuditEvent {
  id: string;
  actor: string;
  action: string;
  resource: string;
  recordId?: string | null;
  level: "info" | "warn" | "error";
  ip?: string | null;
  occurredAt: string;
  payload?: unknown;
}

export interface LiveAuditPage {
  rows: LiveAuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

/** Pulls from the real /api/audit endpoint (not the seeded audit.event
 *  resource). Re-fetches whenever the realtime channel reports a change. */
export function useLiveAudit(params: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): { data?: LiveAuditPage; loading: boolean; error?: unknown; refetch: () => void } {
  const runtime = useRuntime();
  const [state, setState] = React.useState<{
    data?: LiveAuditPage;
    loading: boolean;
    error?: unknown;
  }>({ loading: true });

  const { page = 1, pageSize = 50, search } = params;

  const load = React.useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    if (search) q.set("search", search);
    apiFetch<LiveAuditPage>(`/audit?${q.toString()}`)
      .then((data) => setState({ loading: false, data }))
      .catch((error) => setState({ loading: false, error }));
  }, [page, pageSize, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(
    () => runtime.bus.on("realtime:resource-changed", () => load()),
    [runtime, load],
  );

  return { ...state, refetch: load };
}
