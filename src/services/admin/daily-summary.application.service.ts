import { QueryTypes } from "sequelize";
import { BACKEND_URL, SLACK_ADMIN_CHANNEL_ID } from "../../config/env";
import { getConnectedRedis } from "../../config/redis";
import { SlackService } from "../slack.service";
import {
  ZohoBusinessSnapshotPayload,
  ZohoSyncResult,
  zohoBooksService,
} from "../zoho-books.service";
import { getServiceLogger } from "../../utils/createLogger";
import { isRedisUsable } from "../../utils/helpers";
import { getSequelize } from "../../utils/sequelize";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../../utils/enum";

interface DailySummaryMetricsRow {
  totalUsers: string | number;
  activeAggregators: string | number;
  activeSubscriptions: string | number;
  verifiedAggregatorLinks: string | number;
}

export interface DailySummarySnapshot {
  summaryDate: string;
  generatedAt: string;
  metrics: {
    totalUsers: number;
    activeAggregators: number;
    activeSubscriptions: number;
    verifiedAggregatorLinks: number;
  };
}

export interface DailySummaryExecutionInput {
  trigger?: string;
  summaryDate?: string;
  force?: boolean;
}

interface DeliveryStepResult {
  skipped: boolean;
  delivered: boolean;
  message: string;
}

export interface DailySummaryExecutionResult {
  snapshot: DailySummarySnapshot;
  slack: DeliveryStepResult & {
    channel: string;
  };
  zoho: DeliveryStepResult & ZohoSyncResult;
}

const logger = getServiceLogger("daily-summary-service");

const SUMMARY_TIME_ZONE = "Africa/Lagos";
const DELIVERY_KEY_TTL_SECONDS = 8 * 24 * 60 * 60;
const SNAPSHOT_KEY_TTL_SECONDS = 8 * 24 * 60 * 60;

const toNumber = (value: string | number): number => Number(value) || 0;

const formatDateInTimezone = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SUMMARY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
};

const buildSnapshotCacheKey = (summaryDate: string) =>
  `admin:daily-summary:v1:snapshot:${summaryDate}`;

const buildDeliveryKey = (target: "slack" | "zoho", summaryDate: string) =>
  `admin:daily-summary:v1:${target}:${summaryDate}`;

class DailySummaryApplicationService {
  private resolveSummaryDate(summaryDate?: string): string {
    if (!summaryDate) {
      return formatDateInTimezone(new Date());
    }

    const parsed = new Date(`${summaryDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid summary date: ${summaryDate}`);
    }

