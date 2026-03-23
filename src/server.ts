import http from "http";
import { app } from "./app";
import dotenv from "dotenv";
import { PORT } from "./config/env";
import { getServiceLogger } from "./utils/createLogger";
import { connectDB, disconnectDB, startDbWatchdog } from "./config/database";
import {
  connectRedis,
  disconnectRedis,
  getUserRedisDbReady,
  startRedisReconnectInterval,
} from "./config/redis";
import { startAllCronJobs, stopAllCronJobs } from "./jobs/cron";
import { ENVIRONMENTNAME } from "./constants/constants";
import { initializeBullMQWorkers } from "./jobs/background";
import { closeBullMQ } from "./config/bullMQ";
import { getDbReady } from "./middlewares/dbReady";

// load environment variables
dotenv.config();

const logger = getServiceLogger("server");

// create server
export const server = http.createServer(app);

// Graceful shutdown
const shutdown = async () => {
  logger.warn("Server shutdown initiated...");

  // Stop cron jobs FIRST before closing connections
  logger.info("Stopping cron jobs...");
  stopAllCronJobs();

  // Wait a bit for any running jobs to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));

  logger.info("Disconnecting Redis...");
  await disconnectRedis();

  logger.info("Closing BullMQ...");
  await closeBullMQ();

  logger.info("Disconnecting Database...");
  await disconnectDB();

  logger.warn("HTTP server closed. Exiting now.");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const startServer = async () => {
  try {
    logger.info("🚀 Starting server initialization...");

    server.listen(PORT, async () => {
      logger.info(`SERVER IS RUNNING ON PORT ${PORT}`);
      logger.info(`📚 Swagger documentation available at: http://localhost:${PORT}/api-docs`);

      // connected redis
      await connectRedis();

      if (getUserRedisDbReady()) {
        // Start Redis reconnect watchdog (independent of DB)
        startRedisReconnectInterval();

        // Initialize BullMQ workers
        initializeBullMQWorkers();
      }

      // Initial DB connection with retry
      try {
        await connectDB();
        logger.info(`📊 ${ENVIRONMENTNAME} Database connected & synced`);

        if (getDbReady()) {
          logger.info("DB Ready to take connections...");
          // Start background jobs (runs even if DB reconnects later)
          startAllCronJobs();

          // Start watchdog (keeps DB alive, auto-reconnect if lost)
          startDbWatchdog();
        }
      } catch (err: any) {
        logger.error(
          "❌ Could not connect to database on startup: " + err.message,
        );
      }
    });
  } catch (error: any) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
