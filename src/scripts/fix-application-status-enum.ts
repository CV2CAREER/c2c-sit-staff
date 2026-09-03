import { getSequelize } from "../utils/sequelize";
import { ApplicationStatus } from "../utils/enum";

const logger = console;

/**
 * The `ApplicationStatus` TS enum (utils/enum.ts) is the source of truth the
 * model's @Default/@Column(DataType.ENUM(...)) reads from, but Sequelize
 * doesn't alter an existing native Postgres enum type to match — a label
 * added/renamed in code only ever takes effect in the DB via an explicit
 * ALTER TYPE. "Not Started" was added to the TS enum (and is what
 * backfill-application-status-not-started.ts writes) without that ALTER TYPE
 * ever having been run here, so admin user creation (which relies on the
 * model's default) failed with:
 *   invalid input value for enum "enum_users_applicationStatus": "Not Started"
 * This adds every current ApplicationStatus label to the live enum type,
 * defensively, in case of further drift beyond just "Not Started".
 */
async function run() {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    logger.log("Connected to database");

    const [rows]: any = await sequelize.query(
      `SELECT t.typname, t.typtype
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_type t ON t.oid = a.atttypid
        WHERE c.relname = 'users'
          AND a.attname = 'applicationStatus'`,
    );

    const row = rows?.[0];

    if (row?.typtype === "e" && row?.typname) {
      for (const value of Object.values(ApplicationStatus)) {
        await sequelize.query(
          `ALTER TYPE "${row.typname}" ADD VALUE IF NOT EXISTS '${value}'`,
        );
        logger.log(`Enum ${row.typname} now includes: ${value}`);
      }
    } else {
      logger.log(
        "applicationStatus column is not a native enum — no ALTER TYPE needed",
      );
    }

    logger.log("Fix complete");
  } catch (error) {
    logger.error("Fix failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch {}
  }
}

run();
