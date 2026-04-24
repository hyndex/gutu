import * as React from "react";
import { cn } from "@/lib/cn";
import type { Widget } from "@/contracts/widgets";
import { NumberCardWidget } from "./NumberCardWidget";
import { ChartWidget } from "./ChartWidget";
import { ShortcutCardWidget } from "./ShortcutCardWidget";
import { HeaderWidget } from "./HeaderWidget";
import { SpacerWidget } from "./SpacerWidget";
import { QuickListWidget } from "./QuickListWidget";

export function WidgetGrid({
  widgets,
  className,
}: {
  widgets: readonly Widget[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 [grid-template-columns:repeat(12,minmax(0,1fr))]",
        className,
      )}
    >
      {widgets.map((w) => (
        <div
          key={w.id}
          style={{ gridColumn: `span ${clampCol(w.col)} / span ${clampCol(w.col)}` }}
          className={cn(
            w.row === "tall" ? "row-span-2" : "row-span-1",
            "min-w-0",
          )}
        >
          <WidgetSwitch widget={w} />
        </div>
      ))}
    </div>
  );
}

function clampCol(col: number): number {
  if (!Number.isFinite(col)) return 12;
  return Math.min(12, Math.max(1, Math.round(col)));
}

function WidgetSwitch({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case "number_card": return <NumberCardWidget widget={widget} />;
    case "chart": return <ChartWidget widget={widget} />;
    case "shortcut": return <ShortcutCardWidget widget={widget} />;
    case "header": return <HeaderWidget widget={widget} />;
    case "spacer": return <SpacerWidget widget={widget} />;
    case "quick_list": return <QuickListWidget widget={widget} />;
    case "custom": return <>{widget.render()}</>;
  }
}
