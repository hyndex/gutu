import * as React from "react";
import { RefreshCw, Search, Zap } from "lucide-react";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent } from "@/admin-primitives/Card";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { StatusDot } from "@/admin-primitives/StatusDot";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Badge } from "@/primitives/Badge";
import { Avatar } from "@/primitives/Avatar";
import { Spinner } from "@/primitives/Spinner";
import { useLiveAudit } from "@/runtime/audit";
import { formatRelative } from "@/lib/format";

/** Shows the *real* audit log from /api/audit (not the seeded audit.event
 *  resource). Updates live through the realtime WebSocket. */
export function LiveAuditPage() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { data, loading, error, refetch } = useLiveAudit({
    page,
    pageSize: 50,
    search: search || undefined,
  });

  React.useEffect(() => setPage(1), [search]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Audit log"
        description={
          data
            ? `${data.total.toLocaleString()} events · live stream`
            : "Live stream of every mutation on the backend."
        }
        actions={
          <>
            <span className="inline-flex items-center gap-1 text-xs text-intent-success">
              <StatusDot intent="success" pulse /> Realtime
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              iconLeft={loading ? <Spinner size={12} /> : <RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="min-w-[220px] flex-1 max-w-md">
          <Input
            prefix={<Search className="h-3.5 w-3.5" />}
            placeholder="Search actor, action, resource…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <EmptyState
          title="Couldn't load audit log"
          description={error instanceof Error ? error.message : "Unknown error"}
        />
      ) : !data ? (
        <div className="py-16 flex items-center justify-center text-sm text-text-muted">
          <Spinner size={14} /> <span className="ml-2">Loading audit log…</span>
        </div>
      ) : data.rows.length === 0 ? (
        <EmptyState
          title="No audit events"
          description="The backend hasn't recorded any state-changing events yet."
          icon={<Zap className="h-5 w-5" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface-1 border-b border-border text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-40">When</th>
                  <th className="text-left py-2 font-medium w-20">Level</th>
                  <th className="text-left py-2 font-medium">Actor</th>
                  <th className="text-left py-2 font-medium">Action</th>
                  <th className="text-left py-2 font-medium">Resource</th>
                  <th className="text-left py-2 font-medium pr-3">Record</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-border-subtle last:border-b-0 hover:bg-surface-1 transition-colors"
                  >
                    <td className="px-3 py-2 text-text-secondary">
                      {formatRelative(ev.occurredAt)}
                    </td>
                    <td className="py-2">
                      <Badge
                        intent={
                          ev.level === "error"
                            ? "danger"
                            : ev.level === "warn"
                              ? "warning"
                              : "info"
                        }
                      >
                        {ev.level}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={ev.actor} size="xs" />
                        <span className="text-text-primary">{ev.actor}</span>
                      </span>
                    </td>
                    <td className="py-2 text-text-primary font-medium">
                      <code className="text-xs font-mono">{ev.action}</code>
                    </td>
                    <td className="py-2 text-text-secondary">
                      <code className="text-xs font-mono">{ev.resource}</code>
                    </td>
                    <td className="py-2 pr-3">
                      {ev.recordId ? (
                        <code className="text-xs font-mono text-text-muted">
                          {ev.recordId}
                        </code>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Page {data.page} · showing {data.rows.length} of{" "}
            {data.total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={data.rows.length < data.pageSize}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
