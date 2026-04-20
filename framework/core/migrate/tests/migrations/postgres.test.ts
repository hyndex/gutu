import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { defineMigrationPack } from "@platform/kernel";
import {
  createDbClient,
  executeSql,
  type PlatformDatabaseClient
} from "@platform/db-drizzle";
import {
  buildBookingReservationMigrationSql,
  buildBookingReservationRollbackSql
} from "../../../../builtin-plugins/booking-core/src";

import {
  createMigrationPlan,
  defineMigrationStep,
  registerMigrationPack,
  runMigrationPlan
} from "../../src";

const postgresUrl =
  process.env.TEST_POSTGRES_URL ?? process.env.DATABASE_TEST_URL ?? process.env.DATABASE_URL;

const describeIfPostgres = postgresUrl ? describe : describe.skip;

describeIfPostgres("migrate postgres orchestration", () => {
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

  it("rolls back applied booking DDL when a later migration step fails", async () => {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
    const schemaName = `booking_${suffix}`;
    const tableName = `reservations_${suffix}`;
    const manifest = defineMigrationPack({
      id: `booking-ddl-${suffix}`,
      kind: "migration-pack",
      version: "0.1.0",
      displayName: "Booking DDL",
      description: "Applies and validates booking reservation tables.",
      compatibility: {
        framework: "^0.1.0",
        runtime: "bun>=1.3.12",
        db: ["postgres"]
      },
      sourceSystem: "internal",
      targetDomains: ["booking.reservations"],
      phases: ["import", "reconcile"]
    });

    const pack = registerMigrationPack({
      manifest,
      steps: [
        defineMigrationStep({
          id: `${manifest.id}.apply-reservations`,
          packageId: manifest.id,
          phase: "import",
          description: "Create the booking reservation table and invariants.",
          up: async () => {
            await applySql(adminClient, buildBookingReservationMigrationSql({ schemaName, tableName }));
          },
          rollback: async () => {
            await applySql(adminClient, buildBookingReservationRollbackSql({ schemaName, tableName }));
          }
        }),
        defineMigrationStep({
          id: `${manifest.id}.cutover-check`,
          packageId: manifest.id,
          phase: "reconcile",
          description: "Simulate a downstream cutover failure.",
          up: () => {
            throw new Error("cutover failed");
          }
        })
      ]
    });

    const result = await runMigrationPlan(createMigrationPlan([pack]));

    expect(result.success).toBe(false);
    expect(result.results.map((entry) => entry.status)).toEqual(["executed", "failed", "rolled-back"]);
    expect(await tableExists(adminClient, schemaName, tableName)).toBe(false);
  });

  it("keeps postgres state untouched during dry-run execution", async () => {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
    const schemaName = `booking_${suffix}`;
    const tableName = `reservations_${suffix}`;
    const manifest = defineMigrationPack({
      id: `booking-ddl-dry-run-${suffix}`,
      kind: "migration-pack",
      version: "0.1.0",
      displayName: "Booking DDL Dry Run",
      description: "Validates booking reservation migrations without applying them.",
      compatibility: {
        framework: "^0.1.0",
        runtime: "bun>=1.3.12",
        db: ["postgres"]
      },
      sourceSystem: "internal",
      targetDomains: ["booking.reservations"],
      phases: ["import"]
    });

    const pack = registerMigrationPack({
      manifest,
      steps: [
        defineMigrationStep({
          id: `${manifest.id}.apply-reservations`,
          packageId: manifest.id,
          phase: "import",
          description: "Validate the canonical booking DDL.",
          validate: () => {
            const sql = buildBookingReservationMigrationSql({ schemaName, tableName });
            expect(sql.some((statement) => statement.includes(`CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName}`))).toBe(true);
          },
          up: async () => {
            await applySql(adminClient, buildBookingReservationMigrationSql({ schemaName, tableName }));
          },
          rollback: async () => {
            await applySql(adminClient, buildBookingReservationRollbackSql({ schemaName, tableName }));
          }
        })
      ]
    });

    const result = await runMigrationPlan(createMigrationPlan([pack]), { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.results[0]?.status).toBe("planned");
    expect(await tableExists(adminClient, schemaName, tableName)).toBe(false);
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

async function tableExists(
  client: PlatformDatabaseClient | null,
  schemaName: string,
  tableName: string
): Promise<boolean> {
  const rows = await queryRows(
    client,
    `SELECT 1 AS present FROM information_schema.tables WHERE table_schema = '${schemaName}' AND table_name = '${tableName}' LIMIT 1;`
  );

  return rows.length > 0;
}

async function queryRows(
  client: PlatformDatabaseClient | null,
  statement: string
): Promise<Array<Record<string, number>>> {
  if (!client || client.engine !== "postgres") {
    throw new Error("postgres client is required");
  }

  return await client.raw.unsafe(statement);
}
