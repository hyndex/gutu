import * as React from "react";
import { cn } from "@/lib/cn";
import { Avatar, type AvatarProps } from "./Avatar";

export interface AvatarGroupProps {
  names: readonly string[];
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

export function AvatarGroup({ names, max = 4, size = "sm", className }: AvatarGroupProps) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className={cn("inline-flex items-center -space-x-1.5", className)}>
      {shown.map((n, i) => (
        <Avatar
          key={i}
          name={n}
          size={size}
          className="ring-2 ring-surface-0"
        />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full ring-2 ring-surface-0",
            "bg-surface-3 text-text-secondary font-semibold",
            size === "xs" && "w-5 h-5 text-[9px]",
            size === "sm" && "w-6 h-6 text-[10px]",
            size === "md" && "w-8 h-8 text-xs",
            size === "lg" && "w-10 h-10 text-sm",
            size === "xl" && "w-14 h-14 text-base",
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
