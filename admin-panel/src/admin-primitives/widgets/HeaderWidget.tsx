import * as React from "react";
import { cn } from "@/lib/cn";
import type { HeaderWidget as HeaderSpec } from "@/contracts/widgets";

export function HeaderWidget({ widget }: { widget: HeaderSpec }) {
  const level = widget.level ?? 2;
  const Tag = (`h${level + 1}` as unknown) as keyof React.JSX.IntrinsicElements;
  return (
    <div className="flex flex-col gap-0.5">
      <Tag
        className={cn(
          "text-text-primary font-semibold tracking-tight",
          level === 1 && "text-lg",
          level === 2 && "text-sm uppercase tracking-wider text-text-muted font-medium",
          level === 3 && "text-xs uppercase tracking-wider text-text-muted",
        )}
      >
        {widget.label}
      </Tag>
      {widget.description && (
        <p className="text-sm text-text-muted">{widget.description}</p>
      )}
    </div>
  );
}
