import * as React from "react";
import * as Icons from "lucide-react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent } from "@/admin-primitives/Card";
import { ReportBuilder } from "@/admin-primitives/ReportBuilder";
import { EmptyStateFramework } from "@/admin-primitives/EmptyStateFramework";
import { useHash } from "@/views/useRoute";
import type { ReportDefinition } from "@/contracts/widgets";
import type { CustomView } from "@/contracts/views";

function Icon({ name }: { name?: string }) {
  if (!name) return null;
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!C) return null;
  return <C className="h-4 w-4 text-accent" />;
}

/** Build a reports-library index + detail pair for any plugin.
 *  Returns [indexView, detailView] — register both in the plugin.
 *  Paths: /<basePath> for the index and /<basePath>/:id for detail. */
export function buildReportLibrary(args: {
  indexViewId: string;
  detailViewId: string;
  resource: string;
  title: string;
  description?: string;
  basePath: string;
  reports: readonly ReportDefinition[];
}): { indexView: CustomView; detailView: CustomView } {
  const indexView = defineCustomView({
    id: args.indexViewId,
    title: args.title,
    description: args.description,
    resource: args.resource,
    render: () => (
      <div className="flex flex-col gap-4">
        <PageHeader title={args.title} description={args.description} />
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {args.reports.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:border-accent/60 transition-colors"
              onClick={() => (window.location.hash = `${args.basePath}/${r.id}`)}
            >
              <CardContent className="py-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-md bg-accent-subtle flex items-center justify-center shrink-0">
                  <Icon name={r.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{r.label}</div>
                  {r.description && (
                    <div className="text-xs text-text-muted mt-0.5 line-clamp-2">{r.description}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),
  });

  const detailView = defineCustomView({
    id: args.detailViewId,
    title: `${args.title} — report`,
    description: "Live report — filterable, exportable.",
    resource: args.resource,
    render: () => {
      const hash = useHash();
      const escaped = args.basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = hash.match(new RegExp(`^${escaped}/([^/?]+)`));
      const id = match?.[1];
      const report = id ? args.reports.find((r) => r.id === id) : undefined;
      if (!report) {
        return (
          <EmptyStateFramework
            kind="no-results"
            title="Report not found"
            description={`No report with id "${id}".`}
            primary={{ label: "Back to reports", href: args.basePath }}
          />
        );
      }
      return <ReportBuilder definition={report} />;
    },
  });

  return { indexView, detailView };
}
