import * as React from "react";
import { cn } from "@/lib/cn";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div>
        <div className="text-sm font-medium text-text-primary">{title}</div>
        {description && (
          <div className="text-sm text-text-muted mt-0.5 max-w-sm">
            {description}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
