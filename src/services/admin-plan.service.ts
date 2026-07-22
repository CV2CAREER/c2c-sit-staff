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
import { sendCoralActiveEmail, sendInternalReferralEmail } from "./email.service";

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
 * Activate a free 30-day Coral plan for an ambassador.
 * Does NOT change role or isAmbassador flag — ambassador stays as guest.
 */
export const activateCoralPlan = async (
  host: string,
  userId: string,
): Promise<Plan> => {
  const location = getEnvironmentFromHost(host);
  logger.info(`[ActivateCoralPlan] User: ${userId}`);

  const user = await User.findByPk(userId);
  if (!user) throw new ErrorHandler("User not found", 404);
  if (!user.isAmbassador) throw new ErrorHandler("User is not an ambassador", 400);

  const activePlan = await Plan.findOne({ where: { userId, hasExpired: false } });
  if (activePlan) throw new ErrorHandler("Ambassador already has an active plan", 400);

  const coralFeature = await Feature.findOne({ where: { tier: SubscriptionTier.CORAL } });
  if (!coralFeature) throw new ErrorHandler("Coral feature not found", 500);

  const sequelize = getSequelize();

  const newPlan = await sequelize.transaction(async (transaction: Transaction) => {
    const plan = await Plan.create(
      {
        userId,
        title: coralFeature.title,
        featureId: coralFeature.id,
        validityPeriod: "30 days",
        paymentStatus: "completed",
        paymentAmount: 0,
      },
      { transaction },
    );

    await plan.reload({ transaction });

    await user.update(
      {
        planId: plan.id,
        selectedPlan: plan.title,
        plan: plan.title,
        isUserSubscribed: true,
        hasActiveSubscription: true,
      },
      { transaction },
    );

    return plan;
  });

  const frontendUrl = getFrontendUrl();
  const subEndDate = newPlan.expiresAt
    ? new Date(newPlan.expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : "30 days from today";

  setImmediate(async () => {
    try {
      await sendCoralActiveEmail({
        email: user.email,
        name: user.firstName,
        subEndDate,
        frontendUrl,
      });
      logger.info(`[ActivateCoralPlan] Coral active email sent to ${user.email}`);
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Email failed: ${err.message}`);
    }
  });

  // JIR-070: SG-INT-CORAL-ACTIVE — internal email to team
  setImmediate(async () => {
    try {
      await sendInternalReferralEmail({
        referrerName: `${user.firstName} ${user.lastName || ""}`.trim(),
        referrerEmail: user.email,
        refereeName: "",
        refereeEmail: "",
        referralType: "Coral",
        action: "Coral Plan Activated",
        extra: `Plan expires: ${subEndDate}`,
        adminUrl: `${frontendUrl}/admin-dashboard/users/${userId}`,
      });
      logger.info(`[ActivateCoralPlan] Internal coral active email sent to team`);
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Internal email failed: ${err.message}`);
    }
  });

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
        coralFeature.title,
        userId,
        frontendUrl,
      );
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Campaign management failed: ${err.message}`);
    }
  });

  setImmediate(async () => {
    try {
      await SlackService.notify({
        location,
        host,
        node: SlackNode.USER_MANAGEMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        trigger: "Ambassador Coral Plan Activated",
        type: SlackEventType.ADMIN_ACTION,
        channel: SlackChannel.TOWN_CRIER,
        body: `Ambassador *${user.firstName} ${user.lastName}* (${user.email}) has been granted a *30-day Coral plan* by admin.\nPlan ID: ${newPlan.id} | Expires: ${subEndDate}`,
      });
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Slack notification failed: ${err.message}`);
    }
  });

  logger.info(`[ActivateCoralPlan] Coral plan ${newPlan.id} activated for ambassador ${userId}`);
  return newPlan;
};

/**
 * Deactivate an ambassador's active Coral plan.
 * Marks the plan as expired and resets subscription fields on the user.
 */
export const deactivateCoralPlan = async (
  host: string,
  userId: string,
): Promise<void> => {
  const location = getEnvironmentFromHost(host);
  logger.info(`[DeactivateCoralPlan] User: ${userId}`);

  const user = await User.findByPk(userId);
  if (!user) throw new ErrorHandler("User not found", 404);
  if (!user.isAmbassador) throw new ErrorHandler("User is not an ambassador", 400);

  const activePlan = await Plan.findOne({
    where: { userId, hasExpired: false, title: "Coral" },
  });
  if (!activePlan) throw new ErrorHandler("No active Coral plan found for this user", 400);

  const sequelize = getSequelize();

  await sequelize.transaction(async (transaction: Transaction) => {
    await activePlan.update({ hasExpired: true }, { transaction });
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
  });

  setImmediate(async () => {
    try {
      await SlackService.notify({
        location,
        host,
        node: SlackNode.USER_MANAGEMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        trigger: "Ambassador Coral Plan Deactivated",
        type: SlackEventType.ADMIN_ACTION,
        channel: SlackChannel.TOWN_CRIER,
        body: `Ambassador *${user.firstName} ${user.lastName}* (${user.email})'s Coral plan has been *deactivated* by admin. Plan ID: ${activePlan.id}`,
      });
    } catch (err: any) {
      logger.error(`[DeactivateCoralPlan] Slack notification failed: ${err.message}`);
    }
  });

  logger.info(`[DeactivateCoralPlan] Coral plan deactivated for ambassador ${userId}`);
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
