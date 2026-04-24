import * as React from "react";
import { cn } from "@/lib/cn";
import { Label } from "@/primitives/Label";

export interface FormFieldProps {
  id?: string;
  label?: React.ReactNode;
  required?: boolean;
  help?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  help,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-intent-danger mt-0.5">{error}</p>
      ) : help ? (
        <p className="text-xs text-text-muted mt-0.5">{help}</p>
      ) : null}
    </div>
  );
}
