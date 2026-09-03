import { Op, QueryTypes } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";
import { calculateCampaignFields, parseDate } from "../../utils/campaign-calculator";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("pipeline-stats-service");

const FLIGHT_STATUSES = ["INFLIGHT", "FLIGHT"];
const ONBOARDING_ROLES = [Role.CLIENT, Role.GUEST];

export type PipelineRangeKey = "today" | "week" | "month" | "quarter" | "year" | "all";

const RANGE_KEYS: PipelineRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];

export const isPipelineRangeKey = (value: unknown): value is PipelineRangeKey =>
  typeof value === "string" && RANGE_KEYS.includes(value as PipelineRangeKey);

export interface PipelineCoverageController {
  name: string;
  count: number;
  sharePct: number;
}

export interface PipelineCoverage {
  totalInFlight: number;
  allocated: number;
  unallocated: number;
  controllerCount: number;
  minLoad: number;
  maxLoad: number;
  topController: PipelineCoverageController | null;
}

export interface PipelineStats {
  range: PipelineRangeKey;
  from: string | null;
  to: string;
  paidNotInFlight: number;
  onboarding: number;
  unallocatedInFlight: number;
  inFlight: number;
  completed: number;
  coverage: PipelineCoverage;
  generatedAt: string;
}

interface CredentialsCoreRow {
  id: string;
  capitalized: string | null;
  SeekSubStartDate: string | null;
  createdAt: string | Date;
  seekExternalCredentials: Record<string, unknown> | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Rolling trailing windows anchored at "now", not calendar-aligned boundaries.
// Calendar boundaries (e.g. startOf('week')) don't nest inside each other —
// a Sunday-aligned week start can fall in the previous month, making "week"
// scan further back than "month" and break the today ⊆ week ⊆ month ⊆
// quarter ⊆ year ⊆ all ordering staff expect from these quick filters.
const RANGE_LOOKBACK_MS: Partial<Record<PipelineRangeKey, number>> = {
  today: DAY_MS,
  week: 7 * DAY_MS,
  month: 30 * DAY_MS,
  quarter: 90 * DAY_MS,
  year: 365 * DAY_MS,
};

const resolveRangeStart = (range: PipelineRangeKey): Date | null => {
  const lookbackMs = RANGE_LOOKBACK_MS[range];
  if (!lookbackMs) {
    return null;
  }

  return new Date(Date.now() - lookbackMs);
};

class PipelineStatsService {
  // In-flight / unallocated in-flight / coverage all need the decrypted
  // AssignedPCName/AssignedPCEmail fields, so this goes through the Sequelize
  // model (which decrypts them via its @AfterFind hook) instead of a raw
  // query. A client counts as allocated when it has an AssignedPCName or
  // AssignedPCEmail; coverage groups the allocated ones by AssignedPCName to
  // find each controller's load and the top controller's share of the book.
  private async countInFlight(
    rangeStart: Date | null,
  ): Promise<{ inFlight: number; unallocatedInFlight: number; coverage: PipelineCoverage }> {
    const where: Record<string, unknown> = {
      isDeleted: false,
      capitalized: { [Op.in]: FLIGHT_STATUSES },
    };
    if (rangeStart) {
      where.createdAt = { [Op.gte]: rangeStart };
    }

    const rows = await Credentials.findAll({ where });

    let unallocatedInFlight = 0;
    const loadByController = new Map<string, number>();

    for (const row of rows) {
      const name = row.AssignedPCName?.trim();
      const email = row.AssignedPCEmail?.trim();
      if (!name && !email) {
        unallocatedInFlight += 1;
        continue;
      }

      const key = name || email!;
      loadByController.set(key, (loadByController.get(key) || 0) + 1);
    }

    const allocated = rows.length - unallocatedInFlight;
    const loads = Array.from(loadByController.values());

    let topController: PipelineCoverageController | null = null;
    for (const [name, count] of loadByController.entries()) {
      if (!topController || count > topController.count) {
        topController = {
          name,
          count,
          sharePct: allocated > 0 ? (count / allocated) * 100 : 0,
        };
      }
    }

    return {
      inFlight: rows.length,
      unallocatedInFlight,
      coverage: {
        totalInFlight: rows.length,
        allocated,
        unallocated: unallocatedInFlight,
        controllerCount: loadByController.size,
        minLoad: loads.length ? Math.min(...loads) : 0,
        maxLoad: loads.length ? Math.max(...loads) : 0,
        topController,
      },
    };
  }

