import { ScheduledTask } from "node-cron";
import { USE_REDIS } from "../../config/env";
import { getServiceLogger } from "../../utils/createLogger";
import { enqueueAnalyticsCacheRefresh } from "../background/analyticsCacheWorker";
import { createDailySummaryJob } from "./daily-summary.job";
import { createAnalyticsCacheWarmupJob } from "./analytics-cache.job";
import { createBotHealthJob } from "./bot-health.job";
import { createTokenCleanUpJob } from "./token-cleanup.job";
import { createSubscriptionCheckJob } from "./subscription-check.job";

const logger = getServiceLogger("app-cron-jobs");

interface NamedJob {
  name: string;
  task: ScheduledTask;
}

let jobInstances: NamedJob[] = [];
export function startAllCronJobs() {
  logger.info("Starting cron jobs...");

  jobInstances = [
    { name: "Token Clean Up Job", task: createTokenCleanUpJob() },
    { name: "Analytics Cache Warmup Job", task: createAnalyticsCacheWarmupJob() },
    { name: "Daily Summary Job", task: createDailySummaryJob() },
    { name: "Bot Health Job", task: createBotHealthJob() },
    { name: "Subscription Check Job", task: createSubscriptionCheckJob() },
  ];

  jobInstances.forEach(({ name, task }) => {
    task.start();
    logger.info(`Started cron job: ${name}`);
  });

  if (USE_REDIS === "true") {
    void enqueueAnalyticsCacheRefresh("startup").catch((error: any) => {
      logger.error(`Failed to queue startup analytics warmup: ${error.message}`);
    });
  }
}

export function stopAllCronJobs() {
  logger.info("Stopping all cron jobs...");

  jobInstances.forEach(({ name, task }) => {
    task.stop();
    logger.info(`Stopped cron job: ${name}`);
  });
}