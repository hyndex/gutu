import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full bg-surface-0 border rounded-md px-2.5 py-1.5 text-sm outline-none resize-y",
        "placeholder:text-text-muted transition-colors",
        "focus:shadow-focus focus:border-accent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        invalid ? "border-intent-danger" : "border-border",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
