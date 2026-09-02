import { Op, QueryTypes } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import { ClientJourneyStep } from "../../models/v1/client-journey-step.model";
import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";
import { calculateCampaignFields, parseDate } from "../../utils/campaign-calculator";
import { Role } from "../../utils/enum";
import { CLIENT_JOURNEY_STEPS } from "../../utils/clientJourneySteps";

const logger = getServiceLogger("pipeline-lists-service");

const FLIGHT_STATUSES = ["INFLIGHT", "FLIGHT"];
const ONBOARDING_ROLES = [Role.CLIENT, Role.GUEST];
const LIST_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DashboardListItem {
  id: string;
  name: string;
  // Client's current client-journey-step (the first registry step with no
  // completion row yet) — null once every step is done. The label is
  // resolved on the frontend from the shared step registry, same as
  // AdminClientJourney does, so this stays in sync with that source of truth.
  journeyStepKey: string | null;
  journeyPhaseKey: string | null;
  daysAgo: number;
}

export interface PipelineLists {
  paidNotInFlight: DashboardListItem[];
  onboarding: DashboardListItem[];
  unallocatedQueue: DashboardListItem[];
  generatedAt: string;
}

interface Candidate {
  id: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string | Date;
  tourId: string | null;
}

interface PaidNotInFlightRow {
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  tourId: string | null;
  SeekSubStartDate: string | null;
  createdAt: string | Date;
  seekExternalCredentials: Record<string, unknown> | null;
}

interface OnboardingRow {
  id: string;
  firstName: string;
  lastName: string;
  createdAt: string | Date;
}

const daysAgo = (from: string | Date, now: Date): number => {
  const fromDate = from instanceof Date ? from : new Date(from);
  return Math.max(0, Math.floor((now.getTime() - fromDate.getTime()) / DAY_MS));
};

const fullName = (firstName?: string | null, lastName?: string | null): string =>
  `${firstName || ""} ${lastName || ""}`.trim() || "Unknown client";

class PipelineListsService {
  // "Current" journey step = the first step (in registry order) with no
  // completion row for that client — the same rule AdminClientJourney's
  // deriveJourneyState uses on the frontend, just resolved in bulk here.
  // Account-level steps (tourId null) always apply; tour-scoped steps only
  // count against a client's own active tour (their Credentials.tourId).
  private async resolveCurrentSteps(
    candidates: Candidate[],
  ): Promise<Map<string, { stepKey: string | null; phaseKey: string | null }>> {
    const result = new Map<string, { stepKey: string | null; phaseKey: string | null }>();
    if (candidates.length === 0) {
      return result;
    }

    const userIds = candidates.map((c) => c.id);
    const tourIds = Array.from(
      new Set(candidates.map((c) => c.tourId).filter((t): t is string => !!t)),
    );

    const stepRows = await ClientJourneyStep.findAll({
      where: {
        userId: { [Op.in]: userIds },
        [Op.or]: [{ tourId: null }, { tourId: { [Op.in]: tourIds } }],
      },
      attributes: ["userId", "stepKey"],
    });

    const completedByUser = new Map<string, Set<string>>();
    for (const row of stepRows) {
      if (!completedByUser.has(row.userId)) {
        completedByUser.set(row.userId, new Set());
      }
      completedByUser.get(row.userId)!.add(row.stepKey);
    }

    for (const candidate of candidates) {
      const completed = completedByUser.get(candidate.id) ?? new Set<string>();
      const current = CLIENT_JOURNEY_STEPS.find((def) => !completed.has(def.stepKey));
      result.set(candidate.id, {
        stepKey: current?.stepKey ?? null,
        phaseKey: current?.phaseKey ?? null,
      });
    }

    return result;
  }

  private toListItems(
    candidates: Candidate[],
    currentSteps: Map<string, { stepKey: string | null; phaseKey: string | null }>,
    now: Date,
  ): DashboardListItem[] {
    return candidates.map((candidate) => {
      const step = currentSteps.get(candidate.id) ?? { stepKey: null, phaseKey: null };
      return {
        id: candidate.id,
        name: fullName(candidate.firstName, candidate.lastName),
        journeyStepKey: step.stepKey,
        journeyPhaseKey: step.phaseKey,
        daysAgo: daysAgo(candidate.createdAt, now),
      };
    });
  }

  // Same population as the Pipeline card's "Paid · Not In-Flight" tile:
  // capitalized = HOLD and the campaign hasn't ended yet.
  private async getPaidNotInFlightCandidates(): Promise<Candidate[]> {
    const sequelize = getSequelize();

    const rows = await sequelize.query<PaidNotInFlightRow>(
      `
        SELECT
          u.id AS "userId",
          u."firstName" AS "firstName",
          u."lastName" AS "lastName",
          c."tourId" AS "tourId",
          c."SeekSubStartDate" AS "SeekSubStartDate",
          c."createdAt" AS "createdAt",
          c."seekExternalCredentials" AS "seekExternalCredentials"
        FROM credentials c
        LEFT JOIN users u ON u.id::text = c."clientId"::text
        WHERE c."isDeleted" = false
          AND c.capitalized = 'HOLD'
        ORDER BY c."createdAt" ASC
      `,
      { type: QueryTypes.SELECT },
    );

    const now = new Date();
    const candidates: Candidate[] = [];

    for (const row of rows) {
      const cred = row.seekExternalCredentials || {};
      const computed = calculateCampaignFields({
        SeekSubStartDate: row.SeekSubStartDate || undefined,
        createdAt: row.createdAt,
        SeekSubDurDays: (cred as any).SeekSubDurDays,
        GraceDuration: (cred as any).GraceDuration,
      });

      const campaignEnd = parseDate(computed.CampaignEnd);
      if (!campaignEnd || campaignEnd.getTime() <= now.getTime()) {
        continue;
      }

      candidates.push({
        id: row.userId || "",
        firstName: row.firstName,
        lastName: row.lastName,
        createdAt: row.createdAt,
        tourId: row.tourId,
      });

      if (candidates.length >= LIST_LIMIT) {
        break;
      }
    }

    return candidates;
  }