    return summaryDate;
  }

  async getDailySummarySnapshot(summaryDate?: string): Promise<DailySummarySnapshot> {
    const resolvedSummaryDate = this.resolveSummaryDate(summaryDate);
    const sequelize = getSequelize();

    const [row] = await sequelize.query<DailySummaryMetricsRow>(
      `
        WITH user_scope AS (
          SELECT COUNT(*)::bigint AS "totalUsers"
          FROM users
          WHERE "deletedAt" IS NULL
        ),
        active_subscription_scope AS (
          SELECT COUNT(*)::bigint AS "activeSubscriptions"
          FROM plans
          WHERE "deletedAt" IS NULL
            AND "paymentStatus" = 'completed'
            AND "hasExpired" IS FALSE
            AND ("expiresAt" IS NULL OR "expiresAt" >= CURRENT_DATE)
        ),
        aggregator_scope AS (
          SELECT
            COUNT(DISTINCT p."userId") FILTER (
              WHERE p."isActive" IS TRUE
                AND p."isApproved" IS TRUE
                AND COALESCE(p."isSuspended", FALSE) IS FALSE
                AND verified_links."verifiedCount" > 0
            )::bigint AS "activeAggregators",
            COALESCE(SUM(verified_links."verifiedCount"), 0)::bigint AS "verifiedAggregatorLinks"
          FROM profiles p
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS "verifiedCount"
            FROM jsonb_array_elements(COALESCE(p.aggregators, '[]'::jsonb)) AS aggregator
            WHERE COALESCE((aggregator ->> 'isVerified')::boolean, FALSE) IS TRUE
          ) AS verified_links ON TRUE
        )
        SELECT
          user_scope."totalUsers",
          active_subscription_scope."activeSubscriptions",
          aggregator_scope."activeAggregators",
          aggregator_scope."verifiedAggregatorLinks"
        FROM user_scope, active_subscription_scope, aggregator_scope;
      `,
      {
        type: QueryTypes.SELECT,
      },
    );

    const snapshot: DailySummarySnapshot = {
      summaryDate: resolvedSummaryDate,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalUsers: toNumber(row?.totalUsers || 0),
        activeAggregators: toNumber(row?.activeAggregators || 0),
        activeSubscriptions: toNumber(row?.activeSubscriptions || 0),
        verifiedAggregatorLinks: toNumber(row?.verifiedAggregatorLinks || 0),
      },
    };

    const redis = await getConnectedRedis();
    if (isRedisUsable(redis)) {
      const usableRedis = redis!;
      await usableRedis.set(
        buildSnapshotCacheKey(resolvedSummaryDate),
        JSON.stringify(snapshot),
        "EX",
        SNAPSHOT_KEY_TTL_SECONDS,
      );
    }

    return snapshot;
  }

  private async wasAlreadyDelivered(
    target: "slack" | "zoho",
    summaryDate: string,
  ): Promise<boolean> {
    const redis = await getConnectedRedis();
    if (!isRedisUsable(redis)) {
      return false;
    }

    const usableRedis = redis!;
    const existing = await usableRedis.get(buildDeliveryKey(target, summaryDate));
    return Boolean(existing);
  }

  private async markDelivered(
    target: "slack" | "zoho",
    summaryDate: string,
    message: string,
  ): Promise<void> {
    const redis = await getConnectedRedis();
    if (!isRedisUsable(redis)) {
      return;
    }

    const usableRedis = redis!;
    await usableRedis.set(
      buildDeliveryKey(target, summaryDate),
      JSON.stringify({
        deliveredAt: new Date().toISOString(),
        message,
      }),
      "EX",
      DELIVERY_KEY_TTL_SECONDS,
    );
  }

  private buildSlackBody(snapshot: DailySummarySnapshot) {
    return [
      `Daily business summary generated for ${snapshot.summaryDate}.`,
      `- Total users: ${snapshot.metrics.totalUsers}`,
      `- Active aggregators: ${snapshot.metrics.activeAggregators}`,
      `- Verified aggregator links: ${snapshot.metrics.verifiedAggregatorLinks}`,
      `- Active subscriptions: ${snapshot.metrics.activeSubscriptions}`,
      `- Generated at: ${snapshot.generatedAt}`,
    ].join("\n");
  }

  private async deliverSlackSummary(
    snapshot: DailySummarySnapshot,
    force: boolean,
  ): Promise<DeliveryStepResult & { channel: string }> {
    const channel = SLACK_ADMIN_CHANNEL_ID || SlackChannel.TOWN_CRIER;

    if (!force && (await this.wasAlreadyDelivered("slack", snapshot.summaryDate))) {
      return {
        skipped: true,
        delivered: true,
        channel,
        message: `Slack summary already sent for ${snapshot.summaryDate}.`,
      };
    }

    const wasSent = await SlackService.notify({
      node: SlackNode.ANALYTICS,
      provider: SlackProvider.SYSTEM,
      severity: SlackSeverity.INFO,
      type: SlackEventType.CRON_EXECUTION,
      trigger: `Daily Summary ${snapshot.summaryDate}`,
      channel,
      host: BACKEND_URL,
      body: this.buildSlackBody(snapshot),
    });

    if (!wasSent) {
      return {
        skipped: false,
        delivered: false,
        channel,
        message: `Failed to send Slack summary for ${snapshot.summaryDate}.`,
      };
    }

    await this.markDelivered(
      "slack",
      snapshot.summaryDate,
      "Daily summary delivered to Slack.",
    );

    return {
      skipped: false,
      delivered: true,
      channel,
      message: `Daily summary sent to Slack for ${snapshot.summaryDate}.`,
    };
  }

  private async deliverZohoSummary(
    snapshot: DailySummarySnapshot,
    force: boolean,
  ): Promise<DeliveryStepResult & ZohoSyncResult> {
    if (!zohoBooksService.isDashboardSyncConfigured()) {
      return {
        skipped: true,
        delivered: false,
        message:
          "Zoho Books dashboard sync skipped because required configuration is missing.",
      };
    }

    if (!force && (await this.wasAlreadyDelivered("zoho", snapshot.summaryDate))) {
      return {
        skipped: true,
        delivered: true,
        message: `Zoho Books snapshot already synced for ${snapshot.summaryDate}.`,
      };
    }

    const payload: ZohoBusinessSnapshotPayload = {
      summaryDate: snapshot.summaryDate,
      generatedAt: snapshot.generatedAt,
      metrics: {
        totalUsers: snapshot.metrics.totalUsers,
        activeAggregators: snapshot.metrics.activeAggregators,
        activeSubscriptions: snapshot.metrics.activeSubscriptions,
        verifiedAggregatorLinks: snapshot.metrics.verifiedAggregatorLinks,
      },
    };

    const result = await zohoBooksService.upsertBusinessSnapshot(payload);
    if (result.skipped) {
      return {
        ...result,
        delivered: false,
      };
    }

    await this.markDelivered("zoho", snapshot.summaryDate, result.message);

    return {
      ...result,
      delivered: true,
    };
  }

  async processDailySummary(
    input: DailySummaryExecutionInput,
  ): Promise<DailySummaryExecutionResult> {
    const trigger = input.trigger || "manual";
    const snapshot = await this.getDailySummarySnapshot(input.summaryDate);

    const [slack, zoho] = await Promise.all([
      this.deliverSlackSummary(snapshot, Boolean(input.force)),
      this.deliverZohoSummary(snapshot, Boolean(input.force)),
    ]);

    logger.info(
      `Processed daily summary (trigger=${trigger}, date=${snapshot.summaryDate}, slack=${slack.message}, zoho=${zoho.message})`,
    );

    return {
      snapshot,
      slack,
      zoho,
    };
  }
}

export const dailySummaryApplicationService =
  new DailySummaryApplicationService();
