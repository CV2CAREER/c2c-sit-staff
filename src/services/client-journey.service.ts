import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { ClientJourneyActorType, ClientJourneySource, ClientJourneyStepStatus } from "../utils/enum";
import { CLIENT_JOURNEY_STEP_BY_KEY } from "../utils/clientJourneySteps";
import { ClientJourneyStep } from "../models/v1/client-journey-step.model";
import { User } from "../models/v1/user.model";
import { Credentials } from "../models/v1/credentials.model";
import { CredentialsTour } from "../models/v1/credentials-tour.model";
import { notifySubscriptionStepCompletedByAdmin } from "./client-journey-notify.service";
import type { AttestDetails } from "./client-journey-notify.service";
import { dispatchConfirmationMessages } from "./journey-confirmation-messages.service";

const logger = getServiceLogger("ClientJourneyService");

interface ClientJourneyResult {
  activeTourId: string | null;
  activeTourNumber: number;
  steps: ClientJourneyStep[];
}

async function resolveActiveTour(
  userId: string,
): Promise<{ activeTourId: string | null; activeTourNumber: number }> {
  const credentials = await Credentials.findOne({ where: { clientId: userId } });

  if (!credentials?.tourId) {
    return { activeTourId: null, activeTourNumber: 1 };
  }

  const tour = await CredentialsTour.findByPk(credentials.tourId);

  return {
    activeTourId: credentials.tourId,
    activeTourNumber: tour?.tourNumber ?? 1,
  };
}

export async function getClientJourney(userId: string): Promise<ClientJourneyResult> {
  const client = await User.findByPk(userId, { attributes: ["id"] });

  if (!client) {
    throw new ErrorHandler("Client not found", 404);
  }

  const { activeTourId, activeTourNumber } = await resolveActiveTour(userId);

  const steps = await ClientJourneyStep.findAll({
    where: {
      userId,
      tourId: { [Op.or]: [null, activeTourId] },
    },
  });

  return { activeTourId, activeTourNumber, steps };
}

async function resolveTourIdForStep(
  userId: string,
  stepKey: string,
): Promise<{ phaseKey: string; tourId: string | null }> {
  const definition = CLIENT_JOURNEY_STEP_BY_KEY.get(stepKey);

  if (!definition) {
    throw new ErrorHandler(`Unknown client journey step: ${stepKey}`, 400);
  }

  if (!definition.perTour) {
    return { phaseKey: definition.phaseKey, tourId: null };
  }

  const { activeTourId } = await resolveActiveTour(userId);

  if (!activeTourId) {
    throw new ErrorHandler(
      "Client has no active tour to attest a tour-scoped step against",
      400,
    );
  }

  return { phaseKey: definition.phaseKey, tourId: activeTourId };
}

async function completeStep(
  userId: string,
  stepKey: string,
  actorId: string,
  actorType: ClientJourneyActorType,
  source: ClientJourneySource,
): Promise<ClientJourneyStep> {
  const { phaseKey, tourId } = await resolveTourIdForStep(userId, stepKey);

  const existing = await ClientJourneyStep.findOne({
    where: { userId, stepKey, tourId },
  });

  if (existing) {
    return existing;
  }

  // A previously completed-then-reopened row is soft-deleted, not removed,
  // and still holds the (userId, tourId, stepKey) unique slot — restore it
  // instead of creating a new row, or the insert below throws a
  // SequelizeUniqueConstraintError against the soft-deleted row.
  const reopened = await ClientJourneyStep.findOne({
    where: { userId, stepKey, tourId },
    paranoid: false,
  });

  if (reopened) {
    await reopened.restore();
    await reopened.update({
      phaseKey,
      status: ClientJourneyStepStatus.DONE,
      completedAt: new Date(),
      actorId,
      actorType,
      source,
      deletedBy: null,
    });
    return reopened;
  }

  return ClientJourneyStep.create({
    userId,
    tourId,
    phaseKey,
    stepKey,
    status: ClientJourneyStepStatus.DONE,
    completedAt: new Date(),
    actorId,
    actorType,
    source,
  } as any);
}

