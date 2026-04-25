/** <TimelineFeed /> — per-record activity feed.
 *
 *  Reads `/api/timeline/<resource>/<recordId>` and renders a vertical
 *  timeline. Auto-emitted events on every record CRUD show up here
 *  with diff and actor — same pattern Twenty's TimelineActivity gives
 *  via its `MORPH_RELATION`-style join.
 *
 *  Designed to drop into either:
 *    - a tab on a detail page (full-width)
 *    - a rail module (compact, last 10 events)
 *  Switched via the `compact` prop. */
import * as React from "react";
import { Activity, ArrowDown, Plus, Pencil, Trash2, RotateCcw, Zap, type LucideIcon } from "lucide-react";
import { authStore } from "@/runtime/auth";

interface TimelineRow {
  id: string;
  resource: string;
  recordId: string;
  kind: string;
  actor: string | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
  message: string;
  occurredAt: string;
}

interface Props {
  resource: string;
  recordId: string;
  compact?: boolean;
  limit?: number;
}

function apiBase(): string {
  const base = (typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE : undefined) ?? "/api";
  return base.toString().replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`;
  if (authStore.activeTenant?.id) headers["x-tenant"] = authStore.activeTenant.id;
  return headers;
}

const KIND_ICON: Record<string, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  restored: RotateCcw,
  destroyed: Trash2,
  workflow: Zap,
  comment: Activity,
};

const KIND_COLOR: Record<string, string> = {
  created: "#10b981",
  updated: "#3b82f6",
  deleted: "#f59e0b",
  restored: "#8b5cf6",
  destroyed: "#dc2626",
  workflow: "#a855f7",
  comment: "#6b7280",
};

export function TimelineFeed({ resource, recordId, compact, limit = 50 }: Props): React.JSX.Element {
  const [rows, setRows] = React.useState<TimelineRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `${apiBase()}/timeline/${encodeURIComponent(resource)}/${encodeURIComponent(recordId)}?limit=${limit}`,
      { headers: authHeaders(), credentials: "include" },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { rows: TimelineRow[] };
      })
      .then((j) => { if (!cancelled) setRows(j.rows ?? []); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resource, recordId, limit]);

  if (loading) {
    return (
      <div style={{ padding: 12, color: "#9ca3af", fontSize: 13 }}>Loading activity…</div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 12, color: "#dc2626", fontSize: 13 }}>
        Couldn't load activity: {error}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: compact ? 12 : 24,
          textAlign: "center",
          color: "#9ca3af",
          fontSize: 13,
        }}
      >
        <Activity size={24} style={{ opacity: 0.4, marginBottom: 8 }} />
        <div>No activity yet.</div>
      </div>
    );
  }

  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.slice(0, compact ? 10 : limit).map((r) => {
        const Icon = KIND_ICON[r.kind] ?? Activity;
        const color = KIND_COLOR[r.kind] ?? "#6b7280";
        return (
          <li
            key={r.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: 8,
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: `${color}22`,
                color,
                flexShrink: 0,
              }}
            >
              <Icon size={12} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 500, color: "#111827" }}>{r.actor ?? "system"}</span>
                <span style={{ color: "#4b5563" }}>{r.message.toLowerCase()}</span>
              </div>
              {r.diff && Object.keys(r.diff).length > 0 && !compact && (
                <ul
                  style={{
                    listStyle: "none",
                    margin: "4px 0 0",
                    padding: 0,
                    fontSize: 11,
                    color: "#6b7280",
                  }}
                >
                  {Object.entries(r.diff).slice(0, 6).map(([k, v]) => (
                    <li key={k} style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                      <span style={{ fontWeight: 500 }}>{k}:</span>
                      <span style={{ color: "#9ca3af", textDecoration: "line-through" }}>
                        {String((v as { from: unknown }).from ?? "—").slice(0, 40)}
                      </span>
                      <ArrowDown size={10} style={{ transform: "rotate(-90deg)" }} />
                      <span style={{ color: "#111827" }}>
                        {String((v as { to: unknown }).to ?? "—").slice(0, 40)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                {formatRelative(r.occurredAt)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}
