import * as React from "react";
import { Play } from "lucide-react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/admin-primitives/Card";
import { MetricGrid } from "@/admin-primitives/MetricGrid";
import { Button } from "@/primitives/Button";
import { Badge } from "@/primitives/Badge";
import { BarChart } from "@/admin-primitives/charts/BarChart";
import { Timeline } from "@/admin-primitives/Timeline";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { Spinner } from "@/primitives/Spinner";
import { useAllRecords } from "@/runtime/hooks";

export const aiEvalsRunView = defineCustomView({
  id: "ai-evals.run-detail.view",
  title: "Run detail",
  description: "Breakdown of the latest eval run.",
  resource: "ai-evals.run",
  render: () => <AiEvalsRunDetailPage />,
});

function AiEvalsRunDetailPage() {
  const { data: runs, loading: runsLoading } = useAllRecords<{
    id: string;
    suite: string;
    model: string;
    startedAt: string;
    passRate: number;
    durationSec: number;
  }>("ai-evals.run");
  const { data: cases } = useAllRecords<{
    id: string;
    runId: string;
    name: string;
    category: string;
    pass: boolean;
    latencyMs: number;
  }>("ai-evals.case");

  if (runsLoading && runs.length === 0) {
    return (
      <div className="py-16 flex items-center justify-center text-sm text-text-muted gap-2">
        <Spinner size={14} /> Loading…
      </div>
    );
  }

  const run = runs.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0];
  if (!run) {
    return (
      <EmptyState
        title="No eval runs"
        description="Seed the ai-evals.run resource to see this page."
      />
    );
  }
  const scoped = cases.filter((c) => c.runId === run.id);
  const passed = scoped.filter((c) => c.pass).length;
  const passRate = scoped.length > 0 ? Math.round((passed / scoped.length) * 100) : run.passRate;
  const avgLatency =
    scoped.length > 0
      ? Math.round(scoped.reduce((a, c) => a + c.latencyMs, 0) / scoped.length)
      : 0;
  const failures = scoped.filter((c) => !c.pass).slice(0, 5);
  const byCategory: Record<string, { pass: number; total: number }> = {};
  for (const c of scoped) {
    const b = byCategory[c.category] ?? { pass: 0, total: 0 };
    b.total++;
    if (c.pass) b.pass++;
    byCategory[c.category] = b;
  }
  const categoryData = Object.entries(byCategory).map(([label, v]) => ({
    label,
    value: v.total > 0 ? Math.round((v.pass / v.total) * 100) : 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Run detail · ${run.suite}`}
        description={`${run.model} · ${new Date(run.startedAt).toLocaleString()} · ${Math.floor(run.durationSec / 60)}m ${run.durationSec % 60}s`}
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Play className="h-3.5 w-3.5" />}
          >
            Re-run
          </Button>
        }
      />
      <MetricGrid
        columns={4}
        metrics={[
          { label: "Pass rate", value: `${passRate}%` },
          { label: "Cases", value: String(scoped.length) },
          { label: "Avg latency", value: `${avgLatency}ms` },
          { label: "Cost", value: "$0.48" },
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>By category</CardTitle>
              <CardDescription>Pass % per eval category.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <BarChart
                data={categoryData}
                valueFormatter={(v) => `${v}%`}
                height={220}
              />
            ) : (
              <EmptyState title="No cases" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent failures</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {failures.length > 0 ? (
              <Timeline
                items={failures.map((f, i) => ({
                  id: f.id,
                  title: `${f.category}: ${f.name}`,
                  intent: "danger",
                  occurredAt: new Date(Date.now() - (i + 1) * 30 * 60_000),
                }))}
              />
            ) : (
              <EmptyState title="No failures 🎉" />
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cases</CardTitle>
            <CardDescription>{scoped.length} cases in this run.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
                <th className="text-left p-3">Case</th>
                <th className="text-left p-3">Category</th>
                <th className="text-center p-3">Result</th>
                <th className="text-right p-3">Latency</th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border-subtle last:border-b-0"
                >
                  <td className="p-3 font-mono text-xs text-text-secondary">
                    {c.name}
                  </td>
                  <td className="p-3 text-text-secondary">{c.category}</td>
                  <td className="p-3 text-center">
                    <Badge intent={c.pass ? "success" : "danger"}>
                      {c.pass ? "pass" : "fail"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right tabular-nums text-text-muted">
                    {c.latencyMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
