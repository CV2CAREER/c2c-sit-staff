import cron from "node-cron";
import { USE_REDIS } from "../../config/env";
import { enqueueAnalyticsCacheRefresh } from "../background/analyticsCacheWorker";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("analytics-cache-cron-job");

export function createAnalyticsCacheWarmupJob() {
  const job = cron.schedule("0 */6 * * *", async () => {
    if (USE_REDIS !== "true") {
      logger.warn("Redis disabled; skipping scheduled analytics cache warmup.");
      return;
    }

    try {
      await enqueueAnalyticsCacheRefresh("cron-6h");
      logger.info("Queued BullMQ analytics cache warmup job.");
    } catch (error: any) {
      logger.error(`Failed to queue analytics cache warmup: ${error.message}`);
    }
  });

  return job;
}

