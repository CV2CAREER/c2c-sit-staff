import { getConnectedRedis } from "../../config/redis";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { isRedisUsable } from "../../utils/helpers";
import { auditTrailApplicationService } from "./audit-trail.application.service";
import { systemConfigApplicationService } from "./system-config.application.service";

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

export interface AggregatorThrottleConfig {
  config: AggregatorThrottleConfigPayload;
  updatedByUserId: string | null;
  updatedAt: Date;
}

export interface UpdateAggregatorThrottleInput {
  config: Partial<AggregatorThrottleConfigPayload>;
  updatedByUserId: string;
}

const logger = getServiceLogger("throttle-service");

export const AGGREGATOR_THROTTLE_CACHE_KEY = "aggregator:throttle:v1";
const THROTTLE_CACHE_TTL_SECONDS = 6 * 60 * 60 + 300; // 6h + 5m
const SYSTEM_CONFIG_KEY = "aggregator.throttle";

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

class ThrottleApplicationService {
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
    const fresh = await systemConfigApplicationService.getOrCreate(
      SYSTEM_CONFIG_KEY,
      DEFAULT_CONFIG,
    );

    return {
      config: normalizeConfig(fresh.value || {}),
      updatedByUserId: fresh.updatedByUserId ?? null,
      updatedAt: fresh.updatedAt,
    };
  }

  async deletePerAggregatorThrottle(
    aggregatorName: string,
    updatedByUserId: string,
  ): Promise<AggregatorThrottleStatus> {
    if (!aggregatorName || typeof aggregatorName !== "string") {
      throw new ErrorHandler("Aggregator name is required for deletion.", 400);
    }

    const before = await this.getThrottleStatus();
    const currentPerAggregator = before.config.perAggregator ?? {};

    if (!(aggregatorName in currentPerAggregator)) {
      throw new ErrorHandler(`Aggregator "${aggregatorName}" not found in throttle config.`, 404);
    }

    const { [aggregatorName]: _removed, ...remaining } = currentPerAggregator;

    const updated: AggregatorThrottleConfigPayload = {
      ...before.config,
      perAggregator: Object.keys(remaining).length > 0 ? remaining : undefined,
    };

    const saved = await systemConfigApplicationService.set({
      key: SYSTEM_CONFIG_KEY,
      value: updated,
      updatedByUserId,
    });

    await this.writeRedis(updated);

    const status: AggregatorThrottleStatus = {
      config: normalizeConfig(saved.value || {}),
      updatedByUserId: saved.updatedByUserId ?? null,
      updatedAt: saved.updatedAt,
    };

    await auditTrailApplicationService.log({
      action: "AGGREGATOR_THROTTLE_DELETE",
      actorUserId: updatedByUserId,
      targetType: "SystemConfig",
      targetKey: SYSTEM_CONFIG_KEY,
      before,
      after: status,
    });

    return status;
  }

  async updateThrottle(input: UpdateAggregatorThrottleInput): Promise<AggregatorThrottleStatus> {
    if (!input || !input.config || typeof input.config !== "object") {
      throw new ErrorHandler("Invalid throttle update payload.", 400);
    }

    const before = await this.getThrottleStatus();
    const merged = normalizeConfig({ ...(before.config || {}), ...(input.config || {}) });

    const saved = await systemConfigApplicationService.set({
      key: SYSTEM_CONFIG_KEY,
      value: merged,
      updatedByUserId: input.updatedByUserId,
    });

    // Publish to Redis for the aggregator engine to consume.
    await this.writeRedis(merged);

    const status: AggregatorThrottleStatus = {
      config: normalizeConfig(saved.value || {}),
      updatedByUserId: saved.updatedByUserId ?? null,
      updatedAt: saved.updatedAt,
    };

    await auditTrailApplicationService.log({
      action: "AGGREGATOR_THROTTLE_UPDATE",
      actorUserId: input.updatedByUserId,
      targetType: "SystemConfig",
      targetKey: SYSTEM_CONFIG_KEY,
      before,
      after: status,
    });

    return status;
  }
}

export const throttleApplicationService = new ThrottleApplicationService();
