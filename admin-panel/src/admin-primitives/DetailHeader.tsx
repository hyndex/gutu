import * as React from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/primitives/Avatar";

export interface DetailHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  avatar?: { name: string; src?: string };
  badges?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function DetailHeader({
  title,
  subtitle,
  avatar,
  badges,
  breadcrumbs,
  meta,
  actions,
  className,
}: DetailHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 pb-4 border-b border-border-subtle",
        className,
      )}
    >
      {breadcrumbs}
      <div className="flex items-start gap-4">
        {avatar && <Avatar name={avatar.name} src={avatar.src} size="xl" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-text-primary truncate">
              {title}
            </h1>
            {badges}
          </div>
          {subtitle && (
            <div className="text-sm text-text-secondary mt-0.5">{subtitle}</div>
          )}
          {meta && (
            <div className="text-xs text-text-muted mt-2 flex flex-wrap items-center gap-3">
              {meta}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </header>
  );
}
