import { QueryTypes } from "sequelize";
import { getConnectedRedis } from "../../config/redis";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { isRedisUsable } from "../../utils/helpers";
import { getSequelize } from "../../utils/sequelize";
import { getApplicationsTableShape } from "./analytics.table-shape.service";

export interface AnalyticsWindowInput {
  from?: string;
  to?: string;
  bypassCache?: boolean;
}

interface SourceMetrics {
  successful: number;
  failed: number;
}

export interface AnalyticsResponse {
  range: {
    from: string;
    to: string;
  };
  metrics: {
    successful: number;
    failed: number;
  };
  breakdown: Record<string, SourceMetrics>;
  generatedAt: string;
}

interface SourceMetricsRow {
  source: string;
  successful: string | number;
  failed: string | number;
}

const DEFAULT_LOOKBACK_DAYS = 30;
const WINDOW_CACHE_TTL_SECONDS = 300;
const DASHBOARD_CACHE_TTL_SECONDS = 6 * 60 * 60 + 300; // 6h + 5m
const APPLICATIONS_TABLE = "applications";

export const ADMIN_ANALYTICS_DASHBOARD_CACHE_KEY =
  "admin:analytics:dashboard:v1:latest";

const logger = getServiceLogger("analytics-application-service");

const toNumber = (value: string | number): number => Number(value) || 0;

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, "\"\"")}"`;

const parseDate = (value: string, label: "from" | "to"): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ErrorHandler(
      `Invalid ${label} date. Use a valid ISO-8601 date string.`,
      400,
    );
  }
  return parsed;
};

const resolveWindow = (input: AnalyticsWindowInput): { from: Date; to: Date } => {
  const parsedTo = input.to ? parseDate(input.to, "to") : new Date();
  const defaultFrom = new Date(
    parsedTo.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );
  const parsedFrom = input.from ? parseDate(input.from, "from") : defaultFrom;

  if (parsedFrom >= parsedTo) {
    throw new ErrorHandler("The `from` date must be earlier than `to` date.", 400);
  }

  return { from: parsedFrom, to: parsedTo };
};

const buildWindowCacheKey = (fromIso: string, toIso: string) =>
  `admin:analytics:v1:${fromIso}:${toIso}`;

const isDefaultWindowRequest = (input: AnalyticsWindowInput) =>
  !input.from && !input.to;

class AnalyticsApplicationService {
  private buildApplicationsSelect(shape: {
    createdAtColumn: string;
    deletedAtColumn?: string;
    statusColumn: string;
  }): string {
    const createdAtColumn = quoteIdentifier(shape.createdAtColumn);
    const statusColumn = quoteIdentifier(shape.statusColumn);
    const normalizedStatus = `LOWER(CAST(${statusColumn} AS TEXT))`;
    const deletedAtCondition = shape.deletedAtColumn
      ? `AND ${quoteIdentifier(shape.deletedAtColumn)} IS NULL`
      : "";

    return `
      SELECT
        'applications'::text AS source,
        COUNT(*) FILTER (
          WHERE app_scope.normalized_status = 'successful'
        )::bigint AS successful,
        COUNT(*) FILTER (
          WHERE app_scope.normalized_status = 'failed'
        )::bigint AS failed
      FROM (
        SELECT ${normalizedStatus} AS normalized_status
        FROM ${APPLICATIONS_TABLE}
        WHERE ${createdAtColumn} >= :from
          AND ${createdAtColumn} < :to
          ${deletedAtCondition}
      ) AS app_scope
    `;
  }

  private async buildSourceSelects(): Promise<string[]> {
    const sourceSelects = [
      `
        SELECT
          'plans'::text AS source,
          COUNT(*) FILTER (WHERE "paymentStatus" = 'completed')::bigint AS successful,
          COUNT(*) FILTER (WHERE "paymentStatus" = 'failed')::bigint AS failed
        FROM plans
        WHERE "createdAt" >= :from
          AND "createdAt" < :to
          AND "deletedAt" IS NULL
      `,
      `
        SELECT
          'users'::text AS source,
          COUNT(*) FILTER (WHERE "applicationStatus" = 'Commenced')::bigint AS successful,
          COUNT(*) FILTER (WHERE "applicationStatus" = 'Expired')::bigint AS failed
        FROM users
        WHERE "createdAt" >= :from
          AND "createdAt" < :to
          AND "deletedAt" IS NULL
      `,
    ];

    const applicationsTableShape = await getApplicationsTableShape();
    if (applicationsTableShape) {
      sourceSelects.push(this.buildApplicationsSelect(applicationsTableShape));
    }

    return sourceSelects;
  }

  private buildAggregateQuery(sourceSelects: string[]): string {
    return `
      WITH source_counts AS (
        ${sourceSelects.join("\nUNION ALL\n")}
      )
      SELECT source, successful, failed
      FROM source_counts
    `;
  }

  private async executeAggregateQuery(
    fromIso: string,
    toIso: string,
  ): Promise<SourceMetricsRow[]> {
    const sequelize = getSequelize();
    const sourceSelects = await this.buildSourceSelects();
    const query = this.buildAggregateQuery(sourceSelects);

    return sequelize.query<SourceMetricsRow>(query, {
      type: QueryTypes.SELECT,
      replacements: {
        from: fromIso,
        to: toIso,
      },
    });
  }

