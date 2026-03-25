import { QueryTypes } from "sequelize";
import { getConnectedRedis } from "../../config/redis";
import { ADMIN_ANALYTICS_DAILY_LOOKBACK_DAYS } from "../../config/env";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { isRedisUsable } from "../../utils/helpers";
import { getSequelize } from "../../utils/sequelize";
import { enumerateDates, normalizeDateRange } from "../../utils/date-range";
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
const ANALYTICS_TIME_ZONE = "Africa/Lagos";

export const ADMIN_ANALYTICS_DASHBOARD_CACHE_KEY =
  "admin:analytics:dashboard:v1:latest";
export const ADMIN_ANALYTICS_DAILY_CACHE_KEY = "admin:analytics:daily:v1";

const logger = getServiceLogger("analytics-application-service");

const toNumber = (value: string | number): number => Number(value) || 0;

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, "\"\"")}"`;

const resolveWindow = (input: AnalyticsWindowInput) =>
  normalizeDateRange({
    from: input.from,
    to: input.to,
    tz: ANALYTICS_TIME_ZONE,
    defaultLookbackDays: DEFAULT_LOOKBACK_DAYS,
  });

const buildWindowCacheKey = (fromIso: string, toIso: string) =>
  `admin:analytics:v1:${fromIso}:${toIso}`;

const isDefaultWindowRequest = (input: AnalyticsWindowInput) =>
  !input.from && !input.to;

interface DailySeriesRow {
  day: string;
  successful: string | number;
  failed: string | number;
}

interface DailySeriesCache {
  tz: string;
  lookbackDays: number;
  generatedAt: string;
  days: Record<string, Record<string, SourceMetrics>>;
}

const DAILY_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60 + 3600; // 7d + 1h safety

const formatDayInTz = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value || "1970";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
};

