import * as React from "react";
import { cn } from "@/lib/cn";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export interface KPIProps {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  trend?: { value: number; label?: string; positive?: boolean };
  className?: string;
}

export function KPI({ label, value, helper, trend, className }: KPIProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-0 p-4 flex flex-col gap-1",
        className,
      )}
    >
      <div className="text-xs font-medium text-text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl font-semibold text-text-primary leading-none">
        {value}
      </div>
      {(helper || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                trend.positive
                  ? "text-intent-success"
                  : "text-intent-danger",
              )}
            >
              {trend.positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
              {trend.label && (
                <span className="text-text-muted font-normal ml-1">
                  {trend.label}
                </span>
              )}
            </span>
          )}
          {helper && <span className="text-xs text-text-muted">{helper}</span>}
        </div>
      )}
    </div>
  );
}
