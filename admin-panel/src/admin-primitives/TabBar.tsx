import * as React from "react";
import { cn } from "@/lib/cn";

export interface TabBarTab {
  id: string;
  label: React.ReactNode;
  count?: number;
}

export function TabBar({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: readonly TabBarTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center h-9 border-b border-border gap-1",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors outline-none",
              "focus-visible:shadow-focus rounded-md",
              isActive
                ? "text-text-primary"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium tabular-nums",
                  isActive
                    ? "bg-accent text-accent-fg"
                    : "bg-surface-2 text-text-secondary",
                )}
              >
                {t.count}
              </span>
            )}
            {isActive && (
              <span
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
