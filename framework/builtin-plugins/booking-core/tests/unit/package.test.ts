import { describe, expect, it } from "bun:test";
import { executeAction } from "@platform/schema";

import manifest from "../../package";
import { stageReservationAction } from "../../src/actions/default.action";
import {
  cancelReservation,
  confirmReservation,
  stageReservation
} from "../../src/services/main.service";

describe("booking-core", () => {
  it("keeps a stable package id and primary capability", () => {
    expect(manifest.id).toBe("booking-core");
    expect(manifest.providesCapabilities).toContain("booking.reservations");
  });

  it("stages held reservations when approval is required", () => {
    expect(
      stageReservation({
        reservationId: "9ff8d4c4-84c6-46df-a61a-597276d17849",
        tenantId: "5e15a955-ea8a-426d-bcf9-8b7a9dc10e42",
        resourceClass: "desk",
        resourceId: "desk-14",
        slotStart: "2026-04-20T09:00:00.000Z",
        slotEnd: "2026-04-20T10:00:00.000Z",
        actorId: "e2ed53b9-b892-4405-9fc7-e601f0e0a7a9",
        requestedAt: "2026-04-20T08:45:00.000Z",
        idempotencyKey: "desk-14-2026-04-20T09:00:00.000Z",
        requireApproval: true,
        holdTtlMinutes: 15,
        reason: "desk request"
      })
    ).toEqual({
      ok: true,
      reservation: {
        id: "9ff8d4c4-84c6-46df-a61a-597276d17849",
        tenantId: "5e15a955-ea8a-426d-bcf9-8b7a9dc10e42",
        resourceClass: "desk",
        resourceId: "desk-14",
        slotStart: "2026-04-20T09:00:00.000Z",
        slotEnd: "2026-04-20T10:00:00.000Z",
        confirmationStatus: "held",
        actorId: "e2ed53b9-b892-4405-9fc7-e601f0e0a7a9",
        idempotencyKey: "desk-14-2026-04-20T09:00:00.000Z",
        holdExpiresAt: "2026-04-20T09:00:00.000Z",
        reason: "desk request"
      }
    });
  });

  it("confirms held reservations and clears transient hold expiry", () => {
    expect(
      confirmReservation({
        reservation: {
          id: "9ff8d4c4-84c6-46df-a61a-597276d17849",
          tenantId: "5e15a955-ea8a-426d-bcf9-8b7a9dc10e42",
          resourceClass: "desk",
          resourceId: "desk-14",
          slotStart: "2026-04-20T09:00:00.000Z",
          slotEnd: "2026-04-20T10:00:00.000Z",
          confirmationStatus: "held",
          actorId: "e2ed53b9-b892-4405-9fc7-e601f0e0a7a9",
          idempotencyKey: "desk-14-2026-04-20T09:00:00.000Z",
          holdExpiresAt: "2026-04-20T09:00:00.000Z",
          reason: "desk request"
        },
        actorId: "operator-1",
        confirmationReason: "manager approved"
      })
    ).toEqual({
      ok: true,
      reservation: {
        id: "9ff8d4c4-84c6-46df-a61a-597276d17849",
        tenantId: "5e15a955-ea8a-426d-bcf9-8b7a9dc10e42",
        resourceClass: "desk",
        resourceId: "desk-14",
        slotStart: "2026-04-20T09:00:00.000Z",
        slotEnd: "2026-04-20T10:00:00.000Z",
        confirmationStatus: "confirmed",
        actorId: "operator-1",
        idempotencyKey: "desk-14-2026-04-20T09:00:00.000Z",
        holdExpiresAt: null,
        reason: "manager approved"
      }
    });
  });

  it("cancels active reservations with an explicit operator reason", () => {
    expect(
      cancelReservation({
        reservation: {
          id: "9ff8d4c4-84c6-46df-a61a-597276d17849",
          tenantId: "5e15a955-ea8a-426d-bcf9-8b7a9dc10e42",
          resourceClass: "desk",
          resourceId: "desk-14",
          slotStart: "2026-04-20T09:00:00.000Z",
          slotEnd: "2026-04-20T10:00:00.000Z",
          confirmationStatus: "confirmed",
          actorId: "operator-1",
          idempotencyKey: "desk-14-2026-04-20T09:00:00.000Z",
          holdExpiresAt: null,
          reason: "manager approved"
        },
        actorId: "operator-2",
        cancellationReason: "resource unavailable"
      })
    ).toEqual({
      ok: true,
      reservation: {
        id: "9ff8d4c4-84c6-46df-a61a-597276d17849",
        tenantId: "5e15a955-ea8a-426d-bcf9-8b7a9dc10e42",
        resourceClass: "desk",
        resourceId: "desk-14",
        slotStart: "2026-04-20T09:00:00.000Z",
        slotEnd: "2026-04-20T10:00:00.000Z",
        confirmationStatus: "cancelled",
        actorId: "operator-2",
        idempotencyKey: "desk-14-2026-04-20T09:00:00.000Z",
        holdExpiresAt: null,
        reason: "resource unavailable"
      }
    });
  });

  it("validates the public action contract for auto-confirmed reservations", async () => {
    const result = await executeAction(stageReservationAction, {
      reservationId: "f36a2d1c-9d43-49fc-862c-7a0d8f252266",
      tenantId: "5e15a955-ea8a-426d-bcf9-8b7a9dc10e42",
      resourceClass: "room",
      resourceId: "room-a",
      slotStart: "2026-04-20T11:00:00.000Z",
      slotEnd: "2026-04-20T12:00:00.000Z",
      actorId: "operator-3",
      requestedAt: "2026-04-20T10:30:00.000Z",
      idempotencyKey: "room-a-2026-04-20T11:00:00.000Z",
      requireApproval: false,
      reason: "walk-in"
    });

    expect(result.reservation.confirmationStatus).toBe("confirmed");
    expect(result.reservation.holdExpiresAt).toBeNull();
  });
});
