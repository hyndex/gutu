import * as React from "react";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";

export interface TimelineItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  occurredAt: string | Date;
  icon?: React.ReactNode;
  intent?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
}

const INTENT_DOT: Record<string, string> = {
  neutral: "bg-surface-3",
  accent: "bg-accent",
  success: "bg-intent-success",
  warning: "bg-intent-warning",
  danger: "bg-intent-danger",
  info: "bg-intent-info",
};

export function Timeline({
  items,
  className,
}: {
  items: readonly TimelineItem[];
  className?: string;
}) {
  return (
    <ol className={cn("relative flex flex-col gap-3 pl-5", className)}>
      <span
        className="absolute left-2 top-1 bottom-1 w-px bg-border"
        aria-hidden
      />
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span
            className={cn(
              "absolute -left-3.5 top-1.5 h-2 w-2 rounded-full ring-4 ring-surface-0",
              INTENT_DOT[it.intent ?? "neutral"],
            )}
            aria-hidden
          />
          <div className="flex flex-col gap-0.5">
            <div className="text-sm text-text-primary flex items-center gap-2">
              {it.icon}
              <span className="min-w-0 truncate">{it.title}</span>
              <span className="ml-auto text-xs text-text-muted shrink-0">
                {formatRelative(it.occurredAt)}
              </span>
            </div>
            {it.description && (
              <div className="text-xs text-text-muted">{it.description}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
