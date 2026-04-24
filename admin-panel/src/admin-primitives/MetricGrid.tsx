import * as React from "react";
import { cn } from "@/lib/cn";
import { KPI, type KPIProps } from "./KPI";

export interface MetricGridProps {
  metrics: readonly KPIProps[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function MetricGrid({ metrics, columns = 4, className }: MetricGridProps) {
  const gridCols =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : columns === 4
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : columns === 5
            ? "grid-cols-1 sm:grid-cols-3 lg:grid-cols-5"
            : "grid-cols-1 sm:grid-cols-3 lg:grid-cols-6";
  return (
    <div className={cn("grid gap-3", gridCols, className)}>
      {metrics.map((m, i) => (
        <KPI key={i} {...m} />
      ))}
    </div>
  );
}
