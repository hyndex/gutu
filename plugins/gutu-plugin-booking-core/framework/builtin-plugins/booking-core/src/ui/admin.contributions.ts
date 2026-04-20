import {
  defineAdminNav,
  defineCommand,
  definePage,
  defineSearchProvider,
  defineWorkspace,
  type AdminContributionRegistry
} from "@platform/admin-contracts";

import { BookingReservationsAdminPage } from "./admin/main.page";

export const adminContributions: Pick<
  AdminContributionRegistry,
  "workspaces" | "nav" | "pages" | "commands" | "searchProviders"
> = {
  workspaces: [
    defineWorkspace({
      id: "booking",
      label: "Booking",
      icon: "calendar-days",
      description: "Reservations, holds, and operator-safe allocation flows.",
      permission: "booking.reservations.read",
      homePath: "/admin/workspace/booking",
      quickActions: ["booking.open.reservations"]
    })
  ],
  nav: [
    defineAdminNav({
      workspace: "booking",
      group: "operations",
      items: [
        {
          id: "booking.reservations",
          label: "Reservations",
          icon: "calendar-range",
          to: "/admin/booking/reservations",
          permission: "booking.reservations.read"
        }
      ]
    })
  ],
  pages: [
    definePage({
      id: "booking.reservations.page",
      kind: "list",
      route: "/admin/booking/reservations",
      label: "Reservations",
      workspace: "booking",
      group: "operations",
      permission: "booking.reservations.read",
      component: BookingReservationsAdminPage
    })
  ],
  commands: [
    defineCommand({
      id: "booking.open.reservations",
      label: "Open Booking Reservations",
      permission: "booking.reservations.read",
      href: "/admin/booking/reservations",
      keywords: ["booking", "reservations", "holds", "calendar"]
    })
  ],
  searchProviders: [
    defineSearchProvider({
      id: "booking.search",
      scopes: ["reservations"],
      permission: "booking.reservations.read",
      search(query) {
        const items = [
          {
            id: "booking-search:reservations",
            label: "Booking Reservations",
            href: "/admin/booking/reservations",
            kind: "page" as const,
            description: "Canonical reservation windows, holds, and operator controls."
          }
        ];

        return items.filter((item) =>
          `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase())
        );
      }
    })
  ]
};
