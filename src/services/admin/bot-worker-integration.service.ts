import { getQueue } from "../../config/bullMQ";
import { BACKEND_URL, BOT_SCRAPING_QUEUES, SLACK_ADMIN_CHANNEL_ID, USE_REDIS } from "../../config/env";
import { getConnectedRedis } from "../../config/redis";
import { SlackService } from "../slack.service";
import { getServiceLogger } from "../../utils/createLogger";
import { isRedisUsable } from "../../utils/helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";

export type BotQueueStatus = "running" | "paused" | "unavailable";

export interface ScrapingQueueHealth {
  name: string;
  status: BotQueueStatus;
  paused?: boolean;
  counts?: Record<string, number>;
  error?: string;
}

const logger = getServiceLogger("bot-worker-integration");

const ALERT_DEDUPE_TTL_SECONDS = 30 * 60;

const getAlertChannel = () => SLACK_ADMIN_CHANNEL_ID || SlackChannel.CRY_WOLF;

const buildDedupeKey = (queueName: string) =>
  `admin:bot:status-unavailable:v1:${queueName}`;

class BotWorkerIntegrationService {
  getScrapingQueueNames(): string[] {
    return BOT_SCRAPING_QUEUES;
  }

  async pauseScrapingQueues(trigger: string) {
    if (USE_REDIS !== "true") {
      logger.warn("Redis disabled; skipping scraping queue pause.");
      return;
    }

    const queues = this.getScrapingQueueNames();
    if (queues.length === 0) {
      logger.warn("No BOT_SCRAPING_QUEUES configured; nothing to pause.");
      return;
    }

    await Promise.all(
      queues.map(async (name) => {
        const queue = getQueue(name);
        await queue.pause();
        logger.info(`Paused queue=${name} (trigger=${trigger})`);
      }),
    );
  }

  async resumeScrapingQueues(trigger: string) {
    if (USE_REDIS !== "true") {
      logger.warn("Redis disabled; skipping scraping queue resume.");
      return;
    }

    const queues = this.getScrapingQueueNames();
    if (queues.length === 0) {
      logger.warn("No BOT_SCRAPING_QUEUES configured; nothing to resume.");
      return;
    }

    await Promise.all(
      queues.map(async (name) => {
        const queue = getQueue(name);
        await queue.resume();
        logger.info(`Resumed queue=${name} (trigger=${trigger})`);
      }),
    );
  }

  async getScrapingQueuesHealth(): Promise<ScrapingQueueHealth[]> {
    const queues = this.getScrapingQueueNames();
    if (queues.length === 0) {
      return [];
    }

    return Promise.all(
      queues.map(async (name) => {
        try {
          const queue = getQueue(name);
          const paused = await queue.isPaused();
          const counts = await queue.getJobCounts(
            "waiting",
            "active",
            "delayed",
            "failed",
            "paused",
          );

          return {
            name,
            status: paused ? "paused" : "running",
            paused,
            counts: Object.fromEntries(
              Object.entries(counts).map(([key, value]) => [key, Number(value) || 0]),
            ),
          } satisfies ScrapingQueueHealth;
        } catch (error: any) {
          return {
            name,
            status: "unavailable",
            error: error?.message || String(error),
          } satisfies ScrapingQueueHealth;
        }
      }),
    );
  }

  private async shouldAlert(queueName: string): Promise<boolean> {
    const redis = await getConnectedRedis();
    if (!isRedisUsable(redis)) {
      return true; // no dedupe without Redis
    }

    const usableRedis = redis!;
    const key = buildDedupeKey(queueName);
    const existing = await usableRedis.get(key);
    if (existing) {
      return false;
    }

    await usableRedis.set(key, "1", "EX", ALERT_DEDUPE_TTL_SECONDS);
    return true;
  }

  async alertStatusUnavailable(health: ScrapingQueueHealth, trigger: string) {
    if (!(await this.shouldAlert(health.name))) {
      return;
    }

    await SlackService.notify({
      node: SlackNode.PROCESSING_SERVER,
      provider: SlackProvider.REDIS,
      severity: SlackSeverity.CRITICAL,
      type: SlackEventType.ERROR_ALERT,
      trigger: `Bot Status Unavailable (${health.name})`,
      channel: getAlertChannel(),
      host: BACKEND_URL,
      body: [
        `Bot queue entered Status unavailable.`,
        `Queue: ${health.name}`,
        `Trigger: ${trigger}`,
        `Error: ${health.error || "Unknown error"}`,
        `Impact: Scraping tasks may be paused or failing to execute.`,
        `Next steps: Check Redis/BullMQ connectivity and worker logs.`,
      ].join("\n"),
    });
  }
}

export const botWorkerIntegrationService = new BotWorkerIntegrationService();

