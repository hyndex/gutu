import { defineUiSurface } from "@platform/ui-shell";

import { BookingReservationsAdminPage } from "./admin/main.page";

export const uiSurface = defineUiSurface({
  embeddedPages: [
    {
      shell: "admin",
      route: "/admin/booking-reservations",
      component: BookingReservationsAdminPage,
      permission: "booking.reservations.read"
    }
  ],
  widgets: []
});
