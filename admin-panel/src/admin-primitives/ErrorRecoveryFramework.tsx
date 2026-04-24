import * as React from "react";
import { AlertTriangle, Copy, LifeBuoy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/primitives/Button";

export interface ErrorRecoveryFrameworkProps {
  /** Human-readable message. Required — never show a raw code without context. */
  message: React.ReactNode;
  /** Internal error code (e.g. "ERR_PAYMENTS_TIMEOUT"). */
  code?: string;
  /** Request ID from the API for support to trace. */
  requestId?: string;
  /** Primary recovery action — retry the failing operation. */
  onRetry?: () => void;
  /** Report the error (opens ticket form, support drawer, etc.). */
  onReport?: () => void;
  /** Contact / notify the record owner. */
  onContactOwner?: () => void;
  /** Hard reload fallback. */
  onReload?: () => void;
  className?: string;
}

export function ErrorRecoveryFramework({
  message,
  code,
  requestId,
  onRetry,
  onReport,
  onContactOwner,
  onReload,
  className,
}: ErrorRecoveryFrameworkProps) {
  const [copied, setCopied] = React.useState(false);

  const copyRequestId = async () => {
    if (!requestId) return;
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-4 py-10 px-6 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-intent-danger-bg text-intent-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="max-w-md">
        <div className="text-sm font-medium text-text-primary">{message}</div>
        {(code || requestId) && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-mono text-text-muted">
            {code && <code className="bg-surface-2 rounded px-1.5 py-0.5">{code}</code>}
            {requestId && (
              <button
                type="button"
                onClick={copyRequestId}
                className="inline-flex items-center gap-1 hover:text-text-primary transition-colors"
                aria-label="Copy request ID"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : requestId}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button
            variant="primary"
            size="sm"
            onClick={onRetry}
            iconLeft={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Retry
          </Button>
        )}
        {onReport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReport}
            iconLeft={<LifeBuoy className="h-3.5 w-3.5" />}
          >
            Report
          </Button>
        )}
        {onContactOwner && (
          <Button variant="ghost" size="sm" onClick={onContactOwner}>
            Contact owner
          </Button>
        )}
        {onReload && (
          <Button variant="ghost" size="sm" onClick={onReload}>
            Reload page
          </Button>
        )}
      </div>
    </div>
  );
}
