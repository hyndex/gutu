import * as React from "react";
import { cn } from "@/lib/cn";

export interface QuickFilter {
  id: string;
  label: string;
  count?: number;
}

/** Pill-style quick-filter strip — for top-of-list filters like
 *  "All · Active · Archived · Mine". */
export function QuickFilterBar({
  filters,
  active,
  onChange,
  className,
}: {
  filters: readonly QuickFilter[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 p-1 rounded-md bg-surface-2", className)}>
      {filters.map((f) => {
        const isActive = f.id === active;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-sm font-medium transition-colors",
              isActive
                ? "bg-surface-0 text-text-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {f.label}
            {f.count !== undefined && (
              <span
                className={cn(
                  "tabular-nums text-xs",
                  isActive ? "text-text-muted" : "text-text-muted",
                )}
              >
                {f.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
