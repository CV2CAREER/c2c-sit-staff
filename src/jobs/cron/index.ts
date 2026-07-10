import { ScheduledTask } from "node-cron";
import { USE_REDIS } from "../../config/env";
import { getServiceLogger } from "../../utils/createLogger";
import { enqueueAnalyticsCacheRefresh } from "../background/analyticsCacheWorker";
import { createDailySummaryJob } from "./daily-summary.job";
import { createAnalyticsCacheWarmupJob } from "./analytics-cache.job";
import { createBotHealthJob } from "./bot-health.job";
import { createTokenCleanUpJob } from "./token-cleanup.job";
import { createSubscriptionCheckJob } from "./subscription-check.job";
import { createSupportSessionCleanupJob } from "./support-session-cleanup.job";
import { createSubscriptionExpiryReminderJob } from "./subscription-expiry-reminder.job";
// import { createPlacPipelineOpsReportJob } from "./placementPipelineOpsReport.job";
// import { createPipelineLeaderboardJob } from "./pipelineLeaderboard.job";

const logger = getServiceLogger("app-cron-jobs");

interface NamedJob {
  name: string;
  task: ScheduledTask;
}

let jobInstances: NamedJob[] = [];

export function startAllCronJobs() {
  logger.info("Starting cron jobs...");

  jobInstances = [
    { name: "Token Clean Up Job",                 task: createTokenCleanUpJob() },
    { name: "Analytics Cache Warmup Job",         task: createAnalyticsCacheWarmupJob() },
    { name: "Daily Summary Job",                  task: createDailySummaryJob() },
    { name: "Bot Health Job",                     task: createBotHealthJob() },
    { name: "Subscription Check Job",             task: createSubscriptionCheckJob() },
    { name: "Support Session Cleanup Job",        task: createSupportSessionCleanupJob() },
    { name: "Subscription Expiry Reminder Job",   task: createSubscriptionExpiryReminderJob() },
    // Runs at 07:00 UTC (08:00 WAT) — full ops snapshot for the day
    // { name: "PlacPipeline Ops Report Job",        task: createPlacPipelineOpsReportJob() },
    // Runs at 07:05 UTC (08:05 WAT) — yesterday's leaderboard, 5 min after ops report
    // { name: "Pipeline Performance Leaderboard Job", task: createPipelineLeaderboardJob() },
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