  private buildPayload(
    rows: SourceMetricsRow[],
    fromIso: string,
    toIso: string,
  ): AnalyticsResponse {
    const breakdown = rows.reduce<Record<string, SourceMetrics>>((acc, row) => {
      acc[row.source] = {
        successful: toNumber(row.successful),
        failed: toNumber(row.failed),
      };
      return acc;
    }, {});

    const metrics = Object.values(breakdown).reduce(
      (acc, row) => {
        acc.successful += row.successful;
        acc.failed += row.failed;
        return acc;
      },
      { successful: 0, failed: 0 },
    );

    return {
      range: {
        from: fromIso,
        to: toIso,
      },
      metrics,
      breakdown,
      generatedAt: new Date().toISOString(),
    };
  }

  private async computePayload(
    fromIso: string,
    toIso: string,
  ): Promise<AnalyticsResponse> {
    const rows = await this.executeAggregateQuery(fromIso, toIso);
    return this.buildPayload(rows, fromIso, toIso);
  }

  private async readCachedPayload(
    redis: any,
    cacheKey: string,
  ): Promise<AnalyticsResponse | null> {
    if (!redis) {
      return null;
    }

    const cached = await redis.get(cacheKey);
    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as AnalyticsResponse;
    } catch {
      return null;
    }
  }

  private async writeCachedPayload(
    redis: any,
    cacheKey: string,
    payload: AnalyticsResponse,
    ttlSeconds: number,
  ) {
    if (!redis) {
      return;
    }

    await redis.set(cacheKey, JSON.stringify(payload), "EX", ttlSeconds);
  }

  async warmDashboardCache(trigger = "manual"): Promise<AnalyticsResponse> {
    const window = resolveWindow({});
    const fromIso = window.from.toISOString();
    const toIso = window.to.toISOString();
    const windowCacheKey = buildWindowCacheKey(fromIso, toIso);

    const payload = await this.computePayload(fromIso, toIso);

    const redis = await getConnectedRedis();
    if (isRedisUsable(redis)) {
      await Promise.all([
        this.writeCachedPayload(
          redis,
          ADMIN_ANALYTICS_DASHBOARD_CACHE_KEY,
          payload,
          DASHBOARD_CACHE_TTL_SECONDS,
        ),
        this.writeCachedPayload(
          redis,
          windowCacheKey,
          payload,
          WINDOW_CACHE_TTL_SECONDS,
        ),
      ]);
    }

    logger.info(
      `Dashboard analytics cache warmed (trigger=${trigger}, from=${fromIso}, to=${toIso})`,
    );

    return payload;
  }

  async getSuccessfulVsFailedMetrics(
    input: AnalyticsWindowInput,
  ): Promise<AnalyticsResponse> {
    const window = resolveWindow(input);
    const fromIso = window.from.toISOString();
    const toIso = window.to.toISOString();
    const windowCacheKey = buildWindowCacheKey(fromIso, toIso);
    const useDashboardCache = isDefaultWindowRequest(input);

    let redis: any = null;
    let hasUsableRedis = false;
    if (!input.bypassCache) {
      redis = await getConnectedRedis();
      hasUsableRedis = isRedisUsable(redis);

      if (hasUsableRedis && redis && useDashboardCache) {
        const dashboardCached = await this.readCachedPayload(
          redis,
          ADMIN_ANALYTICS_DASHBOARD_CACHE_KEY,
        );
        if (dashboardCached) {
          logger.info("Analytics dashboard cache hit.");
          return dashboardCached;
        }
      }

      if (hasUsableRedis && redis) {
        const windowCached = await this.readCachedPayload(redis, windowCacheKey);
        if (windowCached) {
          logger.info(`Analytics window cache hit for ${windowCacheKey}`);
          return windowCached;
        }
      }
    }

    const payload = await this.computePayload(fromIso, toIso);

    if (!input.bypassCache && hasUsableRedis && redis) {
      await this.writeCachedPayload(
        redis,
        windowCacheKey,
        payload,
        WINDOW_CACHE_TTL_SECONDS,
      );

      if (useDashboardCache) {
        await this.writeCachedPayload(
          redis,
          ADMIN_ANALYTICS_DASHBOARD_CACHE_KEY,
          payload,
          DASHBOARD_CACHE_TTL_SECONDS,
        );
      }
    }

    return payload;
  }

  async explainSuccessfulVsFailedMetrics(input: AnalyticsWindowInput) {
    const window = resolveWindow(input);
    const fromIso = window.from.toISOString();
    const toIso = window.to.toISOString();

    const sourceSelects = await this.buildSourceSelects();
    const query = this.buildAggregateQuery(sourceSelects);
    const sequelize = getSequelize();
    const explainRows = await sequelize.query<any>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${query}`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          from: fromIso,
          to: toIso,
        },
      },
    );

    return explainRows.map((row) => {
      const firstValue = Object.values(row)[0];
      return String(firstValue);
    });
  }
}

export const analyticsApplicationService = new AnalyticsApplicationService();

