import * as React from "react";
import { Bell, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/primitives/Popover";
import { Badge } from "@/primitives/Badge";
import { Button } from "@/primitives/Button";
import { cn } from "@/lib/cn";

export interface Alert {
  id: string;
  title: string;
  body?: string;
  intent: "info" | "warning" | "danger" | "success";
  createdAt: string;
  acked?: boolean;
  snoozedUntil?: string;
  source?: string;
  href?: string;
}

export interface AlertCenterProps {
  alerts: readonly Alert[];
  onAck: (id: string) => void;
  onSnooze?: (id: string, minutes: number) => void;
  onDismiss?: (id: string) => void;
  onOpen?: (alert: Alert) => void;
  className?: string;
}

function intentClass(intent: Alert["intent"]): string {
  switch (intent) {
    case "danger":
      return "text-intent-danger bg-intent-danger-bg";
    case "warning":
      return "text-intent-warning bg-intent-warning-bg";
    case "success":
      return "text-intent-success bg-intent-success-bg";
    default:
      return "text-intent-info bg-intent-info-bg";
  }
}

export function AlertCenter({
  alerts,
  onAck,
  onSnooze,
  onDismiss,
  onOpen,
  className,
}: AlertCenterProps) {
  const now = Date.now();
  const active = alerts.filter((a) => {
    if (a.acked) return false;
    if (a.snoozedUntil && Date.parse(a.snoozedUntil) > now) return false;
    return true;
  });
  const unackedCount = active.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Alerts (${unackedCount} unread)`}
          className={cn(
            "relative h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-surface-2 text-text-muted",
            className,
          )}
        >
          <Bell className="h-4 w-4" />
          {unackedCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 rounded-full bg-intent-danger text-white text-[10px] font-semibold inline-flex items-center justify-center leading-none tabular-nums">
              {unackedCount > 99 ? "99+" : unackedCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Alerts
          </div>
          <span className="text-xs text-text-muted tabular-nums">
            {unackedCount} active
          </span>
        </div>
        <ul className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
          {active.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-text-muted">
              All clear.
            </li>
          ) : (
            active.map((a) => (
              <li key={a.id} className="px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                      intentClass(a.intent),
                    )}
                  >
                    <Bell className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpen?.(a)}
                      className="text-sm font-medium text-text-primary text-left hover:underline"
                    >
                      {a.title}
                    </button>
                    {a.body && (
                      <div className="text-xs text-text-secondary mt-0.5">{a.body}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-text-muted">
                        {new Date(a.createdAt).toLocaleTimeString()}
                      </span>
                      {a.source && (
                        <Badge intent={a.intent === "danger" ? "danger" : "info"}>
                          {a.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Check className="h-3 w-3" />}
                    onClick={() => onAck(a.id)}
                  >
                    Acknowledge
                  </Button>
                  {onSnooze && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSnooze(a.id, 60)}
                    >
                      Snooze 1h
                    </Button>
                  )}
                  {onDismiss && (
                    <button
                      type="button"
                      onClick={() => onDismiss(a.id)}
                      className="ml-auto h-6 w-6 flex items-center justify-center rounded hover:bg-surface-2 text-text-muted"
                      aria-label="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
