import { Sequelize } from "sequelize-typescript";
// import dotenv from "dotenv";
import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
  DB_POOL_ACQUIRE,
  DB_POOL_EVICT,
  DB_POOL_IDLE,
  DB_POOL_MAX,
  DB_POOL_MIN,
  DB_STATEMENT_TIMEOUT,
  NODE_ENV,
} from "../config/env";
import { getServiceLogger } from "./createLogger";
import { modelList } from "./modelsList";
import { setDbReady } from "../middlewares/dbReady";

const logger = getServiceLogger("sequelize");

// load environment variables
// dotenv.config();

let sequelize: Sequelize | null;

// --- Connection pool sizing (env-overridable, see config/env.ts) ---
// The managed Postgres cluster has a hard `max_connections` limit, and every
// environment (RAT/IAT/SIT/UAT/PROD) of this backend shares it. If each process
// opens too many connections — or holds idle ones — the server runs out of
// non-superuser slots ("remaining connection slots are reserved for roles with
// the SUPERUSER attribute"). Keep `max` modest and `min` at 0 so idle
// environments release their slots.
const poolConfig = {
  max: DB_POOL_MAX, // max concurrent connections per process
  min: DB_POOL_MIN, // don't hold idle connections
  acquire: DB_POOL_ACQUIRE, // max time to get a connection
  idle: DB_POOL_IDLE, // release idle connections after 10s
  evict: DB_POOL_EVICT, // sweep for idle connections every 5s
};

export const createSequelize = () => {
  logger.info(
    `[POOL CONFIG] max=${poolConfig.max}, min=${poolConfig.min}, acquire=${poolConfig.acquire}ms, idle=${poolConfig.idle}ms`,
  );

  return NODE_ENV !== "local"
    ? new Sequelize({
        database: DATABASE_NAME,
        username: DATABASE_USERNAME,
        password: DATABASE_PASSWORD,
        host: DATABASE_HOST,
        port: DATABASE_PORT,
        dialect: "postgres",
        logging: false,
        models: modelList,
        dialectOptions: {
          ssl: {
            require: true, // necessary for managed DBs like DigitalOcean / Heroku
            rejectUnauthorized: false, // allows self-signed certs
          },
          ...(DB_STATEMENT_TIMEOUT > 0 ? { statement_timeout: DB_STATEMENT_TIMEOUT } : {}), 
        },
        pool: poolConfig,
      })
    : new Sequelize({
        database: DATABASE_NAME,
        username: DATABASE_USERNAME,
        password: DATABASE_PASSWORD,
        host: DATABASE_HOST,
        port: DATABASE_PORT,
        dialect: "postgres",
        logging: false,
        models: modelList,
        pool: poolConfig,
        // retry: {
        //   max: 5, // retry queries when connection lost
        // },
      });
};
export const getSequelize = (): Sequelize => {
  if (!sequelize) {
    logger.warn("Sequelize connection missing or closed, recreating...");
    sequelize = createSequelize();
  }
  return sequelize;
};

function logPoolStats(sequelize: Sequelize, label: string) {
  try {
    // @ts-ignore - pool is internal
    const pool = sequelize.connectionManager?.pool;
    if (pool && pool.available && pool.borrowed) {
      logger.info(
        `[POOL ${label}] active: ${pool.borrowed}, idle: ${pool.available}, pending: ${pool.pending}`,
      );
    } else {
      logger.info(`[POOL ${label}] No stats available`);
    }
  } catch (err: any) {
    logger.warn(`[POOL ${label}] Failed to read stats: ${err.message}`);
  }
}

export const resetSequelize = async () => {
  logger.info("🔄 Resetting Sequelize instance...");
  setDbReady(false);

  if (sequelize) {
    logPoolStats(sequelize, "before reset");

    try {
      logger.info("🛑 Closing existing Sequelize connection...");

      // Try graceful close with timeout
      await Promise.race([
        sequelize.close(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Sequelize close timeout")), 10000),
        ),
      ]);

      logger.info("✅ Existing Sequelize connection closed");
    } catch (err: any) {
      logger.warn("Failed to close cleanly: " + err.message);

      // HARD RESET: force-destroy pool
      try {
        // @ts-ignore
        if (sequelize.connectionManager?.pool) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          sequelize.connectionManager.pool.destroyAllNow();
          logger.info(" Force-destroyed all pooled connections");
        }
      } catch (poolErr: any) {
        logger.error("❌ Failed to force-destroy pool: " + poolErr.message);
      }
    }

    logPoolStats(sequelize, "after reset");
  } else {
    logger.info("ℹ️ No existing Sequelize instance found");
  }

  // ← ADD THIS HERE
  sequelize = null;

  logger.info("✨ Creating new Sequelize instance...");

  sequelize = createSequelize();

  // Reconnect and verify
  logger.info("📊 Attempting DB REconnection...");
  await sequelize.authenticate();
  setDbReady(true);
  logger.info("✅ Database RECONNECTED");

  if (NODE_ENV !== "production") {
    // Sync if needed
    logger.info("⏳ Database syncing...");
    const startSync = Date.now();
    await sequelize.sync({ alter: false });
    const syncDuration = ((Date.now() - startSync) / 1000).toFixed(2);
    logger.info(`✅ Database synced (took ${syncDuration}s)`);
  }

  return sequelize;
};
