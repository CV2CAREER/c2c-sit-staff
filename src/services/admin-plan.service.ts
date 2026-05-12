import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { User } from "../models/v1/user.model";
import { Plan } from "../models/v1/plan.model";
import { Feature } from "../models/v1/feature.model";
import { SubscriptionTier } from "../models/v1/feature.model";
import { getSequelize } from "../utils/sequelize";
import { Transaction } from "sequelize";

const logger = getServiceLogger("admin-plan-service");

/**
 * Update a user's plan based on a featureId.
 *
 * - If the feature's tier is "Free", any existing plan is expired,
 *   and the user's plan-related fields are cleared (user has no plan).
 * - If the feature's tier is paid (Emerald, Coral, Copper, Bronze, Silver, Gold, Platinum),
 *   existing active plans are expired, a new Plan record is created,
 *   and the user's plan fields are updated.
 *
 * @param userId     The target user ID
 * @param featureId  The feature (pricing plan) ID to assign
 * @returns The newly created Plan record, or null if the tier is Free
 */
export const updateUserPlanByFeature = async (
  userId: string,
  featureId: string,
): Promise<Plan | null> => {
  logger.info(`[UpdateUserPlanByFeature] User: ${userId}, Feature: ${featureId}`);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  const feature = await Feature.findByPk(featureId);
  if (!feature) {
    throw new ErrorHandler("Feature (pricing plan) not found", 404);
  }

  const sequelize = getSequelize();

  // Use a transaction for atomicity
  return sequelize.transaction(async (transaction: Transaction) => {
    // 1. Expire any existing active plan for this user
    await Plan.update(
      { hasExpired: true },
      {
        where: { userId, hasExpired: false },
        transaction,
      },
    );

    if (feature.tier === SubscriptionTier.FREE) {
      // FREE tier — user should have no plan
      logger.info(
        `[UpdateUserPlanByFeature] Feature "${feature.title}" is FREE. Removing plan for user ${userId}`,
      );

      await user.update(
        {
          planId: null,
          selectedPlan: null,
          plan: null,
          isUserSubscribed: false,
          hasActiveSubscription: false,
        },
        { transaction },
      );

      return null;
    }

    // 2. Paid tier — create a new Plan record
    logger.info(
      `[UpdateUserPlanByFeature] Creating new "${feature.title}" plan for user ${userId}`,
    );

    const newPlan = await Plan.create(
      {
        userId,
        title: feature.title,
        featureId: feature.id,
        validityPeriod: feature.validityPeriod,
        paymentStatus: "completed",
        paymentAmount: feature.price,
      },
      { transaction },
    );

    // 3. Update user with new plan info (fresh reload to get expiresAt)
    await newPlan.reload({ transaction });

    await user.update(
      {
        planId: newPlan.id,
        selectedPlan: newPlan.title,
        plan: newPlan.title,
        isUserSubscribed: true,
        hasActiveSubscription: true,
      },
      { transaction },
    );

    logger.info(
      `[UpdateUserPlanByFeature] Plan "${newPlan.title}" (${newPlan.id}) assigned to user ${userId}`,
    );

    return newPlan;
  });
};