import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Sparkline } from "./charts/Sparkline";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  trend?: { value: number; positive?: boolean; label?: string };
  icon?: React.ReactNode;
  spark?: readonly number[];
  sparkColor?: string;
  intent?: "neutral" | "success" | "warning" | "danger" | "info" | "accent";
  className?: string;
}

const INTENT_ACCENT: Record<NonNullable<StatCardProps["intent"]>, string> = {
  neutral: "text-text-muted",
  accent: "text-accent",
  success: "text-intent-success",
  warning: "text-intent-warning",
  danger: "text-intent-danger",
  info: "text-intent-info",
};

export function StatCard({
  label,
  value,
  secondary,
  trend,
  icon,
  spark,
  sparkColor,
  intent = "neutral",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-0 p-4 shadow-xs",
        "flex flex-col gap-2 min-w-0",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
          {icon && <span className={INTENT_ACCENT[intent]}>{icon}</span>}
          <span>{label}</span>
        </div>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              trend.positive ? "text-intent-success" : "text-intent-danger",
            )}
          >
            {trend.positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-semibold text-text-primary leading-none tabular-nums truncate">
          {value}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline
            data={spark}
            width={72}
            height={24}
            color={sparkColor}
          />
        )}
      </div>
      {(secondary || trend?.label) && (
        <div className="text-xs text-text-muted">
          {secondary} {trend?.label && <span className="ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