// SPR-21-11-005 / SPR-21-11-013: completing these subscription-scoped steps
// by hand must fire the same notifications as the customer-triggered payment
// path (the audit flagged the admin-attest path as silent).
// SPR-21-11-012: the two Final Checks quality gates the Notification Audit
// (steps 20-22) found silent are wired in here too — attesting them now mails
// the customer and posts to #town-crier.
// SPR-21-11-009: the three CV Toolkit steps (12-14) join as well, so a manual
// attest of a step the customer/admin upload path already completed stays
// silent (wasCompleted guard below) — the manual half of the DoD's
// duplicate-notification safeguard.
const ADMIN_ATTEST_NOTIFY_STEPS = new Set<string>([
  "service_selection",
  "payment_confirmed",
  "profile_alignment_check",
  "campaign_readiness_confirmed",
  "cv_variant_dispatch",
  "cv_approved",
  "cv_variant_uploaded",
  // SPR-21-11-006 / SPR-21-11-010 — the Welcome Call pair (7, 8) and the
  // Preference Review Session (17): the attest form now collects the
  // date/time (and outcome note), and these steps email the customer and
  // post to #town-crier on first completion.
  "welcome_call_scheduled",
  "welcome_call_completed",
  "preference_review_session",
  // SPR-21-13-002 — Campaign Commenced (audit step 23): attest now emails the
  // customer ("campaign is live") + the delivery team and posts to #town-crier.
  "campaign_launched",
  // SPR-21-13-003 — First Application Sent (audit step 24): the cron
  // auto-attests on the client's first `applications` row and mails the
  // customer + delivery team; a manual attest of the same step sends the
  // same set (the wasCompleted guard keeps the two paths from doubling up).
  "applications_started",
  // SPR-21-13-004 — Interview Milestone Reached (audit step 27): either-side
  // attest (staff form or the client's self-report endpoint) mails the
  // customer + delivery team and posts to #town-crier.
  "interview_milestone",
  // SPR-21-13-004 — IPP Dispatched (audit step 28): auto-completed by
  // saveInterviewPackController when the pack lands in document history;
  // the customer email carries the pack's direct download link.
  "interview_prep_pack_dispatched",
]);

// Whether a step already has a completion row for its (per-tour) scope — used
// so an attest only notifies when it newly completes the step, never on a
// repeat attest of an already-done step.
async function isJourneyStepCompleted(userId: string, stepKey: string): Promise<boolean> {
  const { tourId } = await resolveTourIdForStep(userId, stepKey);
  const existing = await ClientJourneyStep.findOne({ where: { userId, stepKey, tourId } });
  return Boolean(existing);
}

export async function attestClientJourneyStep(
  userId: string,
  stepKey: string,
  adminId: string,
  details?: AttestDetails,
): Promise<ClientJourneyStep> {
  const client = await User.findByPk(userId, { attributes: ["id"] });

  if (!client) {
    throw new ErrorHandler("Client not found", 404);
  }

  logger.info(`Admin ${adminId} attesting client journey step "${stepKey}" for client ${userId}`);

  const shouldNotify = ADMIN_ATTEST_NOTIFY_STEPS.has(stepKey);
  // SPR-21-11-007: attesting `confirmation_sent` dispatches the three
  // component messages (social follow, session details, RTR/CV info) — but
  // only the first time the step completes, the same duplicate guard the
  // notification steps use.
  const shouldDispatchConfirmations = stepKey === "confirmation_sent";
  const needsCompletionCheck = shouldNotify || shouldDispatchConfirmations;
  const wasCompleted = needsCompletionCheck ? await isJourneyStepCompleted(userId, stepKey) : false;

  const step = await completeStep(
    userId,
    stepKey,
    adminId,
    ClientJourneyActorType.ADMIN,
    ClientJourneySource.MANUAL,
  );

  if (shouldDispatchConfirmations && !wasCompleted) {
    dispatchConfirmationMessages(userId, adminId);
  }

  if (shouldNotify && !wasCompleted) {
    notifySubscriptionStepCompletedByAdmin(userId, stepKey, adminId, undefined, details);
  }

  return step;
}

/**
 * SPR-21-11-009 — the automatic side of the duplicate-notification
 * safeguard. Completes a journey step only when it is not already complete
 * (no matter who completed it), fires that step's notifications only on this
 * first transition, and returns whether it completed the step. Never throws:
 * a journey tick must not break the action that triggered it.
 */
