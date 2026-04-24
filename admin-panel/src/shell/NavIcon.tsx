import * as React from "react";
import * as Icons from "lucide-react";

/** Resolve a lucide icon by name (string) — falls back to Box. */
export function NavIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  if (!name) return null;
  const registry = Icons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  const Cmp = registry[toPascal(name)] ?? Icons.Box;
  return <Cmp className={className} />;
}

function toPascal(s: string): string {
  return s
    .split(/[-_\s]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}
