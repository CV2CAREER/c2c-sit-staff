import cron from "node-cron";
import { QueryTypes } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import {
  JourneyMessageLog,
  JourneyMessageLogStatus,
} from "../../models/v1/journey-message-log.model";
import { sendMail } from "../../config/sendGrid";
import { fieldEncryption } from "../../utils/field-encryption";
import { getFullName, getFrontendUrl } from "../../utils/helpers";
import { getServiceLogger } from "../../utils/createLogger";
import { SlackService } from "../../services/slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../../utils/enum";

const logger = getServiceLogger("monthly-followup-cron-job");

/**
 * SPR-21-13-008 — Monthly post-campaign follow-up (Notification Audit,
 * step 39 DoD3): a monthly email combining the placement check-in and the
 * renewal prompt, continuing until placement is confirmed or the customer
 * opts out, with a #town-crier post on each send.
 *
 * The trigger is derived by polling (checkin-scheduler / applications-started
 * precedent). The candidate SQL seeks `credentials` clients whose
 * `campaign_ended` row is due for the next monthly send and returns only
 * rows that are FULLY ELIGIBLE:
 *
 *   - at least CADENCE_DAYS have passed since the campaign ended (the
 *     renewal email already fired at campaign end, so the first monthly
 *     follow-up lands one month later),
 *   - the campaign ended on/after CADENCE_START — campaigns that ended
 *     BEFORE this cadence shipped are not part of the cycle (the commented
 *     line below opts them back in if business wants it),
 *   - no `offer_placement_recorded` row for that tour (placement confirmed),
 *   - the client is not in `unsubscribedusers` (opted out),
 *   - no `monthly_followup` attempt (any status) in the last CADENCE_DAYS —
 *     cadence is keyed on the last ATTEMPT, so a transient send failure is
 *     logged as a FAILED row and waits its turn instead of retrying every
 *     run.
 *
 * Every eligible candidate gets one sendMail + one #town-crier post + one
 * `journey_message_logs` row (stepKey "monthly_followup", messageType
 * "placement_renewal") so the next due date is derivable. Rows that fail any
 * condition are never returned by the SQL, so this job performs NO fallback
 * action of any kind.
 *
 * Runs daily at 09:00 UTC. Assumes the single-instance cron deployment the
 * rest of this scheduler assumes.
 */

const CADENCE_DAYS = 30;

/**
 * Campaigns that ended BEFORE this date are skipped by the cadence (see the
 * SQL below). TODO(setup): set to the actual go-live date before shipping —
 * a campaign ending between this date and go-live would miss its first
 * monthly window only if the dates are wrong, never the other way round
 * (already-ended campaigns stay excluded).
 */
const CADENCE_START = new Date("2026-10-31");

type Candidate = { userId: string; tourId: string; endedAt: Date };

// Eligibility lives entirely in SQL so ineligible rows are never selected:
// ended at least CADENCE_DAYS ago AND on/after CADENCE_START, placement not
// confirmed, not opted out, and no attempt within the last CADENCE_DAYS.
const CANDIDATES_SQL = `
  SELECT DISTINCT c."clientId" AS "userId", c."tourId" AS "tourId", ce."completedAt" AS "endedAt"
  FROM credentials c
  JOIN client_journey_steps ce
    ON ce."userId" = c."clientId"
   AND ce."tourId" = c."tourId"
   AND ce."stepKey" = 'campaign_ended'
   AND ce."completedAt" IS NOT NULL
   AND ce."deletedAt" IS NULL
  WHERE c."tourId" IS NOT NULL
    AND ce."completedAt" <= NOW() - (:cadenceDays * INTERVAL '1 day')
    AND ce."completedAt" >= :cadenceStart
    -- OPT-IN BACKFILL: delete/comment the line above to start the cadence
    -- for campaigns that already ended when this shipped (first send goes
    -- out on the first run after deploy instead of one month after ending).
    AND NOT EXISTS (
      SELECT 1 FROM client_journey_steps p
      WHERE p."userId" = c."clientId"
        AND p."tourId" = c."tourId"
        AND p."stepKey" = 'offer_placement_recorded'
        AND p."deletedAt" IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM unsubscribedusers u
      WHERE u."userId" = c."clientId"
    )
    AND NOT EXISTS (
      SELECT 1 FROM journey_message_logs m
      WHERE m."userId" = c."clientId"
        AND m."stepKey" = 'monthly_followup'
        AND m."createdAt" > NOW() - (:cadenceDays * INTERVAL '1 day')
    )
`;

