import { cn } from "@/lib/cn";

const INTENT_CLASS: Record<string, string> = {
  neutral: "bg-surface-3",
  success: "bg-intent-success",
  warning: "bg-intent-warning",
  danger: "bg-intent-danger",
  info: "bg-intent-info",
  accent: "bg-accent",
};

export function StatusDot({
  intent = "neutral",
  pulse = false,
  className,
}: {
  intent?: "neutral" | "success" | "warning" | "danger" | "info" | "accent";
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full shrink-0",
        INTENT_CLASS[intent],
        pulse && "animate-pulse",
        className,
      )}
      aria-hidden
    />
  );
}
