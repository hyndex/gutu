import { pgSchema, text, timestamp } from "drizzle-orm/pg-core";

const bookingSchema = pgSchema("booking");

export const reservations = bookingSchema.table("reservations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  resourceClass: text("resource_class").notNull(),
  resourceId: text("resource_id").notNull(),
  slotStart: timestamp("slot_start", { withTimezone: true }).notNull(),
  slotEnd: timestamp("slot_end", { withTimezone: true }).notNull(),
  confirmationStatus: text("confirmation_status").notNull(),
  actorId: text("actor_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
