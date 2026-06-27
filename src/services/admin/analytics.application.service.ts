import { QueryTypes } from "sequelize";
import { getConnectedRedis } from "../../config/redis";
import { ADMIN_ANALYTICS_DAILY_LOOKBACK_DAYS } from "../../config/env";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { isRedisUsable } from "../../utils/helpers";
import { getSequelize } from "../../utils/sequelize";
import { enumerateDates, normalizeDateRange } from "../../utils/date-range";
import { getApplicationsTableShape, clearApplicationsTableShapeCache } from "./analytics.table-shape.service";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("analytics-application-service");

export interface AnalyticsWindowInput {
  from?: string;
  to?: string;
  bypassCache?: boolean;
}

interface SourceMetrics {
  successful: number;
  failed: number;
  total?: number;
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
  totalApplications: number;
  generatedAt: string;
}

interface SourceMetricsRow {
  source: string;
  successful: string | number;
  failed: string | number;
  total?: string | number;
}

const DEFAULT_LOOKBACK_DAYS = 30;
const WINDOW_CACHE_TTL_SECONDS = 300;
const DASHBOARD_CACHE_TTL_SECONDS = 6 * 60 * 60 + 300; // 6h + 5m
const APPLICATIONS_TABLE = "applications";
const ANALYTICS_TIME_ZONE = "Africa/Lagos";

export const ADMIN_ANALYTICS_DASHBOARD_CACHE_KEY =
  "admin:analytics:dashboard:v2:latest";