  // Paid-not-in-flight and completed only need non-PII columns (capitalized,
  // the campaign date fields), so a raw query avoids paying the per-row PII
  // decryption cost that the Credentials model's @AfterFind hook incurs.
  private async countByCampaignEnd(
    rangeStart: Date | null,
  ): Promise<{ paidNotInFlight: number; completed: number }> {
    const sequelize = getSequelize();
    const dateCondition = rangeStart ? `AND "createdAt" >= :rangeStart` : "";

    const rows = await sequelize.query<CredentialsCoreRow>(
      `
        SELECT id, capitalized, "SeekSubStartDate", "createdAt", "seekExternalCredentials"
        FROM credentials
        WHERE "isDeleted" = false
          ${dateCondition}
      `,
      {
        type: QueryTypes.SELECT,
        replacements: rangeStart ? { rangeStart: rangeStart.toISOString() } : {},
      },
    );

    const now = new Date();
    let paidNotInFlight = 0;
    let completed = 0;

    for (const row of rows) {
      const cred = row.seekExternalCredentials || {};
      const computed = calculateCampaignFields({
        SeekSubStartDate: row.SeekSubStartDate || undefined,
        createdAt: row.createdAt,
        SeekSubDurDays: (cred as any).SeekSubDurDays,
        GraceDuration: (cred as any).GraceDuration,
      });

      const campaignEnd = parseDate(computed.CampaignEnd);
      if (!campaignEnd) {
        continue;
      }

      const hasEnded = campaignEnd.getTime() <= now.getTime();

      if (hasEnded) {
        completed += 1;
      } else if (row.capitalized === "HOLD") {
        paidNotInFlight += 1;
      }
    }

    return { paidNotInFlight, completed };
  }

  // Onboarding = client/guest users with no currently active paid plan —
  // same "active plan" definition used by the subscription-tier aggregator
  // (paymentStatus completed, not expired).
  private async countOnboarding(rangeStart: Date | null): Promise<number> {
    const sequelize = getSequelize();
    const dateCondition = rangeStart ? `AND u."createdAt" >= :rangeStart` : "";

    const rows = await sequelize.query<{ count: string | number }>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM users u
        WHERE u."deletedAt" IS NULL
          AND u.role IN (:roles)
          ${dateCondition}
          AND NOT EXISTS (
            SELECT 1 FROM plans p
            WHERE p."userId" = u.id
              AND p."deletedAt" IS NULL
              AND p."paymentStatus" = 'completed'
              AND COALESCE(p."hasExpired", false) = false
          )
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          roles: ONBOARDING_ROLES,
          ...(rangeStart ? { rangeStart: rangeStart.toISOString() } : {}),
        },
      },
    );

    return Number(rows[0]?.count) || 0;
  }

  async getPipelineStats(range: PipelineRangeKey): Promise<PipelineStats> {
    const rangeStart = resolveRangeStart(range);

    const [flight, campaignCounts, onboarding] = await Promise.all([
      this.countInFlight(rangeStart),
      this.countByCampaignEnd(rangeStart),
      this.countOnboarding(rangeStart),
    ]);

    logger.info(
      `Pipeline stats computed (range=${range}, inFlight=${flight.inFlight}, unallocatedInFlight=${flight.unallocatedInFlight}, paidNotInFlight=${campaignCounts.paidNotInFlight}, completed=${campaignCounts.completed}, onboarding=${onboarding})`,
    );

    return {
      range,
      from: rangeStart ? rangeStart.toISOString() : null,
      to: new Date().toISOString(),
      paidNotInFlight: campaignCounts.paidNotInFlight,
      onboarding,
      unallocatedInFlight: flight.unallocatedInFlight,
      inFlight: flight.inFlight,
      completed: campaignCounts.completed,
      coverage: flight.coverage,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const pipelineStatsService = new PipelineStatsService();
