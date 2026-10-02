import { Sequelize } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { resolvePoolTarget } from "./_pool-target";

const logger = getServiceLogger("apply-sandbox-schema-gaps");

// One-off fix-up: closes the remaining functional gaps found by a full
// column diff against iat-pool (read-only comparison — iat-pool itself was
// never touched). Scope is deliberately "make the target work for testing",
// not "byte-for-byte structural parity" — skips several iat-pool
// divergences (legacy `applications` snake_case/int-PK columns,
// `cv_revamps`/`ambassador_link_clicks` native-uuid vs varchar drift,
// retired justcall_* tables) that aren't referenced by any current model
// and carry more risk than benefit to chase right now.
//
// Target is picked via --target=<name> (see _pool-target.ts), defaulting to
// --target=sandbox for backward compatibility — never reads DB_NAME from
// .env, so this can't accidentally land on iat-pool/uat-pool/prod.
const argv = process.argv.slice(2);
const target = resolvePoolTarget(argv);
const CONFIRMED = argv.includes("--force") || process.env.CONFIRM_DROP === "yes";

// Additive columns — all nullable or defaulted, safe on a table with
// existing rows. Types/nullability taken verbatim from iat-pool's real
// columns (audit_logs, heritage, rewardApplied) or from the owning
// customer-backend model (personalMessage — legacy inert column).
const ADD_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: "users", column: "heritage", ddl: `VARCHAR(255)` },
  { table: "audit_logs", column: "actorId", ddl: `VARCHAR(255)` },
  { table: "audit_logs", column: "actorEmail", ddl: `VARCHAR(255)` },
  { table: "audit_logs", column: "action", ddl: `VARCHAR(255)` },
  { table: "audit_logs", column: "metadata", ddl: `JSONB` },
  { table: "audit_logs", column: "ipAddress", ddl: `VARCHAR(255)` },
  { table: "audit_logs", column: "userAgent", ddl: `VARCHAR(255)` },
  { table: "missing_info_disclaimers", column: "createdAt", ddl: `TIMESTAMPTZ NOT NULL DEFAULT now()` },
  { table: "missing_info_requests", column: "personalMessage", ddl: `TEXT` },
  { table: "referrers", column: "rewardApplied", ddl: `BOOLEAN NOT NULL DEFAULT false` },
  { table: "user_preference_history", column: "created_at", ddl: `TIMESTAMPTZ DEFAULT now()` },
  { table: "user_preference_history", column: "createdat", ddl: `TIMESTAMPTZ DEFAULT now()` },
];

async function main() {
  logger.info(`Target: ${target.name} — ${target.host}:${target.port} db="${target.database}"`);

  const sequelize = new Sequelize(target.database, target.username, target.password, {
    host: target.host,
    port: target.port,
    dialect: "postgres",
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });

  try {
    await sequelize.authenticate();
    const [[{ current_database }]] = (await sequelize.query(
      "SELECT current_database()",
    )) as [{ current_database: string }[], unknown];
    if (current_database !== target.database) {
      throw new Error(`Connected database is "${current_database}", expected "${target.database}" — aborting.`);
    }
    logger.info(`✅ Connected to "${current_database}" @ ${target.host}:${target.port}`);

    if (!CONFIRMED) {
      logger.warn("🛑 Dry run only (no --force / CONFIRM_DROP=yes passed). Nothing was applied.");
      logger.info(`Would add ${ADD_COLUMNS.length} column(s):`);
      for (const c of ADD_COLUMNS) logger.info(`  ${c.table}.${c.column} ${c.ddl}`);
      logger.info("Would also: widen missing_info_requests.status/channel from enum to varchar (match iat-pool, avoid enum-violation failures during testing), and default requestedByName to 'Unknown'.");
      return;
    }

    await sequelize.transaction(async (t) => {
      logger.info(`Adding ${ADD_COLUMNS.length} column(s)...`);
      for (const { table, column, ddl } of ADD_COLUMNS) {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`, { transaction: t });
      }

      // missing_info_requests.status/channel are stricter enums on sandbox
      // than iat-pool's plain varchar — widen so the app can't hit an
      // enum-violation the real environment never would.
      logger.info("Widening missing_info_requests.status/channel from enum to varchar...");
      await sequelize.query(
        `ALTER TABLE missing_info_requests ALTER COLUMN status TYPE VARCHAR(20) USING status::text`,
        { transaction: t },
      );
      await sequelize.query(
        `ALTER TABLE missing_info_requests ALTER COLUMN status SET DEFAULT 'pending'`,
        { transaction: t },
      );
      await sequelize.query(
        `ALTER TABLE missing_info_requests ALTER COLUMN channel TYPE VARCHAR(20) USING channel::text`,
        { transaction: t },
      );
      await sequelize.query(
        `ALTER TABLE missing_info_requests ALTER COLUMN channel SET DEFAULT 'whatsapp'`,
        { transaction: t },
      );
      await sequelize.query(
        `ALTER TABLE missing_info_requests ALTER COLUMN "requestedByName" SET DEFAULT 'Unknown'`,
        { transaction: t },
      );
    });

    logger.info(`✅ Schema gaps closed on "${target.database}" successfully.`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  logger.error(`❌ apply-sandbox-schema-gaps failed: ${error?.message || error}`);
  process.exitCode = 1;
});
