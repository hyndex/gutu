import * as React from "react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent } from "@/admin-primitives/Card";
import { EmptyState } from "@/admin-primitives/EmptyState";
import { Sparkline } from "@/admin-primitives/charts/Sparkline";
import { Spinner } from "@/primitives/Spinner";
import { useInventoryAlerts } from "./_shared/live-hooks";

export const inventoryAlertsView = defineCustomView({
  id: "inventory.alerts.view",
  title: "Low stock",
  description: "Items below their reorder point.",
  resource: "inventory.item",
  render: () => <InventoryAlertsPage />,
});

function InventoryAlertsPage() {
  const { data: alerts, loading } = useInventoryAlerts();
  if (loading && alerts.length === 0)
    return (
      <div className="h-full w-full flex items-center justify-center gap-2 text-sm text-text-muted py-16">
        <Spinner size={14} /> Loading…
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Low-stock alerts"
        description="Items that have crossed their reorder threshold."
      />
      {alerts.length === 0 ? (
        <EmptyState
          title="No active alerts"
          description="Every SKU is above its reorder point."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
                  <th className="text-left p-3">SKU</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-right p-3">On hand</th>
                  <th className="text-right p-3">Reorder @</th>
                  <th className="text-right p-3">Days left</th>
                  <th className="text-right p-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((it) => (
                  <tr key={it.id} className="border-b border-border-subtle last:border-b-0">
                    <td className="p-3 font-mono text-xs text-text-secondary">{it.sku}</td>
                    <td className="p-3 text-text-primary">{it.name}</td>
                    <td
                      className={
                        "p-3 text-right tabular-nums font-medium " +
                        (it.severity === "high"
                          ? "text-intent-danger"
                          : it.severity === "medium"
                            ? "text-intent-warning"
                            : "text-text-secondary")
                      }
                    >
                      {it.onHand}
                    </td>
                    <td className="p-3 text-right tabular-nums text-text-muted">
                      {it.reorderPoint}
                    </td>
                    <td className="p-3 text-right tabular-nums text-text-secondary">
                      {it.daysToStockout}
                    </td>
                    <td className="p-3 text-right">
                      <Sparkline
                        data={it.trend}
                        color={
                          it.severity === "high"
                            ? "rgb(var(--intent-danger))"
                            : it.severity === "medium"
                              ? "rgb(var(--intent-warning))"
                              : "rgb(var(--text-muted))"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
