import { QueryTypes } from "sequelize";
import { getConnectedRedis } from "../../config/redis";
import { getServiceLogger } from "../../utils/createLogger";
import { isRedisUsable } from "../../utils/helpers";
import { getSequelize } from "../../utils/sequelize";

interface TierCountRow {
  tierKey: string | null;
  userCount: string | number | null;
  activeSubscribers: string | number;
  activeSubscriptions: string | number;
}

interface TierSnapshot {
  key: string;
  label: string;
  users: number;
}

export interface SubscriptionTierAnalytics {
  tiers: TierSnapshot[];
  allPaidTierCounts: Record<string, number>;
  totals: {
    sixTierUsers: number;
    activeSubscribers: number;
    activeSubscriptions: number;
  };
  generatedAt: string;
}

const logger = getServiceLogger("subscription-tier-aggregator-service");

const SUBSCRIPTION_TIER_CACHE_KEY = "admin:analytics:tiers:v1:realtime";
const SUBSCRIPTION_TIER_CACHE_TTL_SECONDS = 60;

const TIER_OVERVIEW_ORDER: Array<{ key: string; label: string }> = [
  { key: "bronze", label: "Bronze" },
  { key: "silver", label: "Silver" },
  { key: "gold", label: "Gold" },
  { key: "platinum", label: "Platinum" },
  { key: "copper", label: "Copper" },
  { key: "coral", label: "Coral" },
];

const toNumber = (value: string | number | null | undefined): number =>
  Number(value) || 0;

const normalizeTierKey = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

class SubscriptionTierAggregatorApplicationService {
  private async readCached(redis: any): Promise<SubscriptionTierAnalytics | null> {
    if (!redis) {
      return null;
    }

    const raw = await redis.get(SUBSCRIPTION_TIER_CACHE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SubscriptionTierAnalytics;
    } catch {
      return null;
    }
  }

  private async writeCached(redis: any, payload: SubscriptionTierAnalytics) {
    if (!redis) {
      return;
    }

    await redis.set(
      SUBSCRIPTION_TIER_CACHE_KEY,
      JSON.stringify(payload),
      "EX",
      SUBSCRIPTION_TIER_CACHE_TTL_SECONDS,
    );
  }

  private async fetchTierRows(): Promise<TierCountRow[]> {
    const sequelize = getSequelize();

    return sequelize.query<TierCountRow>(
      `
        WITH all_paid_plans AS (
          SELECT
            p."userId",
            LOWER(COALESCE(NULLIF(TRIM(p.title), ''), 'unclassified')) AS tier_key
          FROM plans p
          WHERE p."deletedAt" IS NULL
            AND p."paymentStatus" = 'completed'
        ),
        tier_plan_counts AS (
          SELECT
            tier_key AS "tierKey",
            COUNT(*)::bigint AS "userCount"
          FROM all_paid_plans
          WHERE tier_key <> 'free'
          GROUP BY tier_key
        ),
        subscription_totals AS (
          SELECT
            COUNT(*)::bigint                    AS "activeSubscriptions",
            COUNT(DISTINCT "userId")::bigint    AS "activeSubscribers"
          FROM all_paid_plans
          WHERE tier_key <> 'free'
        )
        SELECT
          tpc."tierKey",
          tpc."userCount",
          st."activeSubscribers",
          st."activeSubscriptions"
        FROM subscription_totals st
        LEFT JOIN tier_plan_counts tpc ON TRUE;
      `,
      {
        type: QueryTypes.SELECT,
      },
    );
  }

  private mapPayload(rows: TierCountRow[]): SubscriptionTierAnalytics {
    const allPaidTierCounts: Record<string, number> = {};

    for (const row of rows) {
      const tierKey = normalizeTierKey(row.tierKey);
      if (!tierKey) {
        continue;
      }

      allPaidTierCounts[tierKey] = toNumber(row.userCount);
    }

    const activeSubscribers = rows.length
      ? toNumber(rows[0].activeSubscribers)
      : 0;
    const activeSubscriptions = rows.length
      ? toNumber(rows[0].activeSubscriptions)
      : 0;

    // Start with the predefined order, then append any tier found in the DB
    // that isn't already listed (e.g. "emerald", future tiers, etc.)
    const knownKeys = new Set(TIER_OVERVIEW_ORDER.map((t) => t.key));

    const tiers: TierSnapshot[] = [
      ...TIER_OVERVIEW_ORDER.map((tier) => ({
        key: tier.key,
        label: tier.label,
        users: allPaidTierCounts[tier.key] || 0,
      })),
      ...Object.entries(allPaidTierCounts)
        .filter(([key]) => !knownKeys.has(key))
        .map(([key, count]) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          users: count,
        })),
    ];

    const sixTierUsers = tiers.reduce((acc, tier) => acc + tier.users, 0);

    return {
      tiers,
      allPaidTierCounts,
      totals: {
        sixTierUsers,
        activeSubscribers,
        activeSubscriptions,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getRealtimeTierAnalytics(
    bypassCache = false,
  ): Promise<SubscriptionTierAnalytics> {
    let redis: any = null;
    if (!bypassCache) {
      redis = await getConnectedRedis();
      if (isRedisUsable(redis)) {
        const cached = await this.readCached(redis);
        if (cached) {
          return cached;
        }
      }
    }

    const rows = await this.fetchTierRows();
    const payload = this.mapPayload(rows);

    if (!bypassCache && isRedisUsable(redis)) {
      await this.writeCached(redis, payload);
    }

    logger.info(
      `Realtime subscription tier analytics generated (activeSubscribers=${payload.totals.activeSubscribers}, activeSubscriptions=${payload.totals.activeSubscriptions})`,
    );

    return payload;
  }
}

export const subscriptionTierAggregatorApplicationService =
  new SubscriptionTierAggregatorApplicationService();
