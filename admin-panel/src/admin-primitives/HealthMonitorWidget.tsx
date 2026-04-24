import * as React from "react";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { StatusDot } from "./StatusDot";
import { Sparkline } from "./charts/Sparkline";
import { cn } from "@/lib/cn";

export interface HealthSeries {
  label: string;
  /** Values in time order. */
  data: number[];
  /** Formatter for the latest value in the header. */
  format?: (v: number) => string;
  /** Thresholds: value ≥ warn triggers amber, ≥ danger triggers red.
   *  If your metric is "lower is better" (latency/error rate), pass
   *  values directly; for "higher is better" (uptime), invert the axis. */
  warn?: number;
  danger?: number;
  invert?: boolean;
}

export interface HealthMonitorWidgetProps {
  title: string;
  windowLabel?: string;
  series: readonly HealthSeries[];
  className?: string;
}

function classifyIntent(
  latest: number,
  warn?: number,
  danger?: number,
  invert?: boolean,
): "success" | "warning" | "danger" | "neutral" {
  if (warn === undefined && danger === undefined) return "success";
  const isAbove = (a: number, b?: number) =>
    b !== undefined && (invert ? a <= b : a >= b);
  if (isAbove(latest, danger)) return "danger";
  if (isAbove(latest, warn)) return "warning";
  return "success";
}

export function HealthMonitorWidget({
  title,
  windowLabel = "last 60 min",
  series,
  className,
}: HealthMonitorWidgetProps) {
  const overall = React.useMemo<"success" | "warning" | "danger" | "neutral">(() => {
    const intents = series.map((s) => {
      const latest = s.data[s.data.length - 1] ?? 0;
      return classifyIntent(latest, s.warn, s.danger, s.invert);
    });
    if (intents.includes("danger")) return "danger";
    if (intents.includes("warning")) return "warning";
    return "success";
  }, [series]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-text-muted" />
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <StatusDot intent={overall} />
            <span>{windowLabel}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border-subtle">
          {series.map((s) => {
            const latest = s.data[s.data.length - 1] ?? 0;
            const intent = classifyIntent(latest, s.warn, s.danger, s.invert);
            return (
              <li
                key={s.label}
                className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
              >
                <StatusDot intent={intent} />
                <span className="flex-1 text-sm text-text-primary">{s.label}</span>
                <Sparkline
                  data={s.data}
                  color={
                    intent === "danger"
                      ? "rgb(var(--intent-danger))"
                      : intent === "warning"
                        ? "rgb(var(--intent-warning))"
                        : "rgb(var(--intent-success))"
                  }
                />
                <span
                  className={cn(
                    "text-xs tabular-nums w-20 text-right",
                    intent === "danger" && "text-intent-danger",
                    intent === "warning" && "text-intent-warning",
                    intent === "success" && "text-text-primary",
                  )}
                >
                  {s.format ? s.format(latest) : latest}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
