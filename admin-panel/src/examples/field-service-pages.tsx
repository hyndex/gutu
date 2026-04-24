import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Calendar, type CalendarEvent } from "@/admin-primitives/Calendar";
import { MetricGrid } from "@/admin-primitives/MetricGrid";
import { Card, CardContent } from "@/admin-primitives/Card";
import { code, daysAgo, pick, CITIES, personName } from "./_factory/seeds";

function fieldServiceEvents(): CalendarEvent[] {
  return Array.from({ length: 18 }, (_, i) => ({
    id: code("FS", i),
    title: `${personName(i)} · ${pick(CITIES, i)}`,
    date: daysAgo(-3 + i * 1.1),
    intent: (["info", "warning", "success"] as const)[i % 3],
  }));
}

export const fieldServiceCalendarView = defineCustomView({
  id: "field-service.calendar.view",
  title: "Calendar",
  description: "Scheduled visits and technician workload.",
  resource: "field-service.job",
  render: () => (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Field service schedule"
        description="Jobs dispatched across the month."
      />
      <MetricGrid
        columns={4}
        metrics={[
          { label: "Jobs today", value: "4" },
          { label: "Technicians", value: "12" },
          { label: "On-time %", value: "94%", trend: { value: 2, positive: true } },
          { label: "Avg response", value: "3h 12m" },
        ]}
      />
      <Card>
        <CardContent className="pt-4">
          <Calendar events={fieldServiceEvents()} />
        </CardContent>
      </Card>
    </div>
  ),
});
