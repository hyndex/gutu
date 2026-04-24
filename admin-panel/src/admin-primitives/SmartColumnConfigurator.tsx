import * as React from "react";
import { Columns3, GripVertical, Pin, PinOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/primitives/Popover";
import { Button } from "@/primitives/Button";
import { Checkbox } from "@/primitives/Checkbox";
import { cn } from "@/lib/cn";

export interface ColumnOption {
  field: string;
  label: string;
  pinnable?: boolean;
  required?: boolean;
}

export interface ColumnConfig {
  field: string;
  visible: boolean;
  pinned?: "left" | "right" | null;
}

export interface SmartColumnConfiguratorProps {
  columns: readonly ColumnOption[];
  value: readonly ColumnConfig[];
  onChange: (next: ColumnConfig[]) => void;
  onReset?: () => void;
  className?: string;
}

export function SmartColumnConfigurator({
  columns,
  value,
  onChange,
  onReset,
  className,
}: SmartColumnConfiguratorProps) {
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  const toggle = (field: string, visible: boolean) => {
    const next = value.map((c) => (c.field === field ? { ...c, visible } : c));
    onChange(next);
  };

  const togglePin = (field: string) => {
    const next = value.map((c) =>
      c.field === field ? { ...c, pinned: c.pinned === "left" ? null : "left" } : c,
    );
    onChange(next as ColumnConfig[]);
  };

  const onDragStart = (idx: number) => setDragIndex(idx);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) return;
    const next = [...value];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    setDragIndex(null);
  };

  const visibleCount = value.filter((c) => c.visible).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Columns3 className="h-3.5 w-3.5" />}
          className={className}
          aria-label="Configure columns"
        >
          Columns
          <span className="ml-1 text-xs text-text-muted tabular-nums">
            {visibleCount}/{value.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Columns
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Reset
            </button>
          )}
        </div>
        <ul
          className="max-h-80 overflow-y-auto py-1"
          role="listbox"
          aria-label="Columns"
        >
          {value.map((cfg, idx) => {
            const def = columns.find((c) => c.field === cfg.field);
            if (!def) return null;
            return (
              <li
                key={cfg.field}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(idx)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 hover:bg-surface-1 cursor-grab active:cursor-grabbing group",
                  dragIndex === idx && "opacity-50",
                )}
              >
                <GripVertical className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                <Checkbox
                  checked={cfg.visible}
                  disabled={def.required}
                  onCheckedChange={(v) => toggle(cfg.field, Boolean(v))}
                  aria-label={`Toggle ${def.label}`}
                />
                <span className="flex-1 text-sm text-text-primary truncate">
                  {def.label}
                </span>
                {def.pinnable && (
                  <button
                    type="button"
                    onClick={() => togglePin(cfg.field)}
                    className={cn(
                      "h-6 w-6 flex items-center justify-center rounded hover:bg-surface-2",
                      cfg.pinned ? "text-accent" : "text-text-muted",
                    )}
                    aria-label={cfg.pinned ? "Unpin column" : "Pin column"}
                  >
                    {cfg.pinned ? (
                      <Pin className="h-3.5 w-3.5" />
                    ) : (
                      <PinOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
