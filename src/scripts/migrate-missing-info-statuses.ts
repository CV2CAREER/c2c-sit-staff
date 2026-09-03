import { getSequelize } from "../utils/sequelize";

const logger = console;

async function run() {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    logger.log("Connected to database");

    const queryInterface = sequelize.getQueryInterface();

    // 1. Add the reuse link column if missing (raw SQL — idempotent)
    await sequelize.query(
      `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "reusedFromRequestId" VARCHAR(255)`,
    );
    const tableInfo = await queryInterface.describeTable("missing_info_requests");
    if (Object.keys(tableInfo).includes("reusedFromRequestId")) {
      logger.log("Column ready: reusedFromRequestId");
    }

    // 2. Inspect the status column — enum type or plain varchar?
    const [rows]: any = await sequelize.query(
      `SELECT t.typname, t.typtype
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_type t ON t.oid = a.atttypid
        WHERE c.relname = 'missing_info_requests'
          AND a.attname = 'status'`,
    );

    const row = rows?.[0];

    if (row?.typtype === "e" && row?.typname) {
      // Native PG enum — extend it
      for (const value of ["cancelled", "declined", "failed"]) {
        await sequelize.query(
          `ALTER TYPE "${row.typname}" ADD VALUE IF NOT EXISTS '${value}'`,
        );
        logger.log(`Enum ${row.typname} now includes: ${value}`);
      }
    } else {
      // Plain varchar column — new status values are accepted as-is
      logger.log(
        "status column is VARCHAR — new statuses (cancelled/declined/failed) require no ALTER TYPE",
      );
    }

    // 3. Index for the per-client tab query (newest-first)
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_missing_info_requests_target_user" ON "missing_info_requests" ("targetUserId", "createdAt" DESC)`,
    );
    logger.log("Index ready: idx_missing_info_requests_target_user");

    logger.log("Migration complete");
  } catch (error) {
    logger.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch {}
  }
}

run();
