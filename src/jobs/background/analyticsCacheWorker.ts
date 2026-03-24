import { Job } from "bullmq";
import { USE_REDIS } from "../../config/env";
import { getQueue, createWorker } from "../../config/bullMQ";
import { analyticsApplicationService } from "../../services/admin/analytics.application.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("analytics-cache-worker");

export const ANALYTICS_CACHE_QUEUE = "analytics-cache";
const ANALYTICS_CACHE_JOB_NAME = "refresh-dashboard-cache";

interface AnalyticsCacheJobPayload {
  trigger: string;
  requestedAt: string;
}

export const enqueueAnalyticsCacheRefresh = async (
  trigger = "manual",
): Promise<void> => {
  if (USE_REDIS !== "true") {
    logger.warn("Redis disabled; skipping analytics cache queueing.");
    return;
  }

  const queue = getQueue(ANALYTICS_CACHE_QUEUE);

  await queue.add(
    ANALYTICS_CACHE_JOB_NAME,
    {
      trigger,
      requestedAt: new Date().toISOString(),
    } as AnalyticsCacheJobPayload,
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  );
};

export const analyticsCacheWorker = createWorker(
  ANALYTICS_CACHE_QUEUE,
  async (job: Job<AnalyticsCacheJobPayload>) => {
    const trigger = job.data?.trigger || "unknown";
    logger.info(`Refreshing analytics dashboard cache (trigger=${trigger})`);

    const payload = await analyticsApplicationService.warmDashboardCache(trigger);

    logger.info(
      `Dashboard analytics cache refreshed: successful=${payload.metrics.successful}, failed=${payload.metrics.failed}`,
    );
  },
  { concurrency: 1 },
);

