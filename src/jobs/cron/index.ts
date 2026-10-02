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
import { createAiVettingLearningReportJob } from './aiVettingLearningReport.job';
import { createBlogPublishJob } from './blog-publish.job';
import { createMissingInfoExpiryJob } from './missing-info-expiry.job';
import { createDiscoveryScheduleJob, reapStaleRunsOnStartup } from './discovery-schedule.job';
import { createDiscoveryDailySummaryJob } from './discovery-daily-summary.job';
import { createApplicationsStartedJob } from './applications-started.job';
import { createCheckinSchedulerJob } from './checkin-scheduler.job';
import { createOfferPlacementWatchJob } from './offer-placement-watch.job';

const logger = getServiceLogger('app-cron-jobs');

interface NamedJob {
  name: string;
  task: ScheduledTask;
}

let jobInstances: NamedJob[] = [];

export async function startAllCronJobs() {
  logger.info('Starting cron jobs...');

  // Reap any discovery runs orphaned by a previous server restart. This is
  // async but intentionally awaited so the scheduler starts clean.
  await reapStaleRunsOnStartup().catch((err: any) => {
    logger.error(`Startup stale-run reaper failed: ${err.message}`);
  });

  jobInstances = [
    { name: 'Token Clean Up Job', task: createTokenCleanUpJob() },
    {
      name: 'Analytics Cache Warmup Job',
      task: createAnalyticsCacheWarmupJob(),
    },
    { name: 'Daily Summary Job', task: createDailySummaryJob() },
    { name: 'Bot Health Job', task: createBotHealthJob() },
    { name: 'Blog Publish Job', task: createBlogPublishJob() },
    { name: 'Subscription Check Job', task: createSubscriptionCheckJob() },
    {
      name: 'Support Session Cleanup Job',
      task: createSupportSessionCleanupJob(),
    },
    {
      name: 'Subscription Expiry Reminder Job',
      task: createSubscriptionExpiryReminderJob(),
    },
    {
      name: 'Missing Info Expiry Job',
      task: createMissingInfoExpiryJob(),
    },
    {
      name: 'Discovery Schedule Job',
      task: createDiscoveryScheduleJob(),
    },
    {
      name: 'Discovery Daily Summary Job',
      task: createDiscoveryDailySummaryJob(),
    },
    // SPR-21-13-003 — derives the applications_started journey tick from the
    // shared `applications` table (written by the external extractor); runs on
    // every environment so IAT exercises the same path prod will.
    {
      name: 'Applications Started Job',
      task: createApplicationsStartedJob(),
    },
    // SPR-21-13-001 — Week 4 / Week 12 check-in emails at campaign day 28 /
    // day 84; eligibility is computed entirely in SQL (fresh 24h window,
    // campaign still live, active plan for week 12) and ineligible rows get
    // NO action at all. Every environment so IAT exercises the same path.
    {
      name: 'Check-in Scheduler Job',
      task: createCheckinSchedulerJob(),
    },
    // SPR-21-13-005 — offer/placement recordings (either side, shared
    // client_journey_steps table) re-fire the Pipeline Performance
    // Leaderboard within a minute; every environment so IAT can verify the
    // "leaderboard update fires" DoD check (Slack routes to CRY_WOLF
    // off-prod).
    {
      name: 'Offer Placement Leaderboard Watch Job',
      task: createOfferPlacementWatchJob(),
    },
  ];

  // Reporting jobs are production-only: they post pipeline/client reports to
  // Slack and must not run against non-prod databases (e.g. staging/local).
  if (DATABASE_NAME === 'prod-pool') {
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
      },
      // Cron job: runs every Monday at 8:30 AM WAT (Africa/Lagos timezone)
      {
        name: 'AI Vetting Learning Report Job',
        task: createAiVettingLearningReportJob(),
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
