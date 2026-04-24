import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Calendar, type CalendarEvent } from "@/admin-primitives/Calendar";
import { MetricGrid } from "@/admin-primitives/MetricGrid";
import { Card, CardContent } from "@/admin-primitives/Card";
import { code, daysAgo, pick } from "../_factory/seeds";

function bookingEvents(): CalendarEvent[] {
  const intents = ["info", "success", "warning", "danger"] as const;
  return Array.from({ length: 22 }, (_, i) => ({
    id: code("BKG", i),
    title: `${code("BKG", i)} · ${pick(["Consult", "On-site", "Deep clean", "Training"], i)}`,
    date: daysAgo(-5 + i * 1.2),
    intent: pick(intents, i),
  }));
}

export const bookingCalendarView = defineCustomView({
  id: "booking.calendar.view",
  title: "Calendar",
  description: "All bookings on a month grid.",
  resource: "booking.booking",
  render: () => (
    <div className="flex flex-col gap-4">
      <PageHeader title="Booking calendar" description="Every booking, month-at-a-glance." />
      <MetricGrid
        columns={4}
        metrics={[
          { label: "Today", value: "6" },
          { label: "This week", value: "34" },
          { label: "This month", value: "128" },
          { label: "Utilization", value: "72%", trend: { value: 5, positive: true } },
        ]}
      />
      <Card>
        <CardContent className="pt-4">
          <Calendar events={bookingEvents()} />
        </CardContent>
      </Card>
    </div>
  ),
});
