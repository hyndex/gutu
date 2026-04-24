import * as React from "react";
import { cn } from "@/lib/cn";

export interface Property {
  label: React.ReactNode;
  value: React.ReactNode;
}

export function PropertyList({
  items,
  columns = 1,
  className,
}: {
  items: readonly Property[];
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-y-2.5 text-sm",
        columns === 2
          ? "grid-cols-[auto_minmax(0,1fr)] gap-x-6 lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]"
          : "grid-cols-[auto_minmax(0,1fr)] gap-x-6",
        className,
      )}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <dt className="text-text-muted whitespace-nowrap">{item.label}</dt>
          <dd className="text-text-primary break-words min-w-0">{item.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
