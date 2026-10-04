import { Sequelize } from "sequelize-typescript";
import {
  DB_POOL_ACQUIRE,
  DB_POOL_EVICT,
  DB_POOL_IDLE,
  DB_POOL_MAX,
  DB_POOL_MIN,
  DB_STATEMENT_TIMEOUT,
} from "../config/env";
import { modelList } from "../utils/modelsList";
import { getServiceLogger } from "../utils/createLogger";
import { resolvePoolTarget } from "./_pool-target";

const logger = getServiceLogger("sync-sandbox-pool");

// One-off maintenance script: refreshes a non-production Postgres database
// (sandbox, rat-pool, ...) so its schema matches this codebase's current
// Sequelize models, the same way iat-pool was originally bootstrapped.
//
// This DOES NOT read DB_NAME from .env — the target is picked via
// --target=<name> (see _pool-target.ts), so running this can never
// accidentally hit whatever database .env is currently pointed at.
// Defaults to --target=sandbox for backward compatibility.
//
// Each target's preset connects directly (not through any pgbouncer pool
// port) — safer for DDL. Pass --host/--db/--port/--user/--password-env to
// override any part of a preset.
const argv = process.argv.slice(2);
const target = resolvePoolTarget(argv);

// Requires --force (or CONFIRM_DROP=yes) to actually drop/recreate tables.
// Without it, this only connects, prints which database it's talking to,
// and lists the tables that would be dropped — a dry run.
const CONFIRMED = argv.includes("--force") || process.env.CONFIRM_DROP === "yes";
const VERBOSE = argv.includes("--verbose");

// Captured so that if sync() dies partway through, the error we print names
// the exact statement (and therefore table/index) it died on instead of a
// bare Postgres error with no context.
let lastSql: string | null = null;

async function main() {
  logger.info(`Target: ${target.name} — ${target.host}:${target.port} db="${target.database}"`);

  const sequelize = new Sequelize({
    database: target.database,
    username: target.username,
    password: target.password,
    host: target.host,
    port: target.port,
    dialect: "postgres",
    logging: (sql: string) => {
      lastSql = sql;
      if (VERBOSE) logger.info(`[SQL] ${sql}`);
    },
    models: modelList,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      ...(DB_STATEMENT_TIMEOUT > 0 ? { statement_timeout: DB_STATEMENT_TIMEOUT } : {}),
    },
    pool: {
      max: DB_POOL_MAX,
      min: DB_POOL_MIN,
      acquire: DB_POOL_ACQUIRE,
      idle: DB_POOL_IDLE,
      evict: DB_POOL_EVICT,
    },
  });

  try {
    await sequelize.authenticate();

    // Safety net: confirm we actually landed on the intended database before
    // doing anything destructive, in case the name/port assumption is wrong.
    const [[{ current_database }]] = (await sequelize.query(
      "SELECT current_database()",
    )) as [{ current_database: string }[], unknown];

    if (current_database !== target.database) {
      throw new Error(
        `Connected database is "${current_database}", expected "${target.database}" — aborting without touching anything.`,
      );
    }

    logger.info(`✅ Connected to "${current_database}" @ ${target.host}:${target.port}`);

    const queryInterface = sequelize.getQueryInterface();
    const tablesBefore: string[] = await queryInterface.showAllTables();
    logger.info(
      `📋 ${tablesBefore.length} existing table(s) in ${target.database}: [${tablesBefore.join(", ")}]`,
    );
    logger.info(`📦 ${modelList.length} model(s) registered to sync.`);

    if (!CONFIRMED) {
      logger.warn(
        "🛑 Dry run only (no --force / CONFIRM_DROP=yes passed). Nothing was dropped or created.",
      );
      return;
    }

    logger.warn(
      `⚠️  Dropping and recreating all ${modelList.length} modeled table(s) in "${target.database}"...`,
    );
    const start = Date.now();
    try {
      await sequelize.sync({ force: true });
    } catch (syncError: any) {
      logger.error(`❌ Last SQL statement before failure:\n${lastSql}`);
      throw syncError;
    }
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    const tablesAfter: string[] = await queryInterface.showAllTables();
    logger.info(
      `✅ "${target.database}" synced fresh in ${duration}s — ${tablesAfter.length} table(s): [${tablesAfter.join(", ")}]`,
    );
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  logger.error(`❌ sync-sandbox-pool failed: ${error?.message || error}`);
  process.exitCode = 1;
});
