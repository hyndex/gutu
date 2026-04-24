import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/primitives/Button";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string | Date;
  intent?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
}

export interface CalendarProps {
  events: readonly CalendarEvent[];
  className?: string;
  onEventClick?: (evt: CalendarEvent) => void;
}

const INTENT_CLASS: Record<string, string> = {
  neutral: "bg-surface-2 text-text-secondary",
  accent: "bg-accent-subtle text-accent",
  success: "bg-intent-success-bg text-intent-success",
  warning: "bg-intent-warning-bg text-intent-warning",
  danger: "bg-intent-danger-bg text-intent-danger",
  info: "bg-intent-info-bg text-intent-info",
};

/** Month-grid calendar — read-only, good for surfacing bookings / jobs /
 *  field-service visits. The primitive stays dumb: events come in, clicks go
 *  out. No time-zone magic. */
export function Calendar({ events, className, onEventClick }: CalendarProps) {
  const [cursor, setCursor] = React.useState(() => startOfMonth(new Date()));
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const grid = React.useMemo(() => buildMonthGrid(cursor), [cursor]);
  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const d = new Date(e.date);
      const key = ymd(d);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  return (
    <div
      className={cn("flex flex-col gap-2 bg-surface-0 border border-border rounded-lg p-3", className)}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setCursor((c) =>
                new Date(c.getFullYear(), c.getMonth() - 1, 1),
              )
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setCursor((c) =>
                new Date(c.getFullYear(), c.getMonth() + 1, 1),
              )
            }
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-[10px] font-medium uppercase text-text-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-1 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
        {grid.map((d, i) => {
          const isCur = d.getMonth() === cursor.getMonth();
          const isToday = ymd(d) === ymd(new Date());
          const items = byDay.get(ymd(d)) ?? [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-[72px] bg-surface-0 p-1.5 flex flex-col gap-0.5",
                !isCur && "bg-surface-1",
              )}
            >
              <div
                className={cn(
                  "text-[10px] font-medium",
                  isCur ? "text-text-secondary" : "text-text-muted",
                  isToday && "text-accent",
                )}
              >
                {d.getDate()}
              </div>
              {items.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onEventClick?.(e)}
                  className={cn(
                    "text-[10px] text-left truncate rounded px-1 py-0.5",
                    INTENT_CLASS[e.intent ?? "neutral"],
                    "hover:opacity-80",
                  )}
                  title={e.title}
                >
                  {e.title}
                </button>
              ))}
              {items.length > 3 && (
                <div className="text-[10px] text-text-muted">
                  +{items.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function buildMonthGrid(cursor: Date): Date[] {
  const first = startOfMonth(cursor);
  const startWeekday = first.getDay();
  const start = new Date(
    first.getFullYear(),
    first.getMonth(),
    1 - startWeekday,
  );
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
