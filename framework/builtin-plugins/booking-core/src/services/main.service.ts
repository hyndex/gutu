import { ValidationError } from "@platform/kernel";
import { normalizeActionInput } from "@platform/schema";

import {
  type BookingReservationRecord,
  type BookingReservationStatus,
  type CancelReservationInput,
  cancelReservationInputSchema,
  type ConfirmReservationInput,
  confirmReservationInputSchema,
  stageReservationInputSchema,
  type StageReservationInput
} from "../model";

type ReservationMutationResult = {
  ok: true;
  reservation: BookingReservationRecord;
};

export function stageReservation(input: StageReservationInput): ReservationMutationResult {
  const normalized = stageReservationInputSchema.parse(normalizeActionInput(input));
  const slotStart = toIsoInstant(normalized.slotStart, "slotStart");
  const slotEnd = toIsoInstant(normalized.slotEnd, "slotEnd");
  const requestedAt = toIsoInstant(normalized.requestedAt, "requestedAt");

  assertSlotWindow(slotStart, slotEnd);
  assertRequestNotStale(requestedAt, slotEnd);

  const confirmationStatus: BookingReservationStatus = normalized.requireApproval ? "held" : "confirmed";
  const holdExpiresAt = confirmationStatus === "held"
    ? new Date(Date.parse(requestedAt) + (normalized.holdTtlMinutes ?? 15) * 60_000).toISOString()
    : null;

  return {
    ok: true,
    reservation: {
      id: normalized.reservationId,
      tenantId: normalized.tenantId,
      resourceClass: normalized.resourceClass,
      resourceId: normalized.resourceId,
      slotStart,
      slotEnd,
      confirmationStatus,
      actorId: normalized.actorId,
      idempotencyKey: normalized.idempotencyKey,
      holdExpiresAt,
      reason: normalized.reason ?? null
    }
  };
}

export function confirmReservation(input: ConfirmReservationInput): ReservationMutationResult {
  const normalized = confirmReservationInputSchema.parse(input);
  assertTransitionAllowed(normalized.reservation.confirmationStatus, ["draft", "held"], "confirm");

  return {
    ok: true,
    reservation: {
      ...normalized.reservation,
      confirmationStatus: "confirmed",
      actorId: normalized.actorId,
      holdExpiresAt: null,
      reason: normalized.confirmationReason
    }
  };
}

export function cancelReservation(input: CancelReservationInput): ReservationMutationResult {
  const normalized = cancelReservationInputSchema.parse(input);
  assertTransitionAllowed(normalized.reservation.confirmationStatus, ["draft", "held", "confirmed"], "cancel");

  return {
    ok: true,
    reservation: {
      ...normalized.reservation,
      confirmationStatus: "cancelled",
      actorId: normalized.actorId,
      holdExpiresAt: null,
      reason: normalized.cancellationReason
    }
  };
}

function toIsoInstant(value: string, field: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`Invalid booking timestamp for '${field}'`, [
      {
        code: "booking-time-invalid",
        message: `${field} must be a valid ISO timestamp`,
        path: field,
        packageId: "booking-core"
      }
    ]);
  }

  return new Date(parsed).toISOString();
}

function assertSlotWindow(slotStart: string, slotEnd: string): void {
  if (Date.parse(slotEnd) <= Date.parse(slotStart)) {
    throw new ValidationError("Booking slotEnd must be later than slotStart", [
      {
        code: "booking-slot-window",
        message: "slotEnd must be later than slotStart",
        path: "slotEnd",
        packageId: "booking-core"
      }
    ]);
  }
}

function assertRequestNotStale(requestedAt: string, slotEnd: string): void {
  if (Date.parse(requestedAt) >= Date.parse(slotEnd)) {
    throw new ValidationError("Booking requests must be created before the slot ends", [
      {
        code: "booking-request-stale",
        message: "requestedAt must be earlier than slotEnd",
        path: "requestedAt",
        packageId: "booking-core"
      }
    ]);
  }
}

function assertTransitionAllowed(
  currentStatus: BookingReservationStatus,
  allowedStatuses: BookingReservationStatus[],
  action: "confirm" | "cancel"
): void {
  if (allowedStatuses.includes(currentStatus)) {
    return;
  }

  throw new ValidationError(`Cannot ${action} a reservation in status '${currentStatus}'`, [
    {
      code: "booking-transition-invalid",
      message: `status '${currentStatus}' cannot perform '${action}'`,
      path: "reservation.confirmationStatus",
      packageId: "booking-core"
    }
  ]);
}
