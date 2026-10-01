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
): Promise<ClientJourneyStep> {
  const client = await User.findByPk(userId, { attributes: ["id"] });

  if (!client) {
    throw new ErrorHandler("Client not found", 404);
  }

  logger.info(`Admin ${adminId} attesting client journey step "${stepKey}" for client ${userId}`);

  const shouldNotify = ADMIN_ATTEST_NOTIFY_STEPS.has(stepKey);
  const wasCompleted = shouldNotify ? await isJourneyStepCompleted(userId, stepKey) : false;

  const step = await completeStep(
    userId,
    stepKey,
    adminId,
    ClientJourneyActorType.ADMIN,
    ClientJourneySource.MANUAL,
  );

  if (shouldNotify && !wasCompleted) {
    notifySubscriptionStepCompletedByAdmin(userId, stepKey, adminId);
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
      notifySubscriptionStepCompletedByAdmin(userId, stepKey, actorId, host);
    }
    return true;
  } catch (error) {
    logger.error(
      `Automatic completion of step "${stepKey}" failed for ${userId}: ${error}`,
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
