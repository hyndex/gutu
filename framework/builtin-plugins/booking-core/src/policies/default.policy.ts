import { definePolicy } from "@platform/permissions";

export const bookingPolicy = definePolicy({
  id: "booking-core.default",
  rules: [
    {
      permission: "booking.reservations.read",
      allowIf: ["role:admin", "role:operator", "role:portal-member"]
    },
    {
      permission: "booking.reservations.stage",
      allowIf: ["role:admin", "role:operator"],
      requireReason: true,
      audit: true
    },
    {
      permission: "booking.reservations.confirm",
      allowIf: ["role:admin", "role:operator"],
      requireReason: true,
      audit: true
    },
    {
      permission: "booking.reservations.cancel",
      allowIf: ["role:admin", "role:operator"],
      requireReason: true,
      audit: true
    }
  ]
});
