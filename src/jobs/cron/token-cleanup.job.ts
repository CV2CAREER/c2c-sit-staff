import cron from "node-cron";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("token-cleanup-job");

export function createTokenCleanUpJob() {
  const job = cron.schedule("*/7 * * * *", async () => {
    logger.warn("Checking for expired tokens...");
  });

  return job;
}
