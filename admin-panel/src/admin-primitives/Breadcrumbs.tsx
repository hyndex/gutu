import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface Crumb {
  label: React.ReactNode;
  path?: string;
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: readonly Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-xs text-text-muted", className)}
    >
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {c.path && !isLast ? (
              <a
                href={`#${c.path}`}
                className="hover:text-text-primary transition-colors"
              >
                {c.label}
              </a>
            ) : (
              <span className={cn(isLast && "text-text-secondary")}>
                {c.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-3 w-3 opacity-50" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
