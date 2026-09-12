import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { ClientJourneyActorType, ClientJourneySource, ClientJourneyStepStatus } from "../utils/enum";
import { CLIENT_JOURNEY_STEP_BY_KEY } from "../utils/clientJourneySteps";
import { ClientJourneyStep } from "../models/v1/client-journey-step.model";
import { User } from "../models/v1/user.model";
import { Credentials } from "../models/v1/credentials.model";
import { CredentialsTour } from "../models/v1/credentials-tour.model";

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

  return completeStep(
    userId,
    stepKey,
    adminId,
    ClientJourneyActorType.ADMIN,
    ClientJourneySource.MANUAL,
  );
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
