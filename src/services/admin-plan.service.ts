import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { User } from "../models/v1/user.model";
import { Plan } from "../models/v1/plan.model";
import { Feature } from "../models/v1/feature.model";
import { SubscriptionTier } from "../models/v1/feature.model";
import { getSequelize } from "../utils/sequelize";
import { Transaction } from "sequelize";
import { PaymentStatus, RevenueStatus, Progress, Role } from "../utils/enum";
import { SlackService } from "../services/slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import { sendMail } from "../config/sendGrid";
import { handleCampaignManagement } from "./admin-campaign.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { getFullName, getFrontendUrl } from "../utils/helpers";
import { TEAM_EMAIL } from "../config/env";

const logger = getServiceLogger("admin-plan-service");

/**
 * Update a user's plan based on a featureId.
 *
 * - If the feature's tier is "Free", any existing plan is expired,
 *   and the user's plan-related fields are cleared (user has no plan).
 * - If the feature's tier is paid (Emerald, Coral, Copper, Bronze, Silver, Gold, Platinum),
 *   existing active plans are expired, a new Plan record is created,
 *   the user's plan fields are updated, and progress is advanced to PAYMENT_CONFIRMED.
 *
 * @param userId     The target user ID
 * @param featureId  The feature (pricing plan) ID to assign
 * @returns The newly created Plan record, or null if the tier is Free
 */
export const updateUserPlanByFeature = async (
  host: string,
  userId: string,
  featureId: string,
): Promise<Plan | null> => {

  const location = getEnvironmentFromHost(host);

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

    // 3. Update user with new plan info and advance progress
    await newPlan.reload({ transaction });

    // Determine the next progress step:
    // From PLAN_SELECTED → PAYMENT_CONFIRMED, or if behind, skip ahead
    let newProgress: string;
    const currentProgress = user.progress;

    const progressOrder = Object.values(Progress);
    const paymentConfirmedIdx = progressOrder.indexOf(Progress.PAYMENT_CONFIRMED);
    const currentIdx = progressOrder.indexOf(currentProgress as Progress);
    const loginCredentialsIdx = progressOrder.indexOf(Progress.LOGIN_CREDENTIALS_VERIFIED);

    if (currentIdx < paymentConfirmedIdx) {
      newProgress = Progress.PAYMENT_CONFIRMED;
    } else if (currentIdx >= paymentConfirmedIdx && currentIdx < loginCredentialsIdx) {
      // Already at PAYMENT_CONFIRMED or between — move to LOGIN_CREDENTIALS_VERIFIED
      newProgress = Progress.LOGIN_CREDENTIALS_VERIFIED;
    } else {
      // Already beyond — don't regress
      newProgress = currentProgress;
    }

    await user.update(
      {
        planId: newPlan.id,
        selectedPlan: newPlan.title,
        plan: newPlan.title,
        isUserSubscribed: true,
        hasActiveSubscription: true,
        paymentStatus: PaymentStatus.PAID,
        totalAmountPaid: feature.price ? parseFloat(String(feature.price)) : 0,
        progress: newProgress as Progress,
        role: Role.CLIENT,
      },
      { transaction },
    );

    // Handle campaign management (non-blocking)
    setImmediate(async () => {
      try {
        await handleCampaignManagement(
          host,
          {
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName || "",
            email: user.email,
            uniqueId: user.uniqueId || "",
            country: user.country,
            id: user.id,
          },
          feature.title,
          userId,
          getFrontendUrl()
        );
      } catch (error) {
        logger.error(`Campaign management failed: ${error}`);
      }
    });

    // Send all notifications (non-blocking)
    setImmediate(async () => {
      try {
        const fullName = getFullName(user);
        const frontendUrl = getFrontendUrl();

        // Send emails
        await Promise.all([
          // User payment notification
          sendMail({
            email: user.email,
            subject: `${feature.title} Service Activated Successfully`,
            templateName: "service-subscription-user.ejs",
            templateData: {
              name: user.firstName,
              plan: feature.title,
              frontendUrl,
              currentYear: new Date().getFullYear(),
            },
          }),
          // Admin payment notification
          sendMail({
            email: TEAM_EMAIL!,
            subject: `Payment Received from ${fullName}`,
            templateName: "service-subscription-admin.ejs",
            templateData: {
              name: fullName,
              email: user.email,
              plan: feature.title,
              link: `${frontendUrl}/admin-dashboard/users/${user.id}`,
              frontendUrl,
              currentYear: new Date().getFullYear(),
            },
          }),
        ]);

        logger.info(`Post-payment notifications sent for payment}`);
      } catch (error) {
        logger.error(`Post-payment notifications failed: ${error}`);
      }
    });

    // Send Slack notification to paid-sub channel for payment confirmation
//     setImmediate(async () => {
//       try {
//         await SlackService.notify({
//           location,
//           host,
//           node: SlackNode.PAYMENT,
//           provider: SlackProvider.SYSTEM,
//           severity: SlackSeverity.INFO,
//           trigger: `PayPal Payment Captured by ADMIN `,
//           type: SlackEventType.ADMIN_ACTION,
//           channel: SlackChannel.PAID_SUB,
//           teamMentions: "CSM",
//           body: `Payment confirmed successfully by Admin.
// Next steps: CSM Team follow up the customer and assign PC to the customer.`,
//         });
//         logger.info(`✅ Slack notification sent for PayPal capture`);
//       } catch (error: any) {
//         logger.error(`❌ Failed to send Slack notification: ${error.message}`);
//       }
//     });

    logger.info(
      `[UpdateUserPlanByFeature] Plan "${newPlan.title}" (${newPlan.id}) assigned to user ${userId}. ` +
      `Progress: ${currentProgress} → ${newProgress}, Payment: PAID`,
    );

    return newPlan;
  });
};

