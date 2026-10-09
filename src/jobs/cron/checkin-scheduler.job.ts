import cron from "node-cron";
import { QueryTypes } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { completeJourneyStepOnce } from "../../services/client-journey.service";
import { getServiceLogger } from "../../utils/createLogger";
import { ClientJourneyActorType, ClientJourneySource } from "../../utils/enum";

const logger = getServiceLogger("checkin-scheduler-cron-job");

/**
 * SPR-21-13-001 — Week 4 / Week 12 automated check-ins (Notification Audit,
 * steps 25-26).
 *
 * Neither step had a code path that fires at the right campaign day:
 * `week4_checkin` existed as a registry row and nothing more, and
 * `week12_checkin` did not exist at all. The trigger is derived by polling,
 * mirroring the applications-started job (SPR-21-13-003):
 *
 *   For each configured step the candidate SQL seeks `credentials` clients
 *   whose `campaign_launched` row crossed the due day (28 / 84 days from its
 *   completedAt) and returns only rows that are FULLY ELIGIBLE:
 *
 *     - the target step row does not exist yet,
 *     - the campaign has NOT ended (no `campaign_ended` row for that tour),
 *     - we are still inside the 24-hour window right after the due day
 *       (late deploys / downtime past the window do nothing at all — no
 *       catch-up email, no silent backfill; the step simply stays pending
 *       until a staff member attests it manually),
 *     - week 12 only: the client has an active plan (audit wording: "Email
 *       fires at day 84 if plan still active"), using the same predicate the
 *       subscription-check job uses.
 *
 * Every eligible candidate gets `completeJourneyStepOnce`, which marks the
 * step done and fires the customer booking-link email, the delivery-team
 * admin copy and the #town-crier post exactly once (ADMIN_ATTEST_NOTIFY_STEPS
 * + STEP_MAILS + STEP_SLACK_HEADLINES in the notify service). Rows that fail
 * any condition are never returned by the SQL, so this job performs NO
 * fallback action of any kind — it only ever sends the notifications the
 * audit asks for.
 *
 * Runs every minute (blog-publish / applications-started precedent). Assumes
 * the single-instance cron deployment the rest of this scheduler assumes; the
 * unique journey index + find-before-create make concurrent
 * double-completion safe.
 */

const FRESH_WINDOW_DAYS = 1;

type CheckinConfig = {
  stepKey: "week4_checkin" | "week12_checkin";
  dueDay: number;
  requiresActivePlan: boolean;
};

const CHECKINS: CheckinConfig[] = [
  { stepKey: "week4_checkin", dueDay: 28, requiresActivePlan: false },
  { stepKey: "week12_checkin", dueDay: 84, requiresActivePlan: true },
];

type Candidate = { userId: string; tourId: string };

// Eligibility lives entirely in SQL so ineligible rows are never selected:
// launchedAt <= now - dueDay days (due has passed) AND launchedAt > now -
// (dueDay + 1) days (still inside the fresh window), target step absent,
// campaign not ended, and (when required) an active plan exists.
const CANDIDATES_SQL = `
  SELECT c."clientId" AS "userId", c."tourId" AS "tourId"
  FROM credentials c
  JOIN client_journey_steps l
    ON l."userId" = c."clientId"
   AND l."tourId" = c."tourId"
   AND l."stepKey" = 'campaign_launched'
   AND l."completedAt" IS NOT NULL
   AND l."deletedAt" IS NULL
  WHERE c."tourId" IS NOT NULL
    AND l."completedAt" <= NOW() - (:dueDay * INTERVAL '1 day')
    AND l."completedAt" > NOW() - ((:dueDay + :freshDays) * INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM client_journey_steps j
      WHERE j."userId" = c."clientId"
        AND j."tourId" = c."tourId"
        AND j."stepKey" = :stepKey
        AND j."deletedAt" IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM client_journey_steps e
      WHERE e."userId" = c."clientId"
        AND e."tourId" = c."tourId"
        AND e."stepKey" = 'campaign_ended'
        AND e."deletedAt" IS NULL
    )
    AND (:requiresPlan = false OR EXISTS (
      SELECT 1 FROM plans p
      WHERE p."userId" = c."clientId"
        AND p."paymentStatus" = 'completed'
        AND p."hasExpired" = false
        AND p."deletedAt" IS NULL
        AND (p."expiresAt" IS NULL OR p."expiresAt" > NOW())
    ))
`;

export async function runCheckinScan(): Promise<void> {
  const sequelize = Credentials.sequelize;
  if (!sequelize) {
    throw new Error("Sequelize not initialised");
  }

  for (const checkin of CHECKINS) {
    const candidates = await sequelize.query<Candidate>(CANDIDATES_SQL, {
      type: QueryTypes.SELECT,
      replacements: {
        stepKey: checkin.stepKey,
        dueDay: checkin.dueDay,
        freshDays: FRESH_WINDOW_DAYS,
        requiresPlan: checkin.requiresActivePlan,
      },
    });

    for (const candidate of candidates) {
      try {
        const completed = await completeJourneyStepOnce(
          candidate.userId,
          checkin.stepKey,
          "SYSTEM",
          ClientJourneyActorType.SYSTEM,
          ClientJourneySource.AUTOMATIC,
        );

        logger.info(
          `${checkin.stepKey} auto-completed with notification for user ${candidate.userId}` +
            (completed ? "" : " — already complete, nothing done"),
        );
      } catch (error: any) {
        logger.error(
          `${checkin.stepKey} processing failed for user ${candidate.userId}: ${error?.message || error}`,
        );
      }
    }
  }
}

export function createCheckinSchedulerJob() {
  const job = cron.schedule("*/1 * * * *", async () => {
    try {
      await runCheckinScan();
    } catch (error: any) {
      logger.error(`check-in scan failed: ${error?.message || error}`);
    }
  });

  return job;
}
