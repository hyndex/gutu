import * as React from "react";
import { cn } from "@/lib/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "square";
}

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
  xl: "w-14 h-14 text-base",
};

/** Palette of muted, themed backgrounds. Stable per-name via a simple hash. */
const PALETTE = [
  "bg-accent-subtle text-accent",
  "bg-intent-success-bg text-intent-success",
  "bg-intent-warning-bg text-intent-warning",
  "bg-intent-info-bg text-intent-info",
  "bg-intent-danger-bg text-intent-danger",
  "bg-surface-3 text-text-secondary",
] as const;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, name = "?", src, size = "md", shape = "circle", ...props }, ref) => {
    const sizeCls = SIZES[size];
    const shapeCls = shape === "circle" ? "rounded-full" : "rounded-md";
    const color = PALETTE[hash(name) % PALETTE.length];
    if (src) {
      return (
        <span
          ref={ref}
          className={cn(
            "inline-flex shrink-0 overflow-hidden",
            sizeCls,
            shapeCls,
            className,
          )}
          {...props}
        >
          <img src={src} alt={name} className="w-full h-full object-cover" />
        </span>
      );
    }
    return (
      <span
        ref={ref}
        aria-label={name}
        className={cn(
          "inline-flex items-center justify-center font-semibold uppercase shrink-0",
          sizeCls,
          shapeCls,
          color,
          className,
        )}
        {...props}
      >
        {initials(name)}
      </span>
    );
  },
);
Avatar.displayName = "Avatar";
