import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/primitives/Button";
import { cn } from "@/lib/cn";

export interface ErrorStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const message =
    description ??
    (error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unable to load this view.");
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-center",
        "border border-intent-danger/30 bg-intent-danger-bg/40 rounded-lg",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-intent-danger/10 text-intent-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-medium text-text-primary">{title}</div>
        <div className="text-xs text-text-muted max-w-md mt-0.5">{message}</div>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
