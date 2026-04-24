import * as React from "react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { MetricGrid } from "@/admin-primitives/MetricGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/admin-primitives/Card";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { LineChart } from "@/admin-primitives/charts/LineChart";
import { Donut } from "@/admin-primitives/charts/Donut";
import { Spinner } from "@/primitives/Spinner";
import {
  useAnalyticsArr,
  useAnalyticsCohorts,
  useAnalyticsRevenueMix,
} from "./_shared/live-hooks";

export const analyticsDashboardView = defineCustomView({
  id: "analytics-bi.dashboard.view",
  title: "Executive dashboard",
  description: "Cross-plugin KPIs at a glance.",
  resource: "analytics-bi.report",
  render: () => <ExecutiveDashboard />,
});

function ExecutiveDashboard() {
  const { data: arrRows, loading: arrLoading } = useAnalyticsArr();
  const { data: mix } = useAnalyticsRevenueMix();
  const { data: cohorts } = useAnalyticsCohorts();

  if (arrLoading && arrRows.length === 0) return <PendingShell />;
  const arr = arrRows[0];
  const months = arr?.series.map((s) => s.x) ?? [];
  const arrSeries = arr?.series.map((s) => s.y / 1000) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Executive dashboard"
        description="Composed from multiple plugins."
      />
      <MetricGrid
        columns={5}
        metrics={[
          {
            label: "ARR",
            value: arr ? `$${(arr.latest / 1_000_000).toFixed(2)}M` : "—",
            trend: arr
              ? { value: arr.yoyPct, positive: arr.yoyPct >= 0, label: "yoy" }
              : undefined,
          },
          { label: "Net retention", value: "112%", trend: { value: 3, positive: true } },
          { label: "CAC payback", value: "8.2 mo" },
          { label: "Gross margin", value: "76%" },
          { label: "Burn", value: "$42K/mo", trend: { value: 6, positive: false } },
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>ARR trajectory</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {months.length > 0 ? (
              <LineChart
                xLabels={months}
                series={[{ label: "ARR", data: arrSeries }]}
                valueFormatter={(v) => `$${Math.round(v)}K`}
                height={220}
              />
            ) : (
              <EmptyState title="No ARR data" description="Seed the analytics.arr resource." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Revenue mix</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {mix.length > 0 ? (
              <Donut
                data={mix.map((m) => ({ label: m.segment, value: Math.round(m.value / 1000) }))}
              />
            ) : (
              <EmptyState title="No mix data" />
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cohort retention (monthly)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {cohorts.length === 0 ? (
            <EmptyState title="No cohort data" />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted">
                  <th className="text-left pl-2">Cohort</th>
                  {[0, 1, 2, 3, 4, 5].map((m) => (
                    <th key={m} className="text-right pr-2">M{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.id} className="border-t border-border-subtle">
                    <td className="py-1.5 pl-2 text-text-secondary font-medium">{c.cohort}</td>
                    {[0, 1, 2, 3, 4, 5].map((m) => {
                      const cell = c.monthly.find((x) => x.monthOffset === m);
                      if (!cell) return <td key={m} className="pr-2" aria-hidden></td>;
                      const intensity = (cell.retentionPct - 50) / 50;
                      return (
                        <td
                          key={m}
                          className="pr-2 py-1.5 text-right tabular-nums"
                          style={{
                            background: `rgba(79, 70, 229, ${0.08 + intensity * 0.35})`,
                            color: intensity > 0.6 ? "white" : "rgb(var(--text-primary))",
                          }}
                        >
                          {cell.retentionPct}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PendingShell() {
  return (
    <div className="h-full w-full flex items-center justify-center gap-2 text-sm text-text-muted py-16">
      <Spinner size={14} />
      Loading…
    </div>
  );
}
