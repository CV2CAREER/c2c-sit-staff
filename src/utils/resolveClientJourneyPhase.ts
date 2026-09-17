import { Op } from "sequelize";
import { ClientJourneyStep } from "../models/v1/client-journey-step.model";
import { CLIENT_JOURNEY_STEPS } from "./clientJourneySteps";
import { ClientJourneyPhase } from "./enum";

export interface JourneyPhaseCandidate {
  id: string;
  tourId: string | null;
}

export interface JourneyPhaseResult {
  stepKey: string | null;
  phaseKey: ClientJourneyPhase | null;
}

// Phases 1-4 in the client-facing numbering (Getting Started, Welcome,
// Toolkit, Final Checks) — everything before Phase 5's campaign_launched
// attestation, i.e. "not yet LIVE".
export const NOT_YET_LIVE_PHASES: ClientJourneyPhase[] = [
  ClientJourneyPhase.GETTING_STARTED,
  ClientJourneyPhase.WELCOME,
  ClientJourneyPhase.TOOLKIT,
  ClientJourneyPhase.FINAL_CHECKS,
];

// "Current" journey step/phase = the first step (in registry order) with no
// completion row for that client — the same rule AdminClientJourney's
// deriveJourneyState uses on the frontend, resolved in bulk here so both the
// pipeline stats tiles and the pipeline detail lists agree on each client's
// phase. Account-level steps (tourId null) always apply; tour-scoped steps
// only count against a client's own active tour (their Credentials.tourId).
export async function resolveCurrentJourneyPhases(
  candidates: JourneyPhaseCandidate[],
): Promise<Map<string, JourneyPhaseResult>> {
  const result = new Map<string, JourneyPhaseResult>();
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
