import * as React from "react";
import { ChevronRight } from "lucide-react";
import * as Icons from "lucide-react";
import { Card, CardContent } from "../Card";
import { useAggregation } from "@/runtime/useAggregation";
import { formatValue } from "./formatters";
import { cn } from "@/lib/cn";
import type { ShortcutCardWidget as ShortcutSpec } from "@/contracts/widgets";

function Icon({ name }: { name?: string }) {
  if (!name) return null;
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!C) return null;
  return <C className="h-4 w-4 text-text-muted" />;
}

export function ShortcutCardWidget({ widget }: { widget: ShortcutSpec }) {
  const { data } = useAggregation(widget.aggregation ?? null);
  const showStat = Boolean(widget.aggregation);

  return (
    <Card
      className="h-full cursor-pointer hover:border-accent/50 transition-colors"
      onClick={() => (window.location.hash = widget.href)}
    >
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start gap-2">
          <Icon name={widget.icon} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">
              {widget.label}
            </div>
            {widget.description && (
              <div className="text-xs text-text-muted mt-0.5 line-clamp-2">
                {widget.description}
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted" />
        </div>
        {showStat && data && (
          <div
            className={cn(
              "text-lg font-semibold tabular-nums text-text-primary",
              widget.intent === "danger" && "text-intent-danger",
              widget.intent === "warning" && "text-intent-warning",
              widget.intent === "success" && "text-intent-success",
            )}
          >
            {formatValue(data.value, "compact")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
