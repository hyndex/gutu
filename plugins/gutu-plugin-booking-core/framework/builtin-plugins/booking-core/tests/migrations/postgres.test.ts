import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import {
  createDbClient,
  executeSql,
  type PlatformDatabaseClient
} from "@platform/db-drizzle";

import {
  buildBookingReservationMigrationSql,
  buildBookingReservationRollbackSql,
  getBookingReservationExclusionConstraintName
} from "../../src/postgres";

const postgresUrl =
  process.env.TEST_POSTGRES_URL ?? process.env.DATABASE_TEST_URL ?? process.env.DATABASE_URL;

const describeIfPostgres = postgresUrl ? describe : describe.skip;

describeIfPostgres("booking-core postgres invariants", () => {
  let adminClient: PlatformDatabaseClient | null = null;

  beforeAll(() => {
    if (!postgresUrl) {
      return;
    }

    adminClient = createDbClient({
      engine: "postgres",
      connectionString: postgresUrl,
      maxConnections: 1,
      role: "app_migrator"
    });
  });

  afterAll(async () => {
    await adminClient?.close();
  });

  it("rejects overlapping active reservations but allows slot reuse after cancellation", async () => {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
    const schemaName = `booking_${suffix}`;
    const tableName = `reservations_${suffix}`;
    const constraintName = getBookingReservationExclusionConstraintName(tableName);

    await applySql(adminClient, buildBookingReservationMigrationSql({ schemaName, tableName }));

    try {
      await executeSql(
        requireClient(adminClient),
        `INSERT INTO ${schemaName}.${tableName} (id, tenant_id, resource_class, resource_id, slot_start, slot_end, confirmation_status, actor_id, idempotency_key) VALUES ('res_a', 'tenant-1', 'desk', 'desk-14', '2026-04-20T09:00:00Z', '2026-04-20T10:00:00Z', 'confirmed', 'actor-1', 'res-a');`
      );

      let overlapError = "";
      try {
        await executeSql(
          requireClient(adminClient),
          `INSERT INTO ${schemaName}.${tableName} (id, tenant_id, resource_class, resource_id, slot_start, slot_end, confirmation_status, actor_id, idempotency_key) VALUES ('res_b', 'tenant-1', 'desk', 'desk-14', '2026-04-20T09:30:00Z', '2026-04-20T10:30:00Z', 'held', 'actor-2', 'res-b');`
        );
      } catch (error) {
        overlapError = getErrorMessage(error);
      }

      expect(overlapError).toContain(constraintName);

      await executeSql(
        requireClient(adminClient),
        `UPDATE ${schemaName}.${tableName} SET confirmation_status = 'cancelled' WHERE id = 'res_a';`
      );

      await executeSql(
        requireClient(adminClient),
        `INSERT INTO ${schemaName}.${tableName} (id, tenant_id, resource_class, resource_id, slot_start, slot_end, confirmation_status, actor_id, idempotency_key) VALUES ('res_c', 'tenant-1', 'desk', 'desk-14', '2026-04-20T09:30:00Z', '2026-04-20T10:30:00Z', 'confirmed', 'actor-3', 'res-c');`
      );

      const rows = await queryRows(
        adminClient,
        `SELECT id, confirmation_status FROM ${schemaName}.${tableName} ORDER BY id;`
      );

      expect(rows).toEqual([
        { id: "res_a", confirmation_status: "cancelled" },
        { id: "res_c", confirmation_status: "confirmed" }
      ]);
    } finally {
      await applySql(adminClient, buildBookingReservationRollbackSql({ schemaName, tableName }));
    }
  });

  it("allows adjacent reservations while still blocking true time overlap", async () => {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
    const schemaName = `booking_${suffix}`;
    const tableName = `reservations_${suffix}`;

    await applySql(adminClient, buildBookingReservationMigrationSql({ schemaName, tableName }));

    try {
      await executeSql(
        requireClient(adminClient),
        `INSERT INTO ${schemaName}.${tableName} (id, tenant_id, resource_class, resource_id, slot_start, slot_end, confirmation_status, actor_id, idempotency_key) VALUES ('res_a', 'tenant-1', 'room', 'room-a', '2026-04-20T11:00:00Z', '2026-04-20T12:00:00Z', 'held', 'actor-1', 'adjacent-a');`
      );

      await executeSql(
        requireClient(adminClient),
        `INSERT INTO ${schemaName}.${tableName} (id, tenant_id, resource_class, resource_id, slot_start, slot_end, confirmation_status, actor_id, idempotency_key) VALUES ('res_b', 'tenant-1', 'room', 'room-a', '2026-04-20T12:00:00Z', '2026-04-20T13:00:00Z', 'confirmed', 'actor-2', 'adjacent-b');`
      );

      const rows = await queryRows(
        adminClient,
        `SELECT id FROM ${schemaName}.${tableName} ORDER BY id;`
      );

      expect(rows).toEqual([{ id: "res_a" }, { id: "res_b" }]);
    } finally {
      await applySql(adminClient, buildBookingReservationRollbackSql({ schemaName, tableName }));
    }
  });
});

async function applySql(client: PlatformDatabaseClient | null, statements: string[]): Promise<void> {
  if (!client) {
    throw new Error("missing postgres client");
  }

  for (const statement of statements) {
    await executeSql(client, statement);
  }
}

async function queryRows(
  client: PlatformDatabaseClient | null,
  statement: string
): Promise<Array<Record<string, string>>> {
  if (!client || client.engine !== "postgres") {
    throw new Error("postgres client is required");
  }

  return await client.raw.unsafe(statement);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function requireClient(client: PlatformDatabaseClient | null): PlatformDatabaseClient {
  if (!client) {
    throw new Error("postgres client is required");
  }

  return client;
}
