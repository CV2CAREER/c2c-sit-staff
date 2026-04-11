import { ENVIRONMENTNAME } from "../constants/constants";
import { setDbReady } from "../middlewares/dbReady";
import { ensureInFlightIndexes } from "../services/admin/in-flight.index-bootstrap.service";
import { getServiceLogger } from "../utils/createLogger";
import { ensureAnalyticsIndexes } from "../services/admin/analytics.index-bootstrap.service";
import { getSequelize, resetSequelize } from "../utils/sequelize";
import { NODE_ENV } from "./env";

const logger = getServiceLogger(`${ENVIRONMENTNAME} database`);

const isProduction = NODE_ENV !== "local";

export const connectDB = async (): Promise<void> => {
  const initialDelay = 5000; // 5s
  const maxDelay = 30000; // 30s
  const factor = 2;
  let delay = initialDelay;

  while (true) {
    try {
      // 🟢 Always create a fresh Sequelize instance
      const newSequelize = getSequelize();

      logger.info(`📊 Attempting ${ENVIRONMENTNAME} DB connection...`);

      await newSequelize.authenticate();
      logger.info(`✅ ${ENVIRONMENTNAME} Database CONNECTED`);

      setDbReady(true);

      // Optional sync for dev environments
      if (isProduction) {
        logger.info(`${ENVIRONMENTNAME} Database syncing...`);
        const start = Date.now();

        const queryInterface = newSequelize.getQueryInterface();
        const tablesBefore: string[] = await queryInterface.showAllTables();

        // ✅ ADD YOUR TARGETED SYNCS HERE — remove after deployment
        // await User.sync({ alter: true });                      // example of altering existing table
        // await SupportSession.sync({ force: false });         // new table
        // await SupportConversation.sync({ force: false });    // new table


        // 📸 Snapshot AFTER your targeted syncs
        const tablesAfterSync: string[] = await queryInterface.showAllTables();

        const alteredTables: string[] = []; // just note it manually

        const newlyCreated = tablesAfterSync.filter(
          (table) => !tablesBefore.includes(table),
        );

        // Only sync on first deploy when tables don't exist yet
        if (tablesBefore.length === 0) {
          await newSequelize.sync({ force: false });

          const tablesAfter: string[] = await queryInterface.showAllTables();
          logger.info(
            `${ENVIRONMENTNAME}: ${tablesAfter.length} new table(s) created: [${tablesAfter.join(", ")}]`,
          );
          logger.info(
            `${ENVIRONMENTNAME}: Total tables in DB: ${tablesAfter.length}`,
          );
        } else {
          if (newlyCreated.length > 0) {
            logger.info(
              `${ENVIRONMENTNAME}: ${newlyCreated.length} new table(s) added: [${newlyCreated.join(", ")}]`,
            );
          }
          if (alteredTables.length > 0) {
            logger.info(
              `${ENVIRONMENTNAME}: ${alteredTables.length} table(s) altered: [${alteredTables.join(", ")}]`,
            );
          }

          logger.info(
            `${ENVIRONMENTNAME}: Tables already exist, skipping sync`,
          );
          logger.info(
            `${ENVIRONMENTNAME}: Total tables in DB: ${tablesAfterSync.length} tables`,
          );
        }

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        logger.info(`${ENVIRONMENTNAME}: Database synced (took ${duration}s)`);
      } else {
        logger.info("LOCAL: Database syncing...");
        const start = Date.now();
        const queryInterface = newSequelize.getQueryInterface();

        // Get tables BEFORE sync
        const tablesBefore: string[] = await queryInterface.showAllTables();

        await newSequelize.sync({ alter: true });

        // Get tables AFTER sync
        const tablesAfter: string[] = await queryInterface.showAllTables();

        const newlyCreated = tablesAfter.filter(
          (table) => !tablesBefore.includes(table),
        );
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        if (newlyCreated.length > 0) {
          logger.info(
            `LOCAL: ${newlyCreated.length} new table(s) created: [${newlyCreated.join(", ")}]`,
          );
        }

        logger.info(
          `LOCAL: Total tables in DB: ${tablesAfter.length} Tables (took ${duration}s)`,
        );
      }

      await ensureAnalyticsIndexes();
      await ensureInFlightIndexes();

      return; // ✅ exit once connected
    } catch (error: any) {
      let friendlyMessage = "Unknown DB connection error";

      if (error?.name === "SequelizeConnectionRefusedError") {
        friendlyMessage =
          "Database is still sleeping or refusing connections ❌";
      } else if (error?.name === "SequelizeConnectionTimedOutError") {
        friendlyMessage = "Database connection attempt timed out ⏱️";
      } else if (error?.name === "SequelizeHostNotFoundError") {
        friendlyMessage =
          "Database host not found 🔍 — check your DATABASE_URL";
      } else if (error?.name === "SequelizeHostNotReachableError") {
        friendlyMessage =
          "Database host not reachable 🌐 — possible network/VPC issue";
      } else if (error?.name === "SequelizeInvalidConnectionError") {
        friendlyMessage = "Invalid DB connection parameters ⚙️";
      }

      logger.error(`❌ DB connection failed: ${friendlyMessage}`);
      logger.warn("Full error details:", error);
      setDbReady(false);

      logger.warn(`🔄 Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      delay = Math.min(delay * factor, maxDelay);
    }
  }
};

let reconnecting = false;

let watchdogInterval: NodeJS.Timeout | null = null;

export const startDbWatchdog = (
  interval = isProduction ? 120000 : 15000,
  pingTimeout = 10000,
) => {
  const pingLoop = async () => {
    try {
      // ✅ Get FRESH instance every time
      const sequelize = getSequelize();

      // Ping DB with timeout protection
      await Promise.race([
        sequelize.query("SELECT 1"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DB ping timeout")), pingTimeout),
        ),
      ]);

      setDbReady(true);
      logger.info("✅ Database is alive");
    } catch (err: any) {
      logger.error("⚠️ Database ping failed. Reconnecting...");

      if (reconnecting) {
        logger.warn("⏳ Reconnect already in progress, skipping...");
        return; // ← Use return instead of else
      }

      reconnecting = true;
      setDbReady(false);

      try {
        await resetSequelize();

        // ✅ Verify the new connection works
        const newSequelize = getSequelize();
        await newSequelize.query("SELECT 1");

        logger.info("🔄 Database reconnected successfully");
        setDbReady(true);
      } catch (reconnectErr: any) {
        logger.error("❌ Failed to reconnect:", reconnectErr.message);
        setDbReady(false);
      } finally {
        reconnecting = false;
      }
    }
  };

  // Start the loop immediately
  pingLoop();
  watchdogInterval = setInterval(pingLoop, interval);
};

export const stopDbWatchdog = () => {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    logger.info("🛑 Database watchdog stopped");
  }
};

export const disconnectDB = async () => {
  const sequelize = getSequelize();
  try {
    logger.warn("Attempting to shutdown database connection...");
    await sequelize.close();
    logger.warn("Database connection closed");
  } catch (error) {
    logger.error("Failed to disconnect database" + error);
    throw new Error("Database FAILED to disconnect");
  }
};

