import * as React from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/primitives/Badge";

export interface KanbanColumn<T> {
  id: string;
  title: string;
  intent?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  items: readonly T[];
}

export interface KanbanProps<T> {
  columns: readonly KanbanColumn<T>[];
  renderItem: (item: T) => React.ReactNode;
  onItemClick?: (item: T) => void;
  rowKey?: (item: T) => string;
  className?: string;
}

/** Static kanban board — groups items into columns by status.
 *  Drag-to-reorder is intentionally omitted: HTML5 DnD is fiddly and a real
 *  implementation should use dnd-kit. This renders the visual + counts. */
export function Kanban<T>({
  columns,
  renderItem,
  onItemClick,
  rowKey = (t) => String((t as { id?: unknown }).id ?? Math.random()),
  className,
}: KanbanProps<T>) {
  return (
    <div
      className={cn(
        "grid gap-3 overflow-x-auto pb-2",
        "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
        className,
      )}
      role="list"
    >
      {columns.map((col) => (
        <section
          key={col.id}
          className="flex flex-col gap-2 bg-surface-1 border border-border rounded-lg p-2 min-h-[180px]"
          aria-label={col.title}
        >
          <header className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {col.title}
              </span>
              <Badge intent={col.intent ?? "neutral"}>{col.items.length}</Badge>
            </div>
          </header>
          <div className="flex flex-col gap-2">
            {col.items.length === 0 ? (
              <div className="text-center text-xs text-text-muted py-4">
                Nothing here
              </div>
            ) : (
              col.items.map((item) => (
                <button
                  key={rowKey(item)}
                  type="button"
                  className={cn(
                    "text-left bg-surface-0 border border-border rounded-md p-2 text-sm",
                    "transition-colors hover:border-accent hover:shadow-xs",
                    "focus-visible:outline-none focus-visible:shadow-focus",
                  )}
                  onClick={() => onItemClick?.(item)}
                >
                  {renderItem(item)}
                </button>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
