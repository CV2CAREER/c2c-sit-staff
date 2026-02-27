import { ScheduledTask } from "node-cron";
import { getServiceLogger } from "../../utils/createLogger";
import { createTokenCleanUpJob } from "./token-cleanup.job";

const logger = getServiceLogger("app-cron-jobs");

interface NamedJob {
  name: string;
  task: ScheduledTask;
}

let jobInstances: NamedJob[] = [];
export function startAllCronJobs() {
  logger.info("⏰ Starting cron jobs...");

  jobInstances = [
    { name: "Token Clean Up Job", task: createTokenCleanUpJob() },
  ].flat();

  jobInstances.forEach(({ name, task }) => {
    task.start();
    logger.info(`✅ Started cron job: ${name}`);
  });
}

export function stopAllCronJobs() {
  logger.info("⏹️ Stopping all cron jobs...");

  jobInstances.forEach(({ name, task }) => {
    task.stop();
    logger.info(`🛑 Stopped cron job: ${name}`);
  });
}
