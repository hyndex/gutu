import * as React from "react";
import { cn } from "@/lib/cn";

export function Toolbar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap",
        className,
      )}
      role="toolbar"
      {...props}
    >
      {children}
    </div>
  );
}

export function ToolbarSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 w-px bg-border mx-1", className)}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