/**
 * Confirm / advance a user's progress to a specific stage.
 * Optionally marks payment as confirmed and sets revenue status.
 *
 * Flow (typical):
 *   PLAN_SELECTED → PAYMENT_CONFIRMED → LOGIN_CREDENTIALS_VERIFIED
 *   → SAMPLE_RESULTS_DISPATCHED → SAMPLE_RESULTS_ACCEPTED → PREFERENCES_UPDATED
 *   → PREPARATORY_SESSION_ACCEPTED → APPLICATION_COMMENCED
 *
 * @param userId        The target user ID
 * @param progress      The Progress milestone to set
 * @param confirmPayment  If true, also update paymentStatus, totalAmountPaid, revenue
 * @param amount        Optional payment amount (used when confirmPayment is true)
 */
export const confirmUserProgress = async (
  userId: string,
  progress: Progress,
  confirmPayment: boolean = false,
  amount?: number,
): Promise<User> => {
  logger.info(`[ConfirmUserProgress] User: ${userId}, Progress: ${progress}, confirmPayment: ${confirmPayment}`);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  const progressValues = Object.values(Progress);
  const targetIdx = progressValues.indexOf(progress);
  if (targetIdx === -1) {
    throw new ErrorHandler(`Invalid progress value: ${progress}`, 400);
  }

  const currentIdx = progressValues.indexOf(user.progress as Progress);

  // Don't regress progress
  if (currentIdx >= targetIdx) {
    logger.info(`[ConfirmUserProgress] User ${userId} already at ${user.progress} — skipping regression`);
  }

  const updateFields: Record<string, any> = {
    progress,
  };

  if (confirmPayment) {
    updateFields.paymentStatus = PaymentStatus.PAID;
    updateFields.revenue = RevenueStatus.CAPITALIZED;
    if (amount !== undefined) {
      updateFields.totalAmountPaid = amount;
    }
    updateFields.isUserSubscribed = true;
    updateFields.hasActiveSubscription = true;

    // If role is still guest, promote to client
    if (user.role === Role.GUEST) {
      updateFields.role = Role.CLIENT;
    }
  }

  await user.update(updateFields);

  logger.info(
    `[ConfirmUserProgress] User ${userId} progress updated to "${progress}"` +
    (confirmPayment ? `, payment confirmed, revenue capitalized` : ``),
  );

  return user;
};
