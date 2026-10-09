import cron from "node-cron";
import { ClientJourneyStep } from "../../models/v1/client-journey-step.model";
import { getServiceLogger } from "../../utils/createLogger";
import { runPipelineLeaderboardJob } from "./pipelineLeaderboard.job";

const logger = getServiceLogger("offer-placement-watch");

// SPR-21-13-005 — DoD2: "Update the placement controller leaderboard whenever
// an offer or placement is recorded" (Business Impact: "Placements are not
// recorded in real time and the team gets no Slack celebration signal").
//
// offer_placement_recorded rows are written by EITHER side — the customer's
// self-report endpoint (customer backend) or a staff attest (this backend) —
// into the shared client_journey_steps table. This minute watcher is the
// single mechanism that covers both: the moment a row newer than the last one
// we've seen appears, the Pipeline Performance Leaderboard re-fires so PC
// rankings include the new placement within ~60 seconds. No cross-service
// HTTP, no new env/secrets.
//
// The watermark is module-level and seeded from the DB on the first check, so
// a process restart never re-posts a leaderboard for placements that were
// already recorded.

let lastSeenCompletedAt: Date | null = null;

async function findLatestPlacement(): Promise<Date | null> {
  const rows = await ClientJourneyStep.findAll({
    where: { stepKey: "offer_placement_recorded" },
    attributes: ["completedAt"],
    order: [["completedAt", "DESC"]],
    limit: 1,
    raw: true,
  });
  return rows.length > 0 ? new Date((rows[0] as any).completedAt) : null;
}

export async function runOfferPlacementWatchCheck(): Promise<void> {
  try {
    const latest = await findLatestPlacement();
    if (!latest) return;

    if (lastSeenCompletedAt === null) {
      // First check after boot — adopt the current watermark silently so an
      // old placement never triggers a post just because the server started.
      lastSeenCompletedAt = latest;
      logger.info(
        `Leaderboard placement watermark initialized at ${lastSeenCompletedAt.toISOString()}`,
      );
      return;
    }

    if (latest.getTime() <= lastSeenCompletedAt.getTime()) return;

    lastSeenCompletedAt = latest;
    logger.info(
      `New offer/placement recorded (${latest.toISOString()}) — refreshing the Pipeline Performance Leaderboard`,
    );

    try {
      await runPipelineLeaderboardJob();
    } catch (error: any) {
      // Fire-and-forget semantics, same as every notify path: a failed
      // leaderboard post is logged, never retried in a loop, and never
      // blocks the recording that triggered it.
      logger.error(
        `Placement-triggered leaderboard refresh failed: ${error?.message || error}`,
      );
    }
  } catch (error: any) {
    logger.error(`offer_placement_recorded watch failed: ${error?.message || error}`);
  }
}

export function createOfferPlacementWatchJob() {
  const job = cron.schedule("* * * * *", async () => {
    try {
      await runOfferPlacementWatchCheck();
    } catch (error: any) {
      logger.error(`offer_placement_recorded watch failed: ${error?.message || error}`);
    }
  });

  return job;
}
