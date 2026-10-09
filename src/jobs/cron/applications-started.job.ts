import cron from "node-cron";
import { QueryTypes } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import {
  completeJourneyStepOnce,
  completeJourneyStepSilently,
} from "../../services/client-journey.service";
import { getServiceLogger } from "../../utils/createLogger";
import { ClientJourneyActorType, ClientJourneySource } from "../../utils/enum";

const logger = getServiceLogger("applications-started-cron-job");

const STEP_KEY = "applications_started";

/**
 * SPR-21-13-003 — First Application Sent (Notification Audit, step 24).
 *
 * The `applications` table is written exclusively by the AI extraction
 * service (a separate process on a separate host calling straight into the
 * shared database), so there is no in-repo insert hook to attach to — the
 * journey tick is derived by polling instead:
 *
 *   Phase 1 — scan `credentials` (small: ~1.1k rows in prod) for clients that
 *             have at least one application row and no completed
 *             `applications_started` step for their active tour. Both probes
 *             are index seeks (`applications(client_id)` and the unique
 *             `(userId, tourId, stepKey)` journey index), so run cost does
 *             NOT grow with the 4.75M-row / 4.4GB applications table.
 *
 *   Phase 2 — for each candidate (normally 0–2, shrinks to 0 once everyone is
 *             ticked) read MIN(createdAt) for that ONE client:
 *             fresh (≤ 24h)  = genuinely their first application →
 *                              completeJourneyStepOnce fires the customer +
 *                              delivery-team emails and the #town-crier post,
 *                              exactly once (wasCompleted guard);
 *             older          = pre-feature history → tick silently, so legacy
 *                              clients never get a "your first application!"
 *                              email months late.
 *
 * Either way `users.isApplicationStarted` is set — the flag the customer
 * backend's legacy journey backfill reads and that nothing ever wrote before
 * this item.
 *
 * Runs every minute (blog-publish precedent). Assumes the single-instance
 * cron deployment the rest of this scheduler already assumes; the unique
 * journey index + find-before-create make concurrent double-completion safe.
 */
const FRESH_FIRST_APPLICATION_MS = 24 * 60 * 60 * 1000;

type Candidate = { userId: string; tourId: string };

const CANDIDATES_SQL = `
  SELECT c."clientId" AS "userId", c."tourId" AS "tourId"
  FROM credentials c
  WHERE c."tourId" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM applications a WHERE a.client_id = c."clientId"
    )
    AND NOT EXISTS (
      SELECT 1 FROM client_journey_steps j
      WHERE j."userId" = c."clientId"
        AND j."tourId" = c."tourId"
        AND j."stepKey" = 'applications_started'
        AND j."deletedAt" IS NULL
    )
`;

const FIRST_APPLICATION_AT_SQL = `
  SELECT MIN("createdAt") AS "firstAppAt"
  FROM applications
  WHERE client_id = :userId
`;

export async function runApplicationsStartedCheck(): Promise<void> {
  const sequelize = Credentials.sequelize;
  if (!sequelize) {
    throw new Error("Sequelize not initialised");
  }

  const candidates = await sequelize.query<Candidate>(CANDIDATES_SQL, {
    type: QueryTypes.SELECT,
  });

  for (const candidate of candidates) {
    try {
      const rows = await sequelize.query<{ firstAppAt: Date | string | null }>(
        FIRST_APPLICATION_AT_SQL,
        { type: QueryTypes.SELECT, replacements: { userId: candidate.userId } },
      );
      const rawFirstAppAt = rows[0]?.firstAppAt ?? null;
      const firstAppAt = rawFirstAppAt ? new Date(rawFirstAppAt) : null;

      // "This client has applied" is a fact regardless of freshness — set the
      // flag first so a later step failure can't leave it stale.
      await User.update(
        { isApplicationStarted: true },
        { where: { id: candidate.userId } },
      );

      const isFresh =
        firstAppAt !== null &&
        Date.now() - firstAppAt.getTime() <= FRESH_FIRST_APPLICATION_MS;

      const completed = isFresh
        ? await completeJourneyStepOnce(
            candidate.userId,
            STEP_KEY,
            "SYSTEM",
            ClientJourneyActorType.SYSTEM,
            ClientJourneySource.AUTOMATIC,
          )
        : await completeJourneyStepSilently(
            candidate.userId,
            STEP_KEY,
            "SYSTEM",
            ClientJourneyActorType.SYSTEM,
            ClientJourneySource.AUTOMATIC,
          );

      logger.info(
        `applications_started ${isFresh ? "auto-completed with notification" : "backfilled silently"} for user ${candidate.userId}` +
          (completed ? "" : " — already complete, nothing done"),
      );
    } catch (error: any) {
      logger.error(
        `applications_started processing failed for user ${candidate.userId}: ${error?.message || error}`,
      );
    }
  }
}

export function createApplicationsStartedJob() {
  const job = cron.schedule("*/1 * * * *", async () => {
    try {
      await runApplicationsStartedCheck();
    } catch (error: any) {
      logger.error(`applications_started scan failed: ${error?.message || error}`);
    }
  });

  return job;
}
