import * as React from "react";
import * as Icons from "lucide-react";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent } from "@/admin-primitives/Card";
import { ReportBuilder } from "@/admin-primitives/ReportBuilder";
import { EmptyStateFramework } from "@/admin-primitives/EmptyStateFramework";
import { useHash } from "@/views/useRoute";
import {
  REPORT_MODULES,
  findReport,
} from "./standard-reports";

function Icon({ name }: { name?: string }) {
  if (!name) return null;
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    name
  ];
  if (!C) return null;
  return <C className="h-4 w-4 text-accent" />;
}

/** Reports discovery page — lists all standard reports grouped by module.
 *  Route: /analytics/reports (custom view id: platform.reports.view) */
export function StandardReportsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        description="Standard analytical reports across every plugin. Every report reads live data and supports filters, totals, and CSV export."
      />
      {Object.entries(REPORT_MODULES).map(([module, ids]) => (
        <section key={module} className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {module}
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {ids.map((id) => {
              const r = findReport(id);
              if (!r) return null;
              return (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:border-accent/60 transition-colors"
                  onClick={() => (window.location.hash = `/reports/${r.id}`)}
                >
                  <CardContent className="py-4 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-md bg-accent-subtle flex items-center justify-center shrink-0">
                      <Icon name={r.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary">
                        {r.label}
                      </div>
                      {r.description && (
                        <div className="text-xs text-text-muted mt-0.5 line-clamp-2">
                          {r.description}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Report detail page — resolves `:id` from the route and renders the
 *  ReportBuilder for the matching ReportDefinition. */
export function StandardReportPage() {
  const hash = useHash();
  const match = hash.match(/^\/reports\/([^/?]+)/);
  const id = match?.[1];
  const report = id ? findReport(id) : undefined;

  if (!report) {
    return (
      <EmptyStateFramework
        kind="no-results"
        title="Report not found"
        description={`No standard report with id "${id}".`}
        primary={{ label: "Back to reports", href: "/analytics/reports" }}
      />
    );
  }
  return <ReportBuilder definition={report} />;
}

