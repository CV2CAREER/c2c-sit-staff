import cron from "node-cron";
import { USE_REDIS } from "../../config/env";
import { adminControlApplicationService } from "../../services/admin/admin-control.application.service";
import { botWorkerIntegrationService } from "../../services/admin/bot-worker-integration.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("bot-health-cron-job");

export function createBotHealthJob() {
  const job = cron.schedule("*/5 * * * *", async () => {
    if (USE_REDIS !== "true") {
      logger.warn("Redis disabled; skipping bot health check.");
      return;
    }

    try {
      const status = await adminControlApplicationService.getStatus(true);
      if (!status.botEnabled) {
        return; // bot is intentionally off
      }

      const health = await botWorkerIntegrationService.getScrapingQueuesHealth();
      for (const queue of health) {
        if (queue.status === "unavailable") {
          await botWorkerIntegrationService.alertStatusUnavailable(
            queue,
            "cron-healthcheck",
          );
        }
      }
    } catch (error: any) {
      logger.error(`Bot health check failed: ${error?.message || error}`);
    }
  });

  return job;
}