export async function runMonthlyFollowupScan(): Promise<void> {
  const sequelize = Credentials.sequelize;
  if (!sequelize) {
    throw new Error("Sequelize not initialised");
  }

  const candidates = await sequelize.query<Candidate>(CANDIDATES_SQL, {
    type: QueryTypes.SELECT,
    replacements: {
      cadenceDays: CADENCE_DAYS,
      cadenceStart: CADENCE_START,
    },
  });

  // DISTINCT in the SQL keeps this single-pass even if a client has more
  // than one credentials row for the tour.
  for (const candidate of candidates) {
    const { userId } = candidate;
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(`monthly follow-up: user ${userId} not found — skipping`);
        continue;
      }

      const email = await fieldEncryption.getUserEmail(userId);
      if (!email) {
        logger.warn(
          `monthly follow-up: no resolvable email for user ${userId} — skipping`,
        );
        continue;
      }

      const frontendUrl = getFrontendUrl();
      const planTitle = user.plan || user.selectedPlan || "Your plan";

      let status = JourneyMessageLogStatus.SENT;
      let errorMessage: string | undefined;
      try {
        await sendMail({
          email,
          subject: "Your Check-In — Placement Update & Renewal Options",
          templateName: "monthly-followup-client.ejs",
          templateData: {
            name: user.firstName,
            plan: planTitle,
            frontendUrl,
            currentYear: new Date().getFullYear(),
          },
        });
      } catch (mailError: any) {
        status = JourneyMessageLogStatus.FAILED;
        errorMessage = String(mailError?.message || mailError).slice(0, 512);
        logger.error(
          `monthly follow-up email failed for user ${userId}: ${errorMessage}`,
        );
      }

      if (status === JourneyMessageLogStatus.SENT) {
        // DoD3 — #town-crier on each send. Cron has no request host, so the
        // environment derives from CLIENT_APP_DOMAIN (expiry-reminder
        // precedent).
        await SlackService.notify({
          location: getEnvironmentFromHost(process.env.CLIENT_APP_DOMAIN),
          host: process.env.CLIENT_APP_DOMAIN,
          node: SlackNode.BACKGROUND_JOB,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          type: SlackEventType.SYSTEM_JOB,
          channel: SlackChannel.TOWN_CRIER,
          trigger: "Monthly placement check-in / renewal follow-up",
          body: `Monthly follow-up email sent — placement check-in + renewal prompt.\nClient: ${getFullName(user)} (${email})\nPlan: ${planTitle}\nCampaign ended: ${candidate.endedAt.toISOString().slice(0, 10)}`,
        });
      }

      await JourneyMessageLog.create({
        userId,
        stepKey: "monthly_followup",
        messageType: "placement_renewal",
        recipientEmail: email,
        status,
        errorMessage,
        triggeredByAdminId: "SYSTEM",
      });

      logger.info(
        `monthly follow-up ${status} for user ${userId} (tour ${candidate.tourId})`,
      );
    } catch (error: any) {
      logger.error(
        `monthly follow-up processing failed for user ${userId}: ${error?.message || error}`,
      );
    }
  }
}

export function createMonthlyFollowupJob() {
  const job = cron.schedule("0 9 * * *", async () => {
    try {
      await runMonthlyFollowupScan();
    } catch (error: any) {
      logger.error(`monthly follow-up scan failed: ${error?.message || error}`);
    }
  });

  return job;
}
