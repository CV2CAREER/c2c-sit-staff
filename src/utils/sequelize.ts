import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";
import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
  NODE_ENV,
} from "../config/env";
import { getServiceLogger } from "./createLogger";
import { modelList } from "./modelsList";

const logger = getServiceLogger("sequelize");

// load environment variables
dotenv.config();

let sequelize: Sequelize | null;

export const createSequelize = () => {
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
          statement_timeout: 30000, // 30s query timeout
        },
        pool: {
          max: 50, // max concurrent connections
          min: 5, // minimum idle connections
          acquire: 30000, // max time to get connection
          idle: 30000, // close idle connections after 30s
        },
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
        pool: {
          max: 30,
          min: 0,
          acquire: 60000,
          idle: 10000,
        },
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
