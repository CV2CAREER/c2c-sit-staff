import cron from "node-cron";
import { USE_REDIS } from "../../config/env";
import { enqueueDailySummaryDispatch } from "../background/dailySummaryWorker";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("daily-summary-cron-job");

export function createDailySummaryJob() {
  const job = cron.schedule(
    "0 9 * * *",
    async () => {
      if (USE_REDIS !== "true") {
        logger.warn("Redis disabled; skipping scheduled daily summary job.");
        return;
      }

      try {
        await enqueueDailySummaryDispatch("cron-daily");
        logger.info("Queued BullMQ daily summary job.");
      } catch (error: any) {
        logger.error(`Failed to queue daily summary job: ${error.message}`);
      }
    },
    {
      timezone: "Africa/Lagos",
    },
  );

  return job;
}