export async function completeJourneyStepOnce(
  userId: string,
  stepKey: string,
  actorId: string,
  actorType: ClientJourneyActorType,
  source: ClientJourneySource,
  host?: string,
  details?: AttestDetails,
): Promise<boolean> {
  try {
    const wasCompleted = await isJourneyStepCompleted(userId, stepKey);
    if (wasCompleted) {
      logger.info(
        `Step "${stepKey}" already complete for ${userId} — skipping completion and notification`,
      );
      return false;
    }

    await completeStep(userId, stepKey, actorId, actorType, source);

    if (ADMIN_ATTEST_NOTIFY_STEPS.has(stepKey)) {
      notifySubscriptionStepCompletedByAdmin(userId, stepKey, actorId, host, details);
    }
    return true;
  } catch (error) {
    logger.error(
      `Automatic completion of step "${stepKey}" failed for ${userId}: ${error}`,
    );
    return false;
  }
}

/**
 * SPR-21-13-003 — the backfill half of the First Application auto-attest.
 * Completes the step WITHOUT firing any notification, for clients whose
 * first `applications` row predates the feature (a "your first application
 * has been submitted!" email months after the fact would be wrong). Same
 * first-transition guard and never-throws contract as
 * completeJourneyStepOnce; returns whether it completed the step.
 */
export async function completeJourneyStepSilently(
  userId: string,
  stepKey: string,
  actorId: string,
  actorType: ClientJourneyActorType,
  source: ClientJourneySource,
): Promise<boolean> {
  try {
    const wasCompleted = await isJourneyStepCompleted(userId, stepKey);
    if (wasCompleted) {
      return false;
    }

    await completeStep(userId, stepKey, actorId, actorType, source);
    return true;
  } catch (error) {
    logger.error(
      `Silent completion of step "${stepKey}" failed for ${userId}: ${error}`,
    );
    return false;
  }
}

// Side-effect hook for the existing document-approval flow
// (UserManagementService.approveUserDocument) — document_accepted has a
// real trigger (an admin approving the client's document), it's just not
// the generic "Attest" journey action, so it's recorded as automatic/admin
// rather than manual/admin.
export async function markDocumentAccepted(userId: string, adminId: string): Promise<void> {
  await completeStep(
    userId,
    "document_accepted",
    adminId,
    ClientJourneyActorType.ADMIN,
    ClientJourneySource.AUTOMATIC,
  );
}

// Side-effect hook for admin-triggered plan changes (updateUserPlanByFeature,
// activateCoralPlan) — records the account-level "payment_confirmed" step.
// perTour: false for this step, so it's recorded once at the account level
// regardless of which tour is currently active.
export async function markPaymentConfirmed(userId: string, actorId: string): Promise<void> {
  await completeStep(
    userId,
    "payment_confirmed",
    actorId,
    ClientJourneyActorType.ADMIN,
    ClientJourneySource.AUTOMATIC,
  );
}

// SPR-21-11-005: assigning a paid plan is the admin equivalent of the
// customer's Service Selection — recording it here keeps the step consistent
// with manual plan assignment (previously it stayed Attest-only, so the
// customer's journey never advanced past it).
export async function markServiceSelection(userId: string, actorId: string): Promise<void> {
  await completeStep(
    userId,
    "service_selection",
    actorId,
    ClientJourneyActorType.ADMIN,
    ClientJourneySource.AUTOMATIC,
  );
}

// SPR-21-11-003: the RTR document becoming customer-visible IS the "RTR
// Dispatched" event — record the step so the journey advances without an admin
// having to press Attest. Tour-scoped: requires an active tour (callers wrap
// this so a missing tour never breaks the upload/activation).
export async function markRtrDispatched(userId: string, actorId: string): Promise<void> {
  await completeStep(
    userId,
    "rtr_dispatched",
    actorId,
    ClientJourneyActorType.ADMIN,
    ClientJourneySource.AUTOMATIC,
  );
}

export async function reopenClientJourneyStep(
  userId: string,
  stepKey: string,
  adminId: string,
): Promise<void> {
  const { tourId } = await resolveTourIdForStep(userId, stepKey);

  const existing = await ClientJourneyStep.findOne({
    where: { userId, stepKey, tourId },
  });

  if (!existing) {
    throw new ErrorHandler("No completed step found to reopen", 404);
  }

  logger.info(`Admin ${adminId} reopening client journey step "${stepKey}" for client ${userId}`);

  await existing.update({ deletedBy: adminId });
  await existing.destroy();
}