const buildDailySeriesCache = (
  rowsBySource: Record<string, DailySeriesRow[]>,
  lookbackDays: number,
): DailySeriesCache => {
  const days: Record<string, Record<string, SourceMetrics>> = {};

  for (const [source, rows] of Object.entries(rowsBySource)) {
    for (const row of rows) {
      if (!days[row.day]) {
        days[row.day] = {};
      }

      days[row.day][source] = {
        successful: toNumber(row.successful),
        failed: toNumber(row.failed),
      };
    }
  }

  return {
    tz: ANALYTICS_TIME_ZONE,
    lookbackDays,
    generatedAt: new Date().toISOString(),
    days,
  };
};

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

  private async executeDailySeriesQuery(
    fromIso: string,
    toIso: string,
    source: "plans" | "users" | "applications",
    applicationsShape?: {
      createdAtColumn: string;
      deletedAtColumn?: string;
      statusColumn: string;
    } | null,
  ): Promise<DailySeriesRow[]> {
    const sequelize = getSequelize();

    if (source === "plans") {
      return sequelize.query<DailySeriesRow>(
        `
          SELECT
            TO_CHAR(DATE_TRUNC('day', TIMEZONE(:tz, "createdAt")), 'YYYY-MM-DD') AS day,
            COUNT(*) FILTER (WHERE "paymentStatus" = 'completed')::bigint AS successful,
            COUNT(*) FILTER (WHERE "paymentStatus" = 'failed')::bigint AS failed
          FROM plans
          WHERE "createdAt" >= :from
            AND "createdAt" < :to
            AND "deletedAt" IS NULL
          GROUP BY day
          ORDER BY day ASC;
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { from: fromIso, to: toIso, tz: ANALYTICS_TIME_ZONE },
        },
      );
    }

    if (source === "users") {
      return sequelize.query<DailySeriesRow>(
        `
          SELECT
            TO_CHAR(DATE_TRUNC('day', TIMEZONE(:tz, "createdAt")), 'YYYY-MM-DD') AS day,
            COUNT(*) FILTER (WHERE "applicationStatus" = 'Commenced')::bigint AS successful,
            COUNT(*) FILTER (WHERE "applicationStatus" = 'Expired')::bigint AS failed
          FROM users
          WHERE "createdAt" >= :from
            AND "createdAt" < :to
            AND "deletedAt" IS NULL
          GROUP BY day
          ORDER BY day ASC;
        `,
        {
          type: QueryTypes.SELECT,
          replacements: { from: fromIso, to: toIso, tz: ANALYTICS_TIME_ZONE },
        },
      );
    }

    if (!applicationsShape) {
      return [];
    }

    const createdAtColumn = quoteIdentifier(applicationsShape.createdAtColumn);
    const statusColumn = quoteIdentifier(applicationsShape.statusColumn);
    const normalizedStatus = `LOWER(CAST(${statusColumn} AS TEXT))`;
    const deletedAtCondition = applicationsShape.deletedAtColumn
      ? `AND ${quoteIdentifier(applicationsShape.deletedAtColumn)} IS NULL`
      : "";

    return sequelize.query<DailySeriesRow>(
      `
        SELECT
          TO_CHAR(DATE_TRUNC('day', TIMEZONE(:tz, ${createdAtColumn})), 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE ${normalizedStatus} = 'successful')::bigint AS successful,
          COUNT(*) FILTER (WHERE ${normalizedStatus} = 'failed')::bigint AS failed
        FROM ${APPLICATIONS_TABLE}
        WHERE ${createdAtColumn} >= :from
          AND ${createdAtColumn} < :to
          ${deletedAtCondition}
        GROUP BY day
        ORDER BY day ASC;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { from: fromIso, to: toIso, tz: ANALYTICS_TIME_ZONE },
      },
    );
  }

  async warmDailySeriesCache(trigger = "manual"): Promise<DailySeriesCache | null> {
    const redis = await getConnectedRedis();
    if (!isRedisUsable(redis)) {
      logger.warn("Redis unavailable; skipping daily analytics cache warmup.");
      return null;
    }

    const lookbackDays = Number.isFinite(ADMIN_ANALYTICS_DAILY_LOOKBACK_DAYS)
      ? Math.max(30, Math.min(ADMIN_ANALYTICS_DAILY_LOOKBACK_DAYS, 730))
      : 180;

    const now = new Date();
    const toIso = now.toISOString();

    // Align the lower bound to a whole-day boundary in the analytics TZ so that the
    // earliest day bucket is complete (otherwise we'd undercount that day).
    const fromDay = formatDayInTz(
      new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000),
    );
    const normalized = normalizeDateRange({
      from: fromDay,
      to: toIso,
      tz: ANALYTICS_TIME_ZONE,
      defaultLookbackDays: lookbackDays,
    });
    const fromIso = normalized.fromIso;

    const applicationsShape = await getApplicationsTableShape();

    const [plansRows, usersRows, applicationsRows] = await Promise.all([
      this.executeDailySeriesQuery(fromIso, toIso, "plans"),
      this.executeDailySeriesQuery(fromIso, toIso, "users"),
      this.executeDailySeriesQuery(fromIso, toIso, "applications", applicationsShape),
    ]);

    const cache = buildDailySeriesCache(
      {
        plans: plansRows,
        users: usersRows,
        ...(applicationsShape ? { applications: applicationsRows } : {}),
      },
      lookbackDays,
    );

    const usableRedis = redis!;
    await usableRedis.set(
      ADMIN_ANALYTICS_DAILY_CACHE_KEY,
      JSON.stringify(cache),
      "EX",
      DAILY_CACHE_TTL_SECONDS,
    );

    logger.info(
      `Daily analytics cache warmed (trigger=${trigger}, days=${lookbackDays})`,
    );

    return cache;
  }

  private async readDailySeriesCache(redis: any): Promise<DailySeriesCache | null> {
    if (!redis) {
      return null;
    }

    const raw = await redis.get(ADMIN_ANALYTICS_DAILY_CACHE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as DailySeriesCache;
      if (!parsed?.days || parsed.tz !== ANALYTICS_TIME_ZONE) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private sumDailySeries(
    cache: DailySeriesCache,
    fromDay: string,
    toDayExclusive: string,
  ): AnalyticsResponse {
    const dayKeys = enumerateDates(fromDay, toDayExclusive);
    const breakdown: Record<string, SourceMetrics> = {};

    for (const dayKey of dayKeys) {
      const dayEntry = cache.days[dayKey];
      if (!dayEntry) {
        continue;
      }
      for (const [source, metrics] of Object.entries(dayEntry)) {
        if (!breakdown[source]) {
          breakdown[source] = { successful: 0, failed: 0 };
        }
        breakdown[source].successful += metrics.successful;
        breakdown[source].failed += metrics.failed;
      }
    }

    const metrics = Object.values(breakdown).reduce(
      (acc, row) => {
        acc.successful += row.successful;
        acc.failed += row.failed;
        return acc;
      },
      { successful: 0, failed: 0 },
    );

    // Range is reconstructed as whole-day boundaries; the caller sets accurate ISO range.
    return {
      range: { from: `${fromDay}T00:00:00.000Z`, to: `${toDayExclusive}T00:00:00.000Z` },
      metrics,
      breakdown,
      generatedAt: cache.generatedAt,
    };
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
    const fromIso = window.fromIso;
    const toIso = window.toIso;
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
    const fromIso = window.fromIso;
    const toIso = window.toIso;
    const windowCacheKey = buildWindowCacheKey(fromIso, toIso);
    const useDashboardCache = isDefaultWindowRequest(input);

    let redis: any = null;
    let hasUsableRedis = false;
    if (!input.bypassCache) {
      redis = await getConnectedRedis();
      hasUsableRedis = isRedisUsable(redis);

      // If the request is whole-day aligned (common for UI start/end date filters),
      // prefer summing from the daily cache over running a live aggregation query.
      if (
        hasUsableRedis &&
        redis &&
        !useDashboardCache &&
        window.isWholeDays
      ) {
        const dailyCache = await this.readDailySeriesCache(redis);
        if (dailyCache) {
          const cacheLookbackMs = dailyCache.lookbackDays * 24 * 60 * 60 * 1000;
          if (window.from.getTime() < Date.now() - cacheLookbackMs - 24 * 60 * 60 * 1000) {
            logger.info("Analytics daily cache miss: range outside cache lookback.");
          } else {
          const fromDay = formatDayInTz(window.from);
          const toDayExclusive = formatDayInTz(window.to);
          const payloadFromDaily = this.sumDailySeries(
            dailyCache,
            fromDay,
            toDayExclusive,
          );

          // Preserve accurate ISO window boundaries for the response.
          payloadFromDaily.range.from = fromIso;
          payloadFromDaily.range.to = toIso;

          await this.writeCachedPayload(
            redis,
            windowCacheKey,
            payloadFromDaily,
            WINDOW_CACHE_TTL_SECONDS,
          );

          logger.info("Analytics served from daily cache series.");
          return payloadFromDaily;
          }
        }
      }

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
    const fromIso = window.fromIso;
    const toIso = window.toIso;

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
