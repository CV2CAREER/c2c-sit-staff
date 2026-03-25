import { Job } from "bullmq";
import { USE_REDIS } from "../../config/env";
import { createWorker, getQueue } from "../../config/bullMQ";
import { dailySummaryApplicationService } from "../../services/admin/daily-summary.application.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("daily-summary-worker");

export const DAILY_SUMMARY_QUEUE = "daily-summary";
const DAILY_SUMMARY_JOB_NAME = "dispatch-daily-summary";

interface DailySummaryJobPayload {
  trigger: string;
  summaryDate?: string;
  force?: boolean;
  requestedAt: string;
}

const getSummaryDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
};

export const enqueueDailySummaryDispatch = async (
  trigger = "manual",
  summaryDate?: string,
  force = false,
): Promise<void> => {
  if (USE_REDIS !== "true") {
    logger.warn("Redis disabled; skipping daily summary queueing.");
    return;
  }

  const queue = getQueue(DAILY_SUMMARY_QUEUE);
  const queueDate = summaryDate || getSummaryDate(new Date());

  await queue.add(
    DAILY_SUMMARY_JOB_NAME,
    {
      trigger,
      summaryDate: queueDate,
      force,
      requestedAt: new Date().toISOString(),
    } as DailySummaryJobPayload,
    {
      jobId: `${DAILY_SUMMARY_JOB_NAME}:${queueDate}`,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10_000,
      },
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  );
};

export const dailySummaryWorker = createWorker(
  DAILY_SUMMARY_QUEUE,
  async (job: Job<DailySummaryJobPayload>) => {
    const result = await dailySummaryApplicationService.processDailySummary({
      trigger: job.data?.trigger || "unknown",
      summaryDate: job.data?.summaryDate,
      force: Boolean(job.data?.force),
    });

    const failures = [result.slack, result.zoho].filter(
      (step) => !step.skipped && !step.delivered,
    );

    if (failures.length > 0) {
      throw new Error(failures.map((step) => step.message).join(" | "));
    }

    logger.info(
      `Daily summary processed for ${result.snapshot.summaryDate} (slack=${result.slack.message}, zoho=${result.zoho.message})`,
    );
  },
  { concurrency: 1 },
);
