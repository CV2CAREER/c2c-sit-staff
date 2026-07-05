import { ScheduledTask } from 'node-cron';
import { USE_REDIS, DATABASE_NAME } from '../../config/env';
import { getServiceLogger } from '../../utils/createLogger';
import { enqueueAnalyticsCacheRefresh } from '../background/analyticsCacheWorker';
import { createDailySummaryJob } from './daily-summary.job';
import { createAnalyticsCacheWarmupJob } from './analytics-cache.job';
import { createBotHealthJob } from './bot-health.job';
import { createTokenCleanUpJob } from './token-cleanup.job';
import { createSubscriptionCheckJob } from './subscription-check.job';
import { createSupportSessionCleanupJob } from './support-session-cleanup.job';
import { createSubscriptionExpiryReminderJob } from './subscription-expiry-reminder.job';
import { createPlacPipelineOpsReportJob } from './placementPipelineOpsReport.job';
import { createPipelineLeaderboardJob } from './pipelineLeaderboard.job';
import { createUnsatisfiedClientsJob } from './clientWithNoApplicationReport.job';

const logger = getServiceLogger('app-cron-jobs');

interface NamedJob {
  name: string;
  task: ScheduledTask;
}

let jobInstances: NamedJob[] = [];

export function startAllCronJobs() {
  logger.info('Starting cron jobs...');

  jobInstances = [
    { name: 'Token Clean Up Job', task: createTokenCleanUpJob() },
    {
      name: 'Analytics Cache Warmup Job',
      task: createAnalyticsCacheWarmupJob(),
    },
    { name: 'Daily Summary Job', task: createDailySummaryJob() },
    { name: 'Bot Health Job', task: createBotHealthJob() },
    { name: 'Subscription Check Job', task: createSubscriptionCheckJob() },
    {
      name: 'Support Session Cleanup Job',
      task: createSupportSessionCleanupJob(),
    },
    {
      name: 'Subscription Expiry Reminder Job',
      task: createSubscriptionExpiryReminderJob(),
    },
  ];

  // Reporting jobs are production-only: they post pipeline/client reports to
  // Slack and must not run against non-prod databases (e.g. staging/local).
  if (DATABASE_NAME === 'c2c_prod') {
    jobInstances.push(
      // Cron job: runs every Saturday at 12:10 AM WAT (Africa/Lagos timezone).
      {
        name: 'PlacPipeline Ops Report Job',
        task: createPlacPipelineOpsReportJob(),
      },
      // Cron job: runs daily at 12:00 AM WAT (Africa/Lagos timezone)
      {
        name: 'Pipeline Performance Leaderboard Job',
        task: createPipelineLeaderboardJob(),
      },
      // Cron job: runs daily at 12:05 AM WAT (Africa/Lagos timezone)
      {
        name: 'Client Without Application Activity',
        task: createUnsatisfiedClientsJob(),
      }
    );
  } else {
    logger.info(
      `Skipping prod-only reporting cron jobs (DB_NAME=${DATABASE_NAME ?? 'unset'})`
    );
  }

  jobInstances.forEach(({ name, task }) => {
    task.start();
    logger.info(`Started cron job: ${name}`);
  });

  if (USE_REDIS === 'true') {
    void enqueueAnalyticsCacheRefresh('startup').catch((error: any) => {
      logger.error(
        `Failed to queue startup analytics warmup: ${error.message}`
      );
    });
  }
}

export function stopAllCronJobs() {
  logger.info('Stopping all cron jobs...');

  jobInstances.forEach(({ name, task }) => {
    task.stop();
    logger.info(`Stopped cron job: ${name}`);
  });
}
