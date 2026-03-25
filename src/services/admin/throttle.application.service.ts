import { getConnectedRedis } from "../../config/redis";
import { AggregatorThrottleConfig } from "../../models/v1/aggregator-throttle-config.model";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { isRedisUsable } from "../../utils/helpers";

export interface AggregatorThrottleConfigPayload {
  enabled: boolean;
  maxConcurrentJobs: number;
  maxRequestsPerMinute: number;
  minDelayMs: number;
  perAggregator?: Record<
    string,
    Partial<Pick<
      AggregatorThrottleConfigPayload,
      "maxConcurrentJobs" | "maxRequestsPerMinute" | "minDelayMs"
    >>
  >;
}

export interface AggregatorThrottleStatus {
  config: AggregatorThrottleConfigPayload;
  updatedByUserId: string | null;
  updatedAt: string;
}

export interface UpdateAggregatorThrottleInput {
  config: Partial<AggregatorThrottleConfigPayload>;
  updatedByUserId: string;
}

const logger = getServiceLogger("throttle-service");

export const AGGREGATOR_THROTTLE_CACHE_KEY = "aggregator:throttle:v1";
const THROTTLE_CACHE_TTL_SECONDS = 6 * 60 * 60 + 300; // 6h + 5m

const DEFAULT_CONFIG: AggregatorThrottleConfigPayload = {
  enabled: true,
  maxConcurrentJobs: 10,
  maxRequestsPerMinute: 600,
  minDelayMs: 0,
};

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(Math.floor(num), max));
};

const normalizeConfig = (
  partial: Partial<AggregatorThrottleConfigPayload>,
): AggregatorThrottleConfigPayload => {
  const enabled =
    typeof partial.enabled === "boolean" ? partial.enabled : DEFAULT_CONFIG.enabled;

  const maxConcurrentJobs = clampInt(
    partial.maxConcurrentJobs,
    DEFAULT_CONFIG.maxConcurrentJobs,
    1,
    500,
  );
  const maxRequestsPerMinute = clampInt(
    partial.maxRequestsPerMinute,
    DEFAULT_CONFIG.maxRequestsPerMinute,
    1,
    1_000_000,
  );
  const minDelayMs = clampInt(partial.minDelayMs, DEFAULT_CONFIG.minDelayMs, 0, 60_000);

  const perAggregator =
    partial.perAggregator && typeof partial.perAggregator === "object"
      ? partial.perAggregator
      : undefined;

  return {
    enabled,
    maxConcurrentJobs,
    maxRequestsPerMinute,
    minDelayMs,
    perAggregator,
  };
};

const toStatus = (row: AggregatorThrottleConfig): AggregatorThrottleStatus => ({
  config: normalizeConfig(row.config || {}),
  updatedByUserId: row.updatedByUserId ?? null,
  updatedAt: row.updatedAt.toISOString(),
});

class ThrottleApplicationService {
  private async ensureSingleton(): Promise<AggregatorThrottleConfig> {
    const existing = await AggregatorThrottleConfig.findOne({ order: [["id", "ASC"]] });
    if (existing) return existing;

    logger.warn("Throttle config row missing; creating default singleton.");
    return AggregatorThrottleConfig.create({ config: DEFAULT_CONFIG });
  }

  private async writeRedis(config: AggregatorThrottleConfigPayload) {
    const redis = await getConnectedRedis();
    if (!isRedisUsable(redis)) return;

    const usableRedis = redis!;
    await usableRedis.set(
      AGGREGATOR_THROTTLE_CACHE_KEY,
      JSON.stringify({
        config,
        generatedAt: new Date().toISOString(),
      }),
      "EX",
      THROTTLE_CACHE_TTL_SECONDS,
    );
  }

  async getThrottleStatus(): Promise<AggregatorThrottleStatus> {
    const row = await this.ensureSingleton();
    return toStatus(row);
  }

  async updateThrottle(input: UpdateAggregatorThrottleInput): Promise<AggregatorThrottleStatus> {
    if (!input || !input.config || typeof input.config !== "object") {
      throw new ErrorHandler("Invalid throttle update payload.", 400);
    }

    const row = await this.ensureSingleton();
    const merged = normalizeConfig({ ...(row.config || {}), ...(input.config || {}) });

    row.config = merged as any;
    row.updatedByUserId = input.updatedByUserId;
    await row.save();

    // Publish to Redis for the aggregator engine to consume.
    await this.writeRedis(merged);

    return toStatus(row);
  }
}

export const throttleApplicationService = new ThrottleApplicationService();

