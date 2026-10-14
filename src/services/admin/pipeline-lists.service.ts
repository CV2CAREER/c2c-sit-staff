import { Op, QueryTypes } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";
import { calculateCampaignFields, parseDate } from "../../utils/campaign-calculator";
import {
  NOT_YET_LIVE_PHASES,
  resolveCurrentJourneyPhases,
} from "../../utils/resolveClientJourneyPhase";

const logger = getServiceLogger("pipeline-lists-service");

const FLIGHT_STATUSES = ["INFLIGHT"];
const LIST_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const NOT_YET_LIVE_DAY_THRESHOLD = 14;

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

const daysAgo = (from: string | Date, now: Date): number => {
  const fromDate = from instanceof Date ? from : new Date(from);
  return Math.max(0, Math.floor((now.getTime() - fromDate.getTime()) / DAY_MS));
};

const fullName = (firstName?: string | null, lastName?: string | null): string =>
  `${firstName || ""} ${lastName || ""}`.trim() || "Unknown client";

class PipelineListsService {
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

  // Base population for both "Paid · not in-flight" and "Onboarding":
  // capitalized = HOLD (paid) and the campaign hasn't ended yet. The two
  // lists are then split from this same pool by journey phase + days on
  // hold in getPipelineLists() — no LIST_LIMIT cap here, since that split
  // has to happen before either list is capped.
  private async getPaidCandidates(): Promise<Candidate[]> {
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
    }

    return candidates;
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
    const [paidCandidates, unallocatedQueueCandidates] = await Promise.all([
      this.getPaidCandidates(),
      this.getUnallocatedQueueCandidates(),
    ]);

    const allCandidates = [...paidCandidates, ...unallocatedQueueCandidates];

    // A failure resolving journey steps shouldn't take the whole endpoint
    // down — the candidate lists themselves (already validated against the
    // Pipeline tile's own counts) are the important part; journey labels
    // degrade to "Journey complete" on the frontend if this map comes back
    // empty for someone.
    let currentPhases: Map<string, { stepKey: string | null; phaseKey: string | null }>;
    try {
      currentPhases = await resolveCurrentJourneyPhases(allCandidates);
    } catch (error: any) {
      logger.error(`Failed to resolve client-journey steps for pipeline lists: ${error?.message || error}`);
      currentPhases = new Map();
    }

    const now = new Date();

    // Paid ("HOLD") clients still in Phase 1-4 (not yet LIVE / Phase 5
    // campaign_launched attestation) split by how long they've been on
    // hold: 14+ days = stuck ("Paid · not in-flight"), under 14 days =
    // still working through onboarding normally.
    const notYetLive = paidCandidates.filter((c) => {
      const phase = currentPhases.get(c.id)?.phaseKey;
      return !!phase && (NOT_YET_LIVE_PHASES as string[]).includes(phase);
    });
    const paidNotInFlightCandidates = notYetLive
      .filter((c) => daysAgo(c.createdAt, now) >= NOT_YET_LIVE_DAY_THRESHOLD)
      .slice(0, LIST_LIMIT);
    const onboardingCandidates = notYetLive
      .filter((c) => daysAgo(c.createdAt, now) < NOT_YET_LIVE_DAY_THRESHOLD)
      .slice(0, LIST_LIMIT);

    const paidNotInFlight = this.toListItems(paidNotInFlightCandidates, currentPhases, now);
    const onboarding = this.toListItems(onboardingCandidates, currentPhases, now);
    const unallocatedQueue = this.toListItems(unallocatedQueueCandidates, currentPhases, now);

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
