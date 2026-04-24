import * as React from "react";
import {
  Inbox,
  Search as SearchIcon,
  ShieldAlert,
  Sparkles,
  WifiOff,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/primitives/Button";
import { EmptyState } from "./EmptyState";

/** Categorized empty states. Always use one of these over a raw EmptyState
 *  so behavior is consistent across the platform. */
export type EmptyKind =
  | "first-time"
  | "no-results"
  | "cleared"
  | "denied"
  | "offline"
  | "error"
  | "coming-soon";

export interface EmptyStateFrameworkProps {
  kind: EmptyKind;
  title?: React.ReactNode;
  description?: React.ReactNode;
  primary?: { label: string; onClick?: () => void; href?: string };
  secondary?: { label: string; onClick?: () => void; href?: string };
  className?: string;
  /** Optional illustration element; falls back to a kind-appropriate icon. */
  illustration?: React.ReactNode;
}

const DEFAULTS: Record<
  EmptyKind,
  { icon: React.ReactNode; title: string; description?: string }
> = {
  "first-time": {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Nothing here yet",
    description: "Create your first record to get started.",
  },
  "no-results": {
    icon: <SearchIcon className="h-6 w-6" />,
    title: "No results match",
    description: "Try removing a filter or broadening your search.",
  },
  cleared: {
    icon: <Inbox className="h-6 w-6" />,
    title: "You're all caught up",
    description: "Nothing left in this view.",
  },
  denied: {
    icon: <ShieldAlert className="h-6 w-6" />,
    title: "You don't have access",
    description: "Ask an admin to grant the required role.",
  },
  offline: {
    icon: <WifiOff className="h-6 w-6" />,
    title: "You're offline",
    description: "Showing the last cached data. Changes will sync when you reconnect.",
  },
  error: {
    icon: <Wrench className="h-6 w-6" />,
    title: "Something broke",
    description: "We couldn't load this view. Retry or contact support.",
  },
  "coming-soon": {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Coming soon",
    description: "This surface is on the roadmap.",
  },
};

export function EmptyStateFramework({
  kind,
  title,
  description,
  primary,
  secondary,
  illustration,
  className,
}: EmptyStateFrameworkProps) {
  const defaults = DEFAULTS[kind];
  return (
    <EmptyState
      icon={illustration ?? defaults.icon}
      title={title ?? defaults.title}
      description={description ?? defaults.description}
      action={
        (primary || secondary) && (
          <div className="flex items-center gap-2 mt-1">
            {primary && (
              <Button
                variant="primary"
                size="sm"
                onClick={
                  primary.href
                    ? () => (window.location.hash = primary.href!)
                    : primary.onClick
                }
              >
                {primary.label}
              </Button>
            )}
            {secondary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={
                  secondary.href
                    ? () => (window.location.hash = secondary.href!)
                    : secondary.onClick
                }
              >
                {secondary.label}
              </Button>
            )}
          </div>
        )
      }
      className={cn(className)}
    />
  );
}
