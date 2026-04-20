import { bookingActiveReservationStatusValues } from "./model";

export type BookingReservationSqlOptions = {
  schemaName?: string;
  tableName?: string;
  dropSchema?: boolean;
};

export function buildBookingReservationMigrationSql(options: BookingReservationSqlOptions = {}): string[] {
  const schemaName = normalizeIdentifier(options.schemaName ?? "booking", "schemaName");
  const tableName = normalizeIdentifier(options.tableName ?? "reservations", "tableName");
  const qualifiedTable = `${schemaName}.${tableName}`;
  const slotWindowConstraint = getBookingReservationSlotWindowConstraintName(tableName);
  const exclusionConstraint = getBookingReservationExclusionConstraintName(tableName);
  const idempotencyIndex = getBookingReservationIdempotencyIndexName(tableName);
  const lookupIndex = getBookingReservationLookupIndexName(tableName);
  const activeStatusList = bookingActiveReservationStatusValues.map((status) => `'${status}'`).join(", ");

  return [
    "CREATE EXTENSION IF NOT EXISTS btree_gist;",
    `CREATE SCHEMA IF NOT EXISTS ${schemaName};`,
    `CREATE TABLE IF NOT EXISTS ${qualifiedTable} (` +
      "id text PRIMARY KEY, " +
      "tenant_id text NOT NULL, " +
      "resource_class text NOT NULL, " +
      "resource_id text NOT NULL, " +
      "slot_start timestamptz NOT NULL, " +
      "slot_end timestamptz NOT NULL, " +
      "confirmation_status text NOT NULL, " +
      "actor_id text NOT NULL, " +
      "idempotency_key text NOT NULL, " +
      "hold_expires_at timestamptz NULL, " +
      "reason text NULL, " +
      "created_at timestamptz NOT NULL DEFAULT now(), " +
      "updated_at timestamptz NOT NULL DEFAULT now(), " +
      `CONSTRAINT ${slotWindowConstraint} CHECK (slot_end > slot_start), ` +
      "CONSTRAINT " + getBookingReservationStatusConstraintName(tableName) +
      " CHECK (confirmation_status IN ('draft', 'held', 'confirmed', 'cancelled', 'released'))" +
    ");",
    `CREATE UNIQUE INDEX IF NOT EXISTS ${idempotencyIndex} ON ${qualifiedTable} (tenant_id, idempotency_key);`,
    `CREATE INDEX IF NOT EXISTS ${lookupIndex} ON ${qualifiedTable} (tenant_id, resource_class, resource_id, slot_start);`,
    `DO $$ BEGIN IF NOT EXISTS (` +
      "SELECT 1 FROM pg_constraint WHERE conname = '" + exclusionConstraint + "'" +
    `) THEN ALTER TABLE ${qualifiedTable} ADD CONSTRAINT ${exclusionConstraint} ` +
      "EXCLUDE USING gist (" +
      "tenant_id WITH =, " +
      "resource_class WITH =, " +
      "resource_id WITH =, " +
      "tstzrange(slot_start, slot_end, '[)') WITH &&" +
      `) WHERE (confirmation_status IN (${activeStatusList})); END IF; END $$;`
  ];
}

export function buildBookingReservationRollbackSql(options: BookingReservationSqlOptions = {}): string[] {
  const schemaName = normalizeIdentifier(options.schemaName ?? "booking", "schemaName");
  const tableName = normalizeIdentifier(options.tableName ?? "reservations", "tableName");
  const dropSchema = options.dropSchema ?? schemaName !== "booking";

  return [
    `DROP TABLE IF EXISTS ${schemaName}.${tableName} CASCADE;`,
    ...(dropSchema ? [`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`] : [])
  ];
}

export function getBookingReservationExclusionConstraintName(tableName = "reservations"): string {
  return `${normalizeIdentifier(tableName, "tableName")}_active_slot_excl`;
}

export function getBookingReservationSlotWindowConstraintName(tableName = "reservations"): string {
  return `${normalizeIdentifier(tableName, "tableName")}_slot_window_chk`;
}

export function getBookingReservationStatusConstraintName(tableName = "reservations"): string {
  return `${normalizeIdentifier(tableName, "tableName")}_status_chk`;
}

export function getBookingReservationIdempotencyIndexName(tableName = "reservations"): string {
  return `${normalizeIdentifier(tableName, "tableName")}_tenant_idempotency_idx`;
}

export function getBookingReservationLookupIndexName(tableName = "reservations"): string {
  return `${normalizeIdentifier(tableName, "tableName")}_lookup_idx`;
}

function normalizeIdentifier(value: string, label: string): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(value)) {
    throw new Error(`${label} must use simple alphanumeric or underscore SQL identifiers`);
  }

  return value.toLowerCase();
}
