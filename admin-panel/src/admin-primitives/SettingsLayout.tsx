import * as React from "react";
import { cn } from "@/lib/cn";
import { NavIcon } from "@/shell/NavIcon";

export interface SettingsSection {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  render: () => React.ReactNode;
}

export interface SettingsLayoutProps {
  sections: readonly SettingsSection[];
  defaultSection?: string;
  className?: string;
}

export function SettingsLayout({
  sections,
  defaultSection,
  className,
}: SettingsLayoutProps) {
  const [active, setActive] = React.useState(
    defaultSection ?? sections[0]?.id ?? "",
  );
  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div
      className={cn(
        "grid gap-6 grid-cols-1 lg:grid-cols-[220px_1fr]",
        className,
      )}
    >
      <aside className="flex flex-col gap-0.5">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
              s.id === active
                ? "bg-accent-subtle text-accent font-medium"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2",
            )}
          >
            <NavIcon name={s.icon} className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{s.label}</span>
          </button>
        ))}
      </aside>
      <section className="min-w-0">
        {current && (
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              {current.label}
            </h2>
            {current.description && (
              <p className="text-sm text-text-muted mt-0.5">
                {current.description}
              </p>
            )}
          </header>
        )}
        {current?.render()}
      </section>
    </div>
  );
}
