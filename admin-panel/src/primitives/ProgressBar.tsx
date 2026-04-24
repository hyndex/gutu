import * as React from "react";
import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  intent?: "accent" | "success" | "warning" | "danger" | "info" | "neutral";
  size?: "xs" | "sm" | "md";
  className?: string;
  showLabel?: boolean;
  label?: React.ReactNode;
}

const INTENT_BG: Record<NonNullable<ProgressBarProps["intent"]>, string> = {
  accent: "bg-accent",
  success: "bg-intent-success",
  warning: "bg-intent-warning",
  danger: "bg-intent-danger",
  info: "bg-intent-info",
  neutral: "bg-text-muted",
};

export function ProgressBar({
  value,
  max = 100,
  intent = "accent",
  size = "sm",
  className,
  showLabel,
  label,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 min-w-0 bg-surface-2 rounded-full overflow-hidden",
          size === "xs" && "h-1",
          size === "sm" && "h-1.5",
          size === "md" && "h-2",
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-base", INTENT_BG[intent])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text-secondary shrink-0 tabular-nums w-10 text-right">
          {label ?? `${Math.round(pct)}%`}
        </span>
      )}
    </div>
  );
}
