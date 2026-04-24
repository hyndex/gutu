import * as React from "react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent } from "@/admin-primitives/Card";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { Badge } from "@/primitives/Badge";
import { Spinner } from "@/primitives/Spinner";
import { useAutomationSteps } from "./_shared/live-hooks";

export const automationRunDetailView = defineCustomView({
  id: "automation.run-detail.view",
  title: "Run detail",
  description: "Trace through a single automation execution.",
  resource: "automation.run",
  render: () => <AutomationRunDetailPage />,
});

function AutomationRunDetailPage() {
  const { data: steps, loading } = useAutomationSteps();
  if (loading && steps.length === 0)
    return (
      <div className="py-16 flex items-center justify-center text-sm text-text-muted gap-2">
        <Spinner size={14} /> Loading…
      </div>
    );
  const runId = steps[0]?.runId;
  const scoped = steps.filter((s) => s.runId === runId).sort((a, b) => a.order - b.order);
  const total = scoped.reduce((a, s) => a + s.durationMs, 0);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={runId ? `${runId} · Send invoice reminder` : "Run detail"}
        description={
          scoped.length > 0
            ? `Completed ${(total / 1000).toFixed(1)}s · ${scoped.length} steps`
            : "No step data"
        }
      />
      <Card>
        <CardContent className="p-0">
          {scoped.length === 0 ? (
            <EmptyState title="No steps recorded" />
          ) : (
            <ol className="divide-y divide-border-subtle">
              {scoped.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-3">
                  <div
                    className={
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold " +
                      (s.ok
                        ? "bg-intent-success-bg text-intent-success"
                        : "bg-intent-danger-bg text-intent-danger")
                    }
                  >
                    {s.order + 1}
                  </div>
                  <div className="flex-1 text-sm text-text-primary">{s.step}</div>
                  <div className="text-xs text-text-muted tabular-nums">{s.durationMs}ms</div>
                  <Badge intent={s.ok ? "success" : "danger"}>{s.ok ? "ok" : "failed"}</Badge>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