  // Same population as the Pipeline card's "Onboarding" tile: client/guest
  // users with no currently active paid plan.
  private async getOnboardingCandidates(): Promise<Candidate[]> {
    const sequelize = getSequelize();

    const rows = await sequelize.query<OnboardingRow>(
      `
        SELECT u.id, u."firstName", u."lastName", u."createdAt"
        FROM users u
        WHERE u."deletedAt" IS NULL
          AND u.role IN (:roles)
          AND NOT EXISTS (
            SELECT 1 FROM plans p
            WHERE p."userId" = u.id
              AND p."deletedAt" IS NULL
              AND p."paymentStatus" = 'completed'
              AND COALESCE(p."hasExpired", false) = false
          )
        ORDER BY u."createdAt" ASC
        LIMIT :limit
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { roles: ONBOARDING_ROLES, limit: LIST_LIMIT },
      },
    );

    if (rows.length === 0) {
      return [];
    }

    // Onboarding users rarely have a credentials/tour row yet, but pull it
    // when it exists (e.g. a lapsed past subscriber) so tour-scoped steps
    // from a prior campaign still resolve correctly.
    const tourRows = await Credentials.findAll({
      where: { clientId: { [Op.in]: rows.map((r) => r.id) } },
      attributes: ["clientId", "tourId"],
    });
    const tourByClientId = new Map(tourRows.map((r) => [r.clientId, r.tourId || null]));

    return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      createdAt: row.createdAt,
      tourId: tourByClientId.get(row.id) ?? null,
    }));
  }

  // Same population as the Pipeline card's "Unallocated In-Flight" tile:
  // in-flight credentials with no AssignedPCName/AssignedPCEmail. Needs the
  // decrypted PC fields, so this goes through the Sequelize model rather
  // than a raw query, joining the client for name/tour in the same pass.
  private async getUnallocatedQueueCandidates(): Promise<Candidate[]> {
    const rows = await Credentials.findAll({
      where: {
        isDeleted: false,
        capitalized: { [Op.in]: FLIGHT_STATUSES },
      },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName"],
          required: false,
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    const candidates: Candidate[] = [];

    for (const row of rows) {
      if (row.AssignedPCName || row.AssignedPCEmail) {
        continue;
      }

      const client = row.client;
      candidates.push({
        id: client?.id || "",
        firstName: client?.firstName ?? null,
        lastName: client?.lastName ?? null,
        createdAt: row.createdAt,
        tourId: row.tourId || null,
      });

      if (candidates.length >= LIST_LIMIT) {
        break;
      }
    }

    return candidates;
  }

  async getPipelineLists(): Promise<PipelineLists> {
    const [paidNotInFlightCandidates, onboardingCandidates, unallocatedQueueCandidates] =
      await Promise.all([
        this.getPaidNotInFlightCandidates(),
        this.getOnboardingCandidates(),
        this.getUnallocatedQueueCandidates(),
      ]);

    const allCandidates = [
      ...paidNotInFlightCandidates,
      ...onboardingCandidates,
      ...unallocatedQueueCandidates,
    ];

    // A failure resolving journey steps shouldn't take the whole endpoint
    // down — the candidate lists themselves (already validated against the
    // Pipeline tile's own counts) are the important part; journey labels
    // degrade to "Journey complete" on the frontend if this map comes back
    // empty for someone.
    let currentSteps: Map<string, { stepKey: string | null; phaseKey: string | null }>;
    try {
      currentSteps = await this.resolveCurrentSteps(allCandidates);
    } catch (error: any) {
      logger.error(`Failed to resolve client-journey steps for pipeline lists: ${error?.message || error}`);
      currentSteps = new Map();
    }

    const now = new Date();
    const paidNotInFlight = this.toListItems(paidNotInFlightCandidates, currentSteps, now);
    const onboarding = this.toListItems(onboardingCandidates, currentSteps, now);
    const unallocatedQueue = this.toListItems(unallocatedQueueCandidates, currentSteps, now);

    logger.info(
      `Pipeline lists computed (paidNotInFlight=${paidNotInFlight.length}, onboarding=${onboarding.length}, unallocatedQueue=${unallocatedQueue.length})`,
    );

    return {
      paidNotInFlight,
      onboarding,
      unallocatedQueue,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const pipelineListsService = new PipelineListsService();
