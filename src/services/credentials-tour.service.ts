import { Op, Transaction } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { getSequelize } from "../utils/sequelize";
import { User } from "../models/v1/user.model";
import { Credentials } from "../models/v1/credentials.model";
import { CredentialsTour } from "../models/v1/credentials-tour.model";
import { TourCount } from "../models/v1/tour-count.model";

const logger = getServiceLogger("credentials-tour-service");

export interface CreateCredentialsTourParams {
  userId: string;
  planId?: string | null;
  planTitle: string;
  expireAt?: Date | null;
  // True when the caller has no currently-active plan for this user (a
  // genuine new subscription or a resubscription after the previous one
  // lapsed) — the normal trigger for starting a new tour.
  isNewCycle: boolean;
}

/**
 * Start a new tour (payment cycle) for a client — or catch them up if they
 * somehow have none yet.
 *
 * - Finds (or minimally creates) the client's Credentials row — the row may
 *   not exist yet for a first-time payer since the full Credentials record is
 *   normally built out asynchronously by handleCampaignManagement. A minimal
 *   row here is safe: handleCampaignManagement finds it via the same
 *   clientId/seekEmail lookup and enriches it (alias, aggregator, plan data)
 *   on its own "existing row" branch instead of creating a duplicate.
 * - Only actually creates a tour when `isNewCycle` is true OR the client has
 *   no tour history at all yet. The second condition is a self-heal: a
 *   client can end up with an active plan but zero tours (e.g. tour creation
 *   failing before this code existed, or before a bug in it was fixed) —
 *   without it, `isNewCycle` would stay false on every future plan swap
 *   forever (they always "already have an active plan"), permanently
 *   stranding them at tour 0. Swapping plans while genuinely mid-tour
 *   (isNewCycle=false, tour history already exists) is a no-op — return null.
 * - Atomically bumps TourCount and stamps the new CredentialsTour with that
 *   sequence number (1 for a client's first tour, 2 for their next, ...).
 * - Deactivates any previously active tour and repoints Credentials.tourId
 *   to the new one, so the client journey ("active tour") follows along.
 */
export const createCredentialsTour = async (
  params: CreateCredentialsTourParams,
): Promise<CredentialsTour | null> => {
  const { userId, planId, planTitle, expireAt, isNewCycle } = params;

  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  const sequelize = getSequelize();

  return sequelize.transaction(async (transaction: Transaction) => {
    let credentials = await Credentials.findOne({
      where: {
        [Op.or]: [{ clientId: userId }, { seekEmail: user.email }],
      },
      paranoid: false,
      order: [["createdAt", "ASC"]],
      transaction,
    });

    if (!credentials) {
      credentials = await Credentials.create(
        {
          clientId: userId,
          seekEmail: user.email,
          seekPassword: "",
        },
        { transaction },
      );
      logger.info(
        `[CreateCredentialsTour] Created minimal Credentials row ${credentials.id} for user ${userId}`,
      );
    }

    const [tourCount] = await TourCount.findOrCreate({
      where: { credentialsId: credentials.id },
      defaults: { credentialsId: credentials.id, count: 0 },
      transaction,
    });

    if (!isNewCycle && tourCount.count > 0) {
      logger.info(
        `[CreateCredentialsTour] Skipped for user ${userId} — mid-tour plan swap (already on tour ${tourCount.count})`,
      );
      return null;
    }

    const nextTourNumber = tourCount.count + 1;
    await tourCount.update({ count: nextTourNumber }, { transaction });

    const tour = await CredentialsTour.create(
      {
        credentialsId: credentials.id,
        clientId: userId,
        planId: planId ?? null,
        planTitle,
        tourNumber: nextTourNumber,
        startDate: new Date(),
        expireAt: expireAt ?? null,
        isActive: true,
      },
      { transaction },
    );

    await CredentialsTour.update(
      { isActive: false },
      {
        where: { credentialsId: credentials.id, id: { [Op.ne]: tour.id } },
        transaction,
      },
    );

    await credentials.update({ tourId: tour.id }, { transaction });

    logger.info(
      `[CreateCredentialsTour] Tour #${nextTourNumber} (${tour.id}) created for user ${userId} — plan "${planTitle}"`,
    );

    return tour;
  });
};
