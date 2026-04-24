import * as React from "react";
import { CHART_PALETTE } from "./_helpers";
import { cn } from "@/lib/cn";

export interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

export function Funnel({
  data,
  className,
  valueFormatter = (v) => v.toLocaleString(),
}: {
  data: readonly FunnelStage[];
  className?: string;
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const prevPct = i === 0 ? 100 : (data[i - 1].value / max) * 100;
        const conversion = i === 0 ? null : d.value / data[i - 1].value;
        return (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-32 shrink-0 text-text-secondary truncate">
              {d.label}
            </div>
            <div className="flex-1 min-w-0 relative">
              <div className="w-full h-7 bg-surface-2 rounded-md overflow-hidden">
                <div
                  className="h-full transition-all duration-base flex items-center px-2 text-xs font-medium"
                  style={{
                    width: `${pct}%`,
                    background:
                      d.color ?? CHART_PALETTE[i % CHART_PALETTE.length],
                    color: "white",
                  }}
                >
                  {valueFormatter(d.value)}
                </div>
              </div>
            </div>
            <div className="w-16 shrink-0 text-right text-xs text-text-muted tabular-nums">
              {conversion != null
                ? `${Math.round(conversion * 100)}%`
                : `${Math.round(prevPct)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
