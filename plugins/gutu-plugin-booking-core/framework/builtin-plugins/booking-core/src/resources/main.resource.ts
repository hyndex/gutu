import { defineResource } from "@platform/schema";
import { z } from "zod";

import { reservations } from "../../db/schema";
import { bookingReservationStatusValues } from "../model";

export const BookingReservationResource = defineResource({
  id: "booking.reservations",
  description: "Canonical reservation records for rooms, desks, appointments, and other allocatable resources.",
  businessPurpose: "Provide the single source of truth for booking windows, hold state, confirmation state, and operator context.",
  invariants: [
    "Only one active reservation may own a tenant/resource/time window at a time.",
    "Held reservations must either confirm, cancel, or expire into a released state."
  ],
  lifecycleNotes: [
    "Reservations begin as draft, held, or confirmed based on the booking path.",
    "Cancelled and released records are retained for auditability and analytics."
  ],
  actors: ["operator", "portal-member", "scheduler"],
  table: reservations,
  contract: z.object({
    id: z.string().min(2),
    tenantId: z.string().min(2),
    resourceClass: z.string().min(2),
    resourceId: z.string().min(2),
    slotStart: z.string().datetime(),
    slotEnd: z.string().datetime(),
    confirmationStatus: z.enum(bookingReservationStatusValues),
    actorId: z.string().min(2),
    idempotencyKey: z.string().min(3),
    holdExpiresAt: z.string().datetime().nullable(),
    reason: z.string().min(3).nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
  }),
  fields: {
    id: {
      searchable: true,
      sortable: true,
      label: "Reservation",
      description: "Stable identifier for the reservation record across admin, portal, and audit flows."
    },
    tenantId: {
      searchable: true,
      sortable: true,
      label: "Tenant",
      description: "Tenant boundary that owns the reservation and governs overlap checks."
    },
    resourceClass: {
      searchable: true,
      sortable: true,
      label: "Resource Class",
      description: "Type of resource being reserved, such as room, desk, or appointment."
    },
    resourceId: {
      searchable: true,
      sortable: true,
      label: "Resource",
      description: "Canonical identifier of the specific allocatable resource."
    },
    slotStart: {
      sortable: true,
      label: "Start",
      description: "Inclusive start timestamp for the reservation window."
    },
    slotEnd: {
      sortable: true,
      label: "End",
      description: "Exclusive end timestamp for the reservation window."
    },
    confirmationStatus: {
      filter: "select",
      label: "Status",
      description: "Allocation state used by availability checks and portal views."
    },
    holdExpiresAt: {
      sortable: true,
      label: "Hold Expires",
      description: "Expiry time for held reservations awaiting confirmation."
    },
    actorId: {
      searchable: true,
      sortable: true,
      label: "Actor",
      description: "Operator or workflow actor that last changed the reservation."
    },
    idempotencyKey: {
      searchable: true,
      sortable: true,
      label: "Idempotency Key",
      description: "Client-supplied replay key used to keep booking submissions safe across retries."
    },
    reason: {
      searchable: true,
      label: "Reason",
      description: "Optional operator or workflow note explaining why the reservation exists or changed."
    },
    createdAt: {
      sortable: true,
      label: "Created",
      description: "Creation timestamp for audit review and operational tracing."
    },
    updatedAt: {
      sortable: true,
      label: "Updated",
      description: "Most recent timestamp when the reservation state or ownership metadata changed."
    }
  },
  admin: {
    autoCrud: true,
    defaultColumns: [
      "resourceClass",
      "resourceId",
      "slotStart",
      "slotEnd",
      "confirmationStatus",
      "holdExpiresAt",
      "createdAt"
    ]
  },
  portal: {
    enabled: true
  }
});

export const bookingResources = [BookingReservationResource] as const;
