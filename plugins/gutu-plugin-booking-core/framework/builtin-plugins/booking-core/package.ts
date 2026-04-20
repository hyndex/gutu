import { definePackage } from "@platform/kernel";

export default definePackage({
  id: "booking-core",
  kind: "app",
  version: "0.1.0",
  displayName: "Booking Core",
  description: "Reservations, booking holds, and conflict-safe resource allocation flows.",
  extends: [],
  dependsOn: ["auth-core", "org-tenant-core", "role-policy-core", "audit-core", "portal-core"],
  optionalWith: [],
  conflictsWith: [],
  providesCapabilities: ["booking.reservations"],
  requestedCapabilities: ["ui.register.admin", "api.rest.mount", "data.write.booking"],
  ownsData: ["booking.reservations"],
  extendsData: [],
  slotClaims: [],
  trustTier: "first-party",
  reviewTier: "R1",
  isolationProfile: "same-process-trusted",
  compatibility: {
    framework: "^0.1.0",
    runtime: "bun>=1.3.12",
    db: ["postgres", "sqlite"]
  }
});
