import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  invalid?: boolean;
  /** Left-side adornment (icon, symbol). Rendered inside the input frame. */
  prefix?: React.ReactNode;
  /** Right-side adornment. */
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, prefix, suffix, ...props }, ref) => {
    if (prefix || suffix) {
      return (
        <div
          className={cn(
            "flex items-stretch bg-surface-0 border rounded-md transition-colors",
            "focus-within:shadow-focus focus-within:border-accent",
            invalid ? "border-intent-danger" : "border-border",
          )}
        >
          {prefix && (
            <span className="flex items-center pl-2 text-text-muted">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "flex-1 min-w-0 bg-transparent h-field-h px-2.5 text-sm outline-none",
              "placeholder:text-text-muted",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className,
            )}
            aria-invalid={invalid || undefined}
            {...props}
          />
          {suffix && (
            <span className="flex items-center pr-2 text-text-muted">
              {suffix}
            </span>
          )}
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-surface-0 border rounded-md h-field-h px-2.5 text-sm outline-none",
          "placeholder:text-text-muted transition-colors",
          "focus:shadow-focus focus:border-accent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          invalid ? "border-intent-danger" : "border-border",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