export const ADMIN_ANALYTICS_DAILY_CACHE_KEY = "admin:analytics:daily:v2";
const ADMIN_ANALYTICS_ALLTIME_CACHE_KEY = "admin:analytics:v2:all-time";


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
  private buildApplicationsSelect(
    shape: {
      createdAtColumn: string;
      deletedAtColumn?: string;
      statusColumn: string;
      statusColumns?: string[];
    },
    dateRange?: { fromIso: string; toIso: string },
  ): string {
    const createdAtColumn = quoteIdentifier(shape.createdAtColumn);
    const deletedAtCondition = shape.deletedAtColumn
      ? `AND ${quoteIdentifier(shape.deletedAtColumn)} IS NULL`
      : `AND "isDeleted" = false`;
    const dateCondition = dateRange
      ? `AND ${createdAtColumn} >= :from AND ${createdAtColumn} < :to`
      : "";

    return `
      SELECT
        'applications'::text AS source,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE "Status" = 'Successful')::bigint AS successful,
        COUNT(*) FILTER (WHERE "Status" IS DISTINCT FROM 'Successful')::bigint AS failed
      FROM ${APPLICATIONS_TABLE}
      WHERE 1=1
        ${dateCondition}
        ${deletedAtCondition}
    `;
  }

  private async buildSourceSelects(dateRange?: { fromIso: string; toIso: string }): Promise<string[]> {
    const dateCondition = dateRange
      ? `AND "createdAt" >= :from AND "createdAt" < :to`
      : "";

    const sourceSelects = [
      `
        SELECT
          'plans'::text AS source,
          NULL::bigint AS total,
          COUNT(*) FILTER (WHERE "paymentStatus" = 'completed')::bigint AS successful,
          COUNT(*) FILTER (WHERE "paymentStatus" = 'failed')::bigint AS failed
        FROM plans
        WHERE "deletedAt" IS NULL
          ${dateCondition}
      `,
      `
        SELECT
          'users'::text AS source,
          NULL::bigint AS total,
          COUNT(*) FILTER (WHERE "applicationStatus" = 'Commenced')::bigint AS successful,
          COUNT(*) FILTER (WHERE "applicationStatus" = 'Expired')::bigint AS failed
        FROM users
        WHERE "deletedAt" IS NULL
          ${dateCondition}
      `,
    ];

    const applicationsTableShape = await getApplicationsTableShape();
    if (applicationsTableShape) {
      sourceSelects.push(this.buildApplicationsSelect(applicationsTableShape, dateRange));
    }

    return sourceSelects;
  }

  private buildAggregateQuery(sourceSelects: string[]): string {
    return `
      WITH source_counts AS (
        ${sourceSelects.join("\nUNION ALL\n")}
      )
      SELECT source, total, successful, failed
      FROM source_counts
    `;
  }

  private async executeAggregateQuery(
    dateRange?: { fromIso: string; toIso: string },
  ): Promise<SourceMetricsRow[]> {
    const sequelize = getSequelize();
    const sourceSelects = await this.buildSourceSelects(dateRange);
    const query = this.buildAggregateQuery(sourceSelects);

    return sequelize.query<SourceMetricsRow>(query, {
      type: QueryTypes.SELECT,
      replacements: dateRange ? { from: dateRange.fromIso, to: dateRange.toIso } : {},
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
      totalApplications: breakdown.applications?.total ?? (breakdown.applications ? breakdown.applications.successful + breakdown.applications.failed : 0),
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
        ...(row.total !== undefined && { total: toNumber(row.total) }),
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

    const appBreakdown = breakdown.applications;
    const totalApplications = appBreakdown?.total ?? (appBreakdown ? appBreakdown.successful + appBreakdown.failed : 0);

    return {
      range: {
        from: fromIso,
        to: toIso,
      },
      metrics,
      breakdown,
      totalApplications,
      generatedAt: new Date().toISOString(),
    };
  }

  private async computePayload(
    dateRange?: { fromIso: string; toIso: string },
  ): Promise<AnalyticsResponse> {
    const rows = await this.executeAggregateQuery(dateRange);
    const fromIso = dateRange?.fromIso ?? new Date(0).toISOString();
    const toIso = dateRange?.toIso ?? new Date().toISOString();
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
    const payload = await this.computePayload();

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
          ADMIN_ANALYTICS_ALLTIME_CACHE_KEY,
          payload,
          DASHBOARD_CACHE_TTL_SECONDS,
        ),
      ]);
    }

    logger.info(`Dashboard analytics cache warmed (trigger=${trigger}, all-time)`);

    return payload;
  }

  async getSuccessfulVsFailedMetrics(
    input: AnalyticsWindowInput,
  ): Promise<AnalyticsResponse> {
    const isAllTime = isDefaultWindowRequest(input);

    if (isAllTime) {
      if (input.bypassCache) {
        clearApplicationsTableShapeCache();
      }

      let redis: any = null;
      if (!input.bypassCache) {
        redis = await getConnectedRedis();
        if (isRedisUsable(redis) && redis) {
          const cached = await this.readCachedPayload(redis, ADMIN_ANALYTICS_DASHBOARD_CACHE_KEY)
            ?? await this.readCachedPayload(redis, ADMIN_ANALYTICS_ALLTIME_CACHE_KEY);
          if (cached) {
            logger.info("Analytics all-time cache hit.");
            return cached;
          }
        }
      }

      const payload = await this.computePayload();

      if (!input.bypassCache) {
        const redisForWrite = redis ?? await getConnectedRedis();
        if (isRedisUsable(redisForWrite) && redisForWrite) {
          await Promise.all([
            this.writeCachedPayload(redisForWrite, ADMIN_ANALYTICS_ALLTIME_CACHE_KEY, payload, DASHBOARD_CACHE_TTL_SECONDS),
            this.writeCachedPayload(redisForWrite, ADMIN_ANALYTICS_DASHBOARD_CACHE_KEY, payload, DASHBOARD_CACHE_TTL_SECONDS),
          ]);
        }
      }

      return payload;
    }

    const window = resolveWindow(input);
    const fromIso = window.fromIso;
    const toIso = window.toIso;
    const windowCacheKey = buildWindowCacheKey(fromIso, toIso);

    let redis: any = null;
    let hasUsableRedis = false;
    if (!input.bypassCache) {
      redis = await getConnectedRedis();
      hasUsableRedis = isRedisUsable(redis);

      if (hasUsableRedis && redis && window.isWholeDays) {
        const dailyCache = await this.readDailySeriesCache(redis);
        if (dailyCache) {
          const cacheLookbackMs = dailyCache.lookbackDays * 24 * 60 * 60 * 1000;
          if (window.from.getTime() < Date.now() - cacheLookbackMs - 24 * 60 * 60 * 1000) {
            logger.info("Analytics daily cache miss: range outside cache lookback.");
          } else {
            const fromDay = formatDayInTz(window.from);
            const toDayExclusive = formatDayInTz(window.to);
            const payloadFromDaily = this.sumDailySeries(dailyCache, fromDay, toDayExclusive);
            payloadFromDaily.range.from = fromIso;
            payloadFromDaily.range.to = toIso;
            await this.writeCachedPayload(redis, windowCacheKey, payloadFromDaily, WINDOW_CACHE_TTL_SECONDS);
            logger.info("Analytics served from daily cache series.");
            return payloadFromDaily;
          }
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

    const payload = await this.computePayload({ fromIso, toIso });

    if (!input.bypassCache && hasUsableRedis && redis) {
      await this.writeCachedPayload(redis, windowCacheKey, payload, WINDOW_CACHE_TTL_SECONDS);
    }

    return payload;
  }

  async explainSuccessfulVsFailedMetrics(input: AnalyticsWindowInput) {
    const isAllTime = isDefaultWindowRequest(input);
    const dateRange = isAllTime
      ? undefined
      : (() => { const w = resolveWindow(input); return { fromIso: w.fromIso, toIso: w.toIso }; })();

    const sourceSelects = await this.buildSourceSelects(dateRange);
    const query = this.buildAggregateQuery(sourceSelects);
    const sequelize = getSequelize();
    const explainRows = await sequelize.query<any>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${query}`,
      {
        type: QueryTypes.SELECT,
        replacements: dateRange ? { from: dateRange.fromIso, to: dateRange.toIso } : {},
      },
    );

    return explainRows.map((row) => {
      const firstValue = Object.values(row)[0];
      return String(firstValue);
    });
  }

  async getUserReturnCounts(): Promise<{ loyalists: number; returnees: number }> {
    const sequelize = getSequelize();

    const counts = await sequelize.query<{ loyalists: string | number; returnees: string | number }>(
      `
        SELECT
          COUNT(*) FILTER (WHERE "returnCount" > 4)::bigint AS loyalists,
          COUNT(*) FILTER (WHERE "returnCount" > 0)::bigint AS returnees
        FROM users
        WHERE "deletedAt" IS NULL;
      `,
      {
        type: QueryTypes.SELECT,
      },
    );

    const row = counts[0] || { loyalists: 0, returnees: 0 };

    return {
      loyalists: toNumber(row.loyalists),
      returnees: toNumber(row.returnees),
    };
  }

  async getUserRoleCounts(): Promise<Record<string, number>> {
    const sequelize = getSequelize();
    
    const roleCounts = await sequelize.query<{ role: string; count: string | number }>(
      `
        SELECT 
          "role", 
          COUNT(*)::bigint AS count 
        FROM users 
        WHERE "deletedAt" IS NULL 
        GROUP BY "role"
        ORDER BY count DESC;
      `,
      {
        type: QueryTypes.SELECT,
      },
    );

    const result: Record<string, number> = {};
    
    // Initialize all roles with 0
    Object.values(Role).forEach(role => {
      result[role] = 0;
    });

    // Populate actual counts
    roleCounts.forEach(row => {
      result[row.role] = toNumber(row.count);
    });

    return result;
  }
}

export const analyticsApplicationService = new AnalyticsApplicationService();
