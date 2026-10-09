import cron from "node-cron";
import { completeJourneyStepOnce } from "../../services/client-journey.service";
import { getServiceLogger } from "../../utils/createLogger";
import { ClientJourneyActorType, ClientJourneySource } from "../../utils/enum";
import { loadClientsWithEndDate } from "./subscription-expiry-reminder.job";

const logger = getServiceLogger("expiration-notice-cron-job");

/**
 * SPR-21-13-009 — automated subscription expiration notices (Notification
 * Audit, steps 30/31/35).
 *
 * The three `expiration_notice_14day` / `_7day` / `_0day` journey steps had no
 * code path that fires at the right campaign day: they existed as registry
 * rows and nothing more. This job derives the trigger by polling, mirroring
 * the check-in scheduler (SPR-21-13-001) and the applications-started job
 * (SPR-21-13-003):
 *
 *   For each eligible client the end date is the SAME recomputed CampaignEnd
 *   the campaign management page and the expiry digest use
 *   (SeekSubStartDate + SeekSubDurDays + GraceDuration), so the countdown is
 *   in lock-step with the source of truth (register task 1: "confirm the
 *   subscription end date field is available for the scheduler query"). When
 *   the whole days remaining lands on a milestone the job calls
 *   `completeJourneyStepOnce`, which marks the step done (once per tour) and
 *   fires the client renewal email, the delivery-team copy and the #town-crier
 *   post via ADMIN_ATTEST_NOTIFY_STEPS + STEP_MAILS + STEP_SLACK_HEADLINES in
 *   the notify service.
 *
 *   - Plans of 7 days or fewer are SKIPPED entirely: their cadence is defined
 *     by SPR-21-59-018 (3-day / 1-day notices), a separate ticket. This job
 *     only owns the >7-day 14/7/0-day cadence.
 *   - The 14-day and 7-day notices tolerate a one-day-late run (windows
 *     [13,14] and [6,7]) so a missed deploy or restart does not silently lose
 *     a notice; the 0-day notice fires on the day itself only.
 *   - Idempotency comes free from `completeJourneyStepOnce`'s first-transition
 *     guard plus the unique (userId, tourId, stepKey) journey index — a client
 *     is notified at most once per milestone.
 *
 * Runs daily at 6 AM WAT (05:00 UTC), one hour before the expiry digest, so
 * the day-0 notice still sees the client's plan fields intact (the digest
 * nulls them when it processes the same 0-day bucket). Every environment runs
 * it so IAT exercises the same path (Slack routes to CRY_WOLF off-prod).
 */

type ExpirationMilestone = {
  stepKey:
    | "expiration_notice_14day"
    | "expiration_notice_7day"
    | "expiration_notice_0day";
  from: number;
  to: number;
};

// [from, to] inclusive windows. The 14/7-day windows allow a one-day-late run;
// the day-0 window is exact. Non-overlapping so a plan matches at most one
// milestone per run.
const MILESTONES: ExpirationMilestone[] = [
  { stepKey: "expiration_notice_14day", from: 13, to: 14 },
  { stepKey: "expiration_notice_7day", from: 6, to: 7 },
  { stepKey: "expiration_notice_0day", from: 0, to: 0 },
];

// Plans of 7 days or fewer route to the SPR-21-59-018 cadence instead.
const MAX_SHORT_PLAN_DAYS = 7;

export async function runExpirationNoticeJob(): Promise<void> {
  logger.info("🔔 Running subscription expiration notice job...");

  const clients = await loadClientsWithEndDate();
  const counts: Record<string, number> = {
    expiration_notice_14day: 0,
    expiration_notice_7day: 0,
    expiration_notice_0day: 0,
  };
  let skippedShortPlans = 0;

  for (const client of clients) {
    try {
      const durDays = Number(client.jsonb.SeekSubDurDays || 0);
      if (durDays <= MAX_SHORT_PLAN_DAYS) {
        skippedShortPlans++;
        continue;
      }

      const daysRemaining = client.daysRemaining;
      const due = MILESTONES.filter(
        (milestone) =>
          daysRemaining >= milestone.from && daysRemaining <= milestone.to,
      );
      if (due.length === 0) continue;

      for (const milestone of due) {
        const completed = await completeJourneyStepOnce(
          client.clientId,
          milestone.stepKey,
          "SYSTEM",
          ClientJourneyActorType.SYSTEM,
          ClientJourneySource.AUTOMATIC,
        );
        if (completed) {
          counts[milestone.stepKey]++;
          logger.info(
            `${milestone.stepKey} auto-completed with notification for user ${client.clientId} (${daysRemaining} days remaining)`,
          );
        }
      }
    } catch (error: any) {
      logger.error(
        `Expiration notice processing failed for user ${client.clientId}: ${error?.message || error}`,
      );
    }
  }

  logger.info(
    `✅ Expiration notice job completed — 14-day: ${counts.expiration_notice_14day}, ` +
      `7-day: ${counts.expiration_notice_7day}, day-0: ${counts.expiration_notice_0day}, ` +
      `short plans skipped: ${skippedShortPlans}`,
  );
}

/**
 * Cron job: runs daily at 6 AM WAT (05:00 UTC) — before the 7 AM expiry
 * digest, so the day-0 notice reads the client's plan before the digest
 * resets it.
 */
export function createExpirationNoticeJob() {
  return cron.schedule(
    "0 6 * * *",
    async () => {
      try {
        await runExpirationNoticeJob();
      } catch (error: any) {
        logger.error(`❌ Expiration notice job failed: ${error.message}`);
      }
    },
    {
      scheduled: false,
      timezone: "Africa/Lagos",
    } as any,
  );
}
