import * as React from "react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/admin-primitives/Card";
import { MetricGrid } from "@/admin-primitives/MetricGrid";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { BarChart } from "@/admin-primitives/charts/BarChart";
import { Donut } from "@/admin-primitives/charts/Donut";
import { Spinner } from "@/primitives/Spinner";
import { usePosShifts } from "./_shared/live-hooks";

export const posShiftSummaryView = defineCustomView({
  id: "pos.shift-summary.view",
  title: "Shift summary",
  description: "End-of-day register totals.",
  resource: "pos.sale",
  render: () => <PosShiftSummaryPage />,
});

function PosShiftSummaryPage() {
  const { data: shifts, loading } = usePosShifts();
  if (loading && shifts.length === 0)
    return (
      <div className="py-16 flex items-center justify-center text-sm text-text-muted gap-2">
        <Spinner size={14} /> Loading…
      </div>
    );
  const s = shifts[0];
  if (!s)
    return (
      <EmptyState title="No shift recorded" description="The pos.shift resource is empty." />
    );
  const avg = s.transactions > 0 ? s.sales / s.transactions : 0;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Today's shift · ${s.terminal}`}
        description={`Operator: ${s.operator} · ${s.transactions} transactions`}
      />
      <MetricGrid
        columns={4}
        metrics={[
          { label: "Sales", value: `$${s.sales.toLocaleString()}` },
          { label: "Transactions", value: String(s.transactions) },
          { label: "Avg basket", value: `$${avg.toFixed(2)}` },
          { label: "Refunds", value: `$${s.refunds.toFixed(2)}` },
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sales by hour</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              data={s.byHour.map((h) => ({ label: `${h.hour}h`, value: h.sales }))}
              height={180}
              valueFormatter={(v) => `$${v}`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Payment mix</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Donut
              data={s.paymentMix.map((m) => ({ label: m.method, value: m.amount }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
