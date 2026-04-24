import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import * as Icons from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { useAggregation } from "@/runtime/useAggregation";
import type {
  ConnectionCategory,
  ConnectionDescriptor,
  ConnectionItem,
} from "@/contracts/widgets";
import { cn } from "@/lib/cn";

export interface ConnectionsPanelProps {
  descriptor: ConnectionDescriptor;
  parent: Record<string, unknown>;
  title?: string;
  className?: string;
}

function Icon({ name }: { name?: string }) {
  if (!name) return null;
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!C) return null;
  return <C className="h-3.5 w-3.5 text-text-muted" />;
}

export function ConnectionsPanel({
  descriptor,
  parent,
  title = "Connections",
  className,
}: ConnectionsPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {descriptor.categories.length === 0 ? (
          <div className="px-3 py-4 text-xs text-text-muted">
            No connections defined.
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {descriptor.categories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} parent={parent} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryRow({
  category,
  parent,
}: {
  category: ConnectionCategory;
  parent: Record<string, unknown>;
}) {
  return (
    <li className="py-2">
      <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {category.label}
      </div>
      <ul>
        {category.items.map((item) => (
          <ConnectionRow key={item.id} item={item} parent={parent} />
        ))}
      </ul>
    </li>
  );
}

function ConnectionRow({
  item,
  parent,
}: {
  item: ConnectionItem;
  parent: Record<string, unknown>;
}) {
  const filter = React.useMemo(() => item.filter(parent), [item, parent]);
  const { data, loading } = useAggregation({
    resource: item.resource,
    fn: "count",
    filter,
  });
  const href = item.href?.(parent);

  const inner = (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 group",
        href && "hover:bg-surface-1 cursor-pointer",
      )}
    >
      <Icon name={item.icon} />
      <span className="flex-1 text-sm text-text-primary truncate">
        {item.label}
      </span>
      <span className="text-xs tabular-nums text-text-muted min-w-[2ch] text-right">
        {loading && !data ? "…" : data?.count ?? 0}
      </span>
      {href && (
        <ArrowUpRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );

  return (
    <li>
      {href ? (
        <a href={`#${href}`} className="block">
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}
