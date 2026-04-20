import { z } from "zod";

export const bookingReservationStatusValues = [
  "draft",
  "held",
  "confirmed",
  "cancelled",
  "released"
] as const;

export const bookingActiveReservationStatusValues = [
  "held",
  "confirmed"
] as const;

export const bookingReservationRecordSchema = z.object({
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
  reason: z.string().min(3).nullable()
});

export const stageReservationInputSchema = z.object({
  reservationId: z.string().min(2),
  tenantId: z.string().min(2),
  resourceClass: z.string().min(2),
  resourceId: z.string().min(2),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  actorId: z.string().min(2),
  requestedAt: z.string().datetime(),
  idempotencyKey: z.string().min(3),
  requireApproval: z.boolean().default(false),
  holdTtlMinutes: z.number().int().positive().max(1440).optional(),
  reason: z.string().min(3).optional()
});

export const confirmReservationInputSchema = z.object({
  reservation: bookingReservationRecordSchema,
  actorId: z.string().min(2),
  confirmationReason: z.string().min(3)
});

export const cancelReservationInputSchema = z.object({
  reservation: bookingReservationRecordSchema,
  actorId: z.string().min(2),
  cancellationReason: z.string().min(3)
});

export type BookingReservationStatus = (typeof bookingReservationStatusValues)[number];
export type BookingReservationRecord = z.infer<typeof bookingReservationRecordSchema>;
export type StageReservationInput = z.infer<typeof stageReservationInputSchema>;
export type ConfirmReservationInput = z.infer<typeof confirmReservationInputSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationInputSchema>;
