import { defineAction } from "@platform/schema";
import { z } from "zod";

import {
  bookingReservationRecordSchema,
  cancelReservationInputSchema,
  confirmReservationInputSchema,
  stageReservationInputSchema
} from "../model";
import {
  cancelReservation,
  confirmReservation,
  stageReservation
} from "../services/main.service";

const reservationMutationOutputSchema = z.object({
  ok: z.literal(true),
  reservation: bookingReservationRecordSchema
});

export const stageReservationAction = defineAction({
  id: "booking.reservations.stage",
  description: "Stage a booking reservation as a held or confirmed allocation window.",
  businessPurpose: "Create the canonical reservation record before downstream notifications, approvals, or portal views.",
  preconditions: [
    "A tenant, actor, resource, and slot window must be supplied.",
    "The booking writer must provide a stable idempotency key for retries."
  ],
  mandatorySteps: [
    "Validate the slot window before creating a held or confirmed reservation.",
    "Pin the reservation record to a single canonical resource writer."
  ],
  sideEffects: [
    "Produces a canonical reservation record for database persistence."
  ],
  postconditions: [
    "The reservation is returned in held or confirmed status.",
    "Held reservations carry a deterministic hold expiry."
  ],
  failureModes: [
    "Rejects invalid or stale slot windows.",
    "Rejects malformed identifiers or idempotency keys."
  ],
  forbiddenShortcuts: [
    "Do not auto-confirm approval-required reservations.",
    "Do not create reservations without a canonical idempotency key."
  ],
  input: stageReservationInputSchema,
  output: reservationMutationOutputSchema,
  permission: "booking.reservations.stage",
  idempotent: true,
  audit: true,
  handler: ({ input }) => stageReservation(input)
});

export const confirmReservationAction = defineAction({
  id: "booking.reservations.confirm",
  description: "Confirm a held or draft reservation after review has completed.",
  businessPurpose: "Finalize a reservation without leaving transient hold metadata behind.",
  mandatorySteps: [
    "Only draft or held reservations may be confirmed.",
    "Confirmation must record the operator and reason."
  ],
  postconditions: [
    "The reservation is returned in confirmed status.",
    "Any transient hold expiry is removed."
  ],
  input: confirmReservationInputSchema,
  output: reservationMutationOutputSchema,
  permission: "booking.reservations.confirm",
  idempotent: true,
  audit: true,
  handler: ({ input }) => confirmReservation(input)
});

export const cancelReservationAction = defineAction({
  id: "booking.reservations.cancel",
  description: "Cancel a staged or confirmed reservation and release the resource window.",
  businessPurpose: "Free a previously allocated slot while leaving an auditable trail for operators and customers.",
  mandatorySteps: [
    "Only draft, held, or confirmed reservations may be cancelled.",
    "Cancellation must record the operator and reason."
  ],
  postconditions: [
    "The reservation is returned in cancelled status.",
    "The slot can be safely reused by a later reservation."
  ],
  input: cancelReservationInputSchema,
  output: reservationMutationOutputSchema,
  permission: "booking.reservations.cancel",
  idempotent: true,
  audit: true,
  handler: ({ input }) => cancelReservation(input)
});

export const bookingActions = [
  stageReservationAction,
  confirmReservationAction,
  cancelReservationAction
] as const;
