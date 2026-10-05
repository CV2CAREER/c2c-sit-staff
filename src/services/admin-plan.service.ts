import { randomBytes } from "crypto";
import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { User } from "../models/v1/user.model";
import { Plan } from "../models/v1/plan.model";
import { Feature } from "../models/v1/feature.model";
import { SubscriptionTier } from "../models/v1/feature.model";
import { getSequelize } from "../utils/sequelize";
import { Transaction, Op } from "sequelize";
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
import { Credentials } from "../models/v1/credentials.model";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { getFullName, getFrontendUrl } from "../utils/helpers";
import { TEAM_EMAIL } from "../config/env";
import { sendCoralActiveEmail, sendInternalReferralEmail, sendRCFollowUpTag, sendPlanChangedEmail, sendPlanChangedAdminEmail, sendPlanExtendedEmail } from "./email.service";
import { AuditLogService } from "./admin/audit-log.service";
import { fieldEncryption } from "../utils/field-encryption";
import { createCredentialsTour } from "./credentials-tour.service";
import { markPaymentConfirmed, markServiceSelection } from "./client-journey.service";
import { parseDate as parseCampaignDate, formatDate as formatCampaignDate, addDays as addCampaignDays, calculateCampaignFields } from "../utils/campaign-calculator";

const logger = getServiceLogger("admin-plan-service");

const formatShortDate = (date?: Date | string | null): string => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTermLabel = (validityPeriod?: string | null): string => {
  if (!validityPeriod) return "";
  const [rawValue, rawUnit] = validityPeriod.trim().split(/\s+/);
  const value = parseInt(rawValue, 10);
  if (!Number.isFinite(value)) return "";
  const unit = (rawUnit || "").toLowerCase().replace(/s$/, "");
  return `(${value}-${unit} term)`;
};

const formatSignUpAsLabel = (user: { signUpAs?: string | null; role?: string | null }): string => {
  const signUpAs = user.signUpAs ? user.signUpAs.replace(/_/g, " ") : "Not set";
  const role = user.role ? user.role.toUpperCase() : "";
  return role ? `${signUpAs} (${role})` : signUpAs;
};

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
  options?: {
    reason?: string;
    notifyClient?: boolean;
    adminUser?: { id: string; firstName?: string; lastName?: string; role?: string };
  },
): Promise<Plan | null> => {

  const location = getEnvironmentFromHost(host);

  logger.info(`[UpdateUserPlanByFeature] User: ${userId}, Feature: ${featureId}`);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  const userEmail = await fieldEncryption.getUserEmail(userId);
  const userFullName = getFullName(user);
  const previousPlanTitle = user.plan || "No plan";

  const previousActivePlan = await Plan.findOne({
    where: { userId, hasExpired: false },
    order: [["createdAt", "DESC"]],
  });
  const previousExpiresAt = previousActivePlan?.expiresAt ?? null;

  const feature = await Feature.findByPk(featureId);
  if (!feature) {
    throw new ErrorHandler("Feature (pricing plan) not found", 404);
  }

  const sequelize = getSequelize();

  const result = await sequelize.transaction(async (transaction: Transaction) => {
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

    // Handle campaign management (non-blocking). Tour creation runs
    // sequentially AFTER this, in the same callback, rather than as an
    // independent post-transaction call — both touch the Credentials row via
    // their own find-or-create, and running them concurrently raced (two
    // processes both finding no row and both trying to create one, tripping
    // the unique constraint on seekEmail). Awaiting one before the other
    // guarantees the row exists by the time tour creation runs.
    setImmediate(async () => {
      try {
        if (!userEmail) {
          logger.warn(`[UpdateUserPlanByFeature] Skipping campaign management for user ${userId}: no resolvable email`);
          return;
        }
        await handleCampaignManagement(
          host,
          {
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName || "",
            email: userEmail,
            uniqueId: user.uniqueId || "",
            country: user.country,
            id: user.id,
          },
          feature.title,
          userId,
          getFrontendUrl(),
          feature.validityPeriod,
        );
      } catch (error) {
        logger.error(`Campaign management failed: ${error}`);
      }

      // isNewCycle=true (no currently-active plan) always starts a new tour.
      // isNewCycle=false is normally a no-op (mid-tour plan swap), except
      // createCredentialsTour self-heals a client with an active plan but no
      // tour history yet (e.g. from before this code existed).
      try {
        await createCredentialsTour({
          userId,
          planId: newPlan.id,
          planTitle: newPlan.title,
          expireAt: newPlan.expiresAt ?? null,
          isNewCycle: !previousActivePlan,
        });
      } catch (err: any) {
        logger.error(`[UpdateUserPlanByFeature] Tour creation failed for user ${userId}: ${err.message}`);
      }

      // Idempotent (account-level, completes once ever), safe on every paid assignment.
      try {
        await markPaymentConfirmed(userId, options?.adminUser?.id ?? "system");
      } catch (err: any) {
        logger.error(`[UpdateUserPlanByFeature] Journey step "payment_confirmed" failed for user ${userId}: ${err.message}`);
      }

      // SPR-21-11-005: assigning the paid plan is the admin equivalent of the
      // customer's Service Selection — advance that step too so the journey
      // moves past it (previously it stayed Attest-only).
      try {
        await markServiceSelection(userId, options?.adminUser?.id ?? "system");
      } catch (err: any) {
        logger.error(`[UpdateUserPlanByFeature] Journey step "service_selection" failed for user ${userId}: ${err.message}`);
      }
    });

    // Send all notifications (non-blocking)
    setImmediate(async () => {
      try {
        if (!userEmail) {
          logger.warn(`[UpdateUserPlanByFeature] Skipping post-payment notifications for user ${userId}: no resolvable email`);
          return;
        }
        const fullName = userFullName;
        const frontendUrl = getFrontendUrl();

        // Send emails
        await Promise.all([
          // User payment notification
          sendMail({
            email: userEmail,
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
              email: userEmail,
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

    // SPR-21-11-005: notify the team (#town-crier) when an admin confirms a
    // plan/payment on the customer's behalf.
    setImmediate(async () => {
      try {
        await SlackService.notify({
          location,
          host,
          node: SlackNode.PAYMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Plan assigned by admin: ${userEmail || userId}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: `Payment confirmed / plan assigned by an admin.
User: ${userFullName} (${userEmail || userId})
Plan: ${feature.title}
Next steps: CSM team follow up the customer and assign PC.`,
        });
      } catch (error: any) {
        logger.error(`Failed to send admin plan-assignment Slack notification: ${error.message}`);
      }
    });

    // Legacy block (left disabled): paid-sub channel variant.
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

  const newPlanTitle = result ? result.title : "No plan (Free)";
  const adminUser = options?.adminUser;
  const actorName = adminUser
    ? `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim() || "Admin"
    : "System";

  // The "Plan Changed" Slack/email trio below is for an existing subscriber
  // switching plans. A user with no prior plan gets the separate
  // service-subscription-user.ejs / service-subscription-admin.ejs
  // "new subscription" emails instead (sent unconditionally further down,
  // inside the transaction's paid-tier branch) — sending both would
  // duplicate the notification for a first-time purchase.
  const isNewSubscription = !previousActivePlan;

  // Tour creation and "payment_confirmed" now run inside the campaign
  // management setImmediate above (sequenced after handleCampaignManagement
  // so they don't race it for the Credentials row — see comment there).

  if (adminUser) {
    AuditLogService.log({
      userId: adminUser.id,
      userFullName: actorName,
      userRole: adminUser.role || "admin",
      method: "PATCH",
      url: `/v1/admin/users/${userId}/plan`,
      description: `Plan changed for ${userFullName} (${userEmail}): "${previousPlanTitle}" → "${newPlanTitle}"${options?.reason ? ` | reason: ${options.reason}` : ""}`,
      dataEntry: {
        action: isNewSubscription ? "PLAN_ASSIGNED" : "PLAN_CHANGED",
        actor: actorName,
        target_user_id: (user as any).uniqueId ?? userId,
        target_email: userEmail,
        previous_plan: previousPlanTitle,
        new_plan: newPlanTitle,
        reason: options?.reason || null,
        notify_client: options?.notifyClient === true,
      },
    });
  }

  const subEndFrom = formatShortDate(previousExpiresAt);
  const subEndTo = formatShortDate(result?.expiresAt ?? null);
  const termLabel = result ? formatTermLabel(feature.validityPeriod) : "";
  const timestamp = new Date().toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const customerId = (user as any).uniqueId ?? userId;
  const signupAsLabel = formatSignUpAsLabel(user);
  const clientToldLabel = options?.notifyClient ? "Yes" : "No";

  if (!isNewSubscription) {
    setImmediate(async () => {
      try {
        const subEndLine = termLabel
          ? `Sub end date: ${subEndFrom} → ${subEndTo} - ${termLabel}`
          : `Sub end date: ${subEndFrom} → ${subEndTo}`;

        await SlackService.notify({
          location,
          host,
          node: SlackNode.PAYMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: "Plan Changed",
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.PAID_SUB,
          teamMentions: "CSM",
          body: [
            `🔄 Plan changed — ${userFullName}`,
            `Customer: ${customerId}`,
            `Changed by: ${actorName}`,
            `Plan: ${previousPlanTitle} → ${newPlanTitle}`,
            subEndLine,
            options?.reason ? `Why: "${options.reason}"` : undefined,
            `Client notify: ${clientToldLabel}`,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } catch (err: any) {
        logger.error(`[UpdateUserPlanByFeature] Slack notification failed: ${err.message}`);
      }
    });
  }

  if (!isNewSubscription && TEAM_EMAIL) {
    setImmediate(async () => {
      try {
        await sendPlanChangedAdminEmail({
          email: TEAM_EMAIL,
          customerId,
          signupAs: signupAsLabel,
          planFrom: previousPlanTitle,
          planTo: newPlanTitle,
          subEndFrom,
          subEndTo,
          why: options?.reason || "Not provided",
          adminName: actorName,
          timestamp,
          clientTold: clientToldLabel,
        });
        logger.info(`[UpdateUserPlanByFeature] Admin plan-change email sent to team`);
      } catch (err: any) {
        logger.error(`[UpdateUserPlanByFeature] Admin plan-change email failed: ${err.message}`);
      }
    });
  }

  if (!isNewSubscription && options?.notifyClient && userEmail) {
    setImmediate(async () => {
      try {
        await sendPlanChangedEmail({
          name: user.firstName,
          email: userEmail,
          previousPlan: previousPlanTitle,
          planTo: newPlanTitle,
          subEndDate: subEndTo,
          frontendUrl: getFrontendUrl(),
        });
        logger.info(`[UpdateUserPlanByFeature] Plan-changed notification sent to ${userEmail}`);
      } catch (err: any) {
        logger.error(`[UpdateUserPlanByFeature] Plan-changed notification failed: ${err.message}`);
      }
    });
  }

  return result;
};

/**
 * Activate a free 14-day Coral plan for an ambassador.
 * Does NOT change role or isAmbassador flag — ambassador stays as guest.
 */
export const activateCoralPlan = async (
  host: string,
  userId: string,
  adminUser?: { id: string; firstName?: string; lastName?: string; role?: string },
): Promise<Plan> => {
  const location = getEnvironmentFromHost(host);
  logger.info(`[ActivateCoralPlan] User: ${userId}`);

  const user = await User.findByPk(userId);
  if (!user) throw new ErrorHandler("User not found", 404);
  if (!user.isAmbassador) throw new ErrorHandler("User is not an ambassador", 400);

  const userEmail = await fieldEncryption.getUserEmail(userId);
  const userFullName = `${user.firstName} ${user.lastName || ""}`.trim();

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
        validityPeriod: "14 days",
        paymentStatus: "completed",
        paymentAmount: 0,
      },
      { transaction },
    );

    await plan.reload({ transaction });

    const token = user.ambassadorToken && user.ambassadorToken.length === 16
      ? user.ambassadorToken
      : randomBytes(8).toString("hex");

    await user.update(
      {
        planId: plan.id,
        selectedPlan: plan.title,
        plan: plan.title,
        isUserSubscribed: true,
        hasActiveSubscription: true,
        ambassadorToken: token,
      },
      { transaction },
    );

    return plan;
  });

  // Tour creation and "payment_confirmed" now run inside the campaign
  // management setImmediate below (sequenced after handleCampaignManagement
  // so they don't race it for the Credentials row).

  const frontendUrl = getFrontendUrl();
  const subEndDate = newPlan.expiresAt
    ? new Date(newPlan.expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : "14 days from today";

  setImmediate(async () => {
    try {
      if (!userEmail) {
        logger.warn(`[ActivateCoralPlan] Skipping coral active email for user ${userId}: no resolvable email`);
        return;
      }
      await sendCoralActiveEmail({
        email: userEmail,
        name: user.firstName,
        subEndDate,
        frontendUrl,
      });
      logger.info(`[ActivateCoralPlan] Coral active email sent to ${userEmail}`);
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Email failed: ${err.message}`);
    }
  });

  // JIR-070: SG-INT-CORAL-ACTIVE — internal email to team + RC follow-up
  setImmediate(async () => {
    try {
      if (!userEmail) {
        logger.warn(`[ActivateCoralPlan] Skipping internal referral email for user ${userId}: no resolvable email`);
        return;
      }
      await sendInternalReferralEmail({
        referrerName: userFullName,
        referrerEmail: userEmail,
        referrerId: (user as any).uniqueId ?? undefined,
        refereeName: "",
        refereeEmail: "",
        referralType: "Coral",
        action: "Coral Plan Activated",
        registeredDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : undefined,
        activatedDate: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
        subStart: newPlan.createdAt ? new Date(newPlan.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : undefined,
        subEnd: subEndDate,
        adminUrl: `${frontendUrl}/admin-dashboard/users/${userId}`,
      });
      await sendRCFollowUpTag({
        host,
        fullName: userFullName,
        customerId: (user as any).uniqueId ?? null,
        templateId: "SG-CORAL-ACTIVE",
      });
      logger.info(`[ActivateCoralPlan] Internal coral active email + RC follow-up sent`);
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Internal email failed: ${err.message}`);
    }
  });

  // Tour creation runs sequentially AFTER campaign management, in the same
  // callback — both touch the Credentials row via their own find-or-create,
  // and running them as independent concurrent calls raced (two processes
  // both finding no row and both trying to create one, tripping the unique
  // constraint on seekEmail). Awaiting one before the other guarantees the
  // row exists by the time tour creation runs.
  setImmediate(async () => {
    try {
      if (!userEmail) {
        logger.warn(`[ActivateCoralPlan] Skipping campaign management for user ${userId}: no resolvable email`);
        return;
      }
      await handleCampaignManagement(
        host,
        {
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName || "",
          email: userEmail,
          uniqueId: user.uniqueId || "",
          country: user.country,
          id: user.id,
        },
        coralFeature.title,
        userId,
        frontendUrl,
        coralFeature.validityPeriod,
      );
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Campaign management failed: ${err.message}`);
    }

    try {
      await createCredentialsTour({
        userId,
        planId: newPlan.id,
        planTitle: newPlan.title,
        expireAt: newPlan.expiresAt ?? null,
        // activateCoralPlan already throws earlier if the user has an
        // active plan, so this is always a fresh cycle.
        isNewCycle: true,
      });
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Tour creation failed for user ${userId}: ${err.message}`);
    }

    try {
      await markPaymentConfirmed(userId, adminUser?.id ?? "system");
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Journey step "payment_confirmed" failed for user ${userId}: ${err.message}`);
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
        body: `Ambassador *${userFullName}* (${userEmail}) has been granted a *14-day Coral plan* by admin.\nPlan ID: ${newPlan.id} | Expires: ${subEndDate}`,
      });
    } catch (err: any) {
      logger.error(`[ActivateCoralPlan] Slack notification failed: ${err.message}`);
    }
  });

  if (adminUser) {
    AuditLogService.log({
      userId: adminUser.id,
      userFullName: `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim() || "Admin",
      userRole: adminUser.role || "admin",
      method: "POST",
      url: `/v1/admin/users/${userId}/activate-coral`,
      description: `Coral plan activated for ambassador ${userEmail}`,
      dataEntry: {
        action: "CORAL_ACTIVATED",
        actor: `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim() || "Admin",
        signup_as: "Ambassador",
        ambassador_id: (user as any).uniqueId ?? userId,
        ambassador_email: userEmail,
        registered: user.createdAt,
        activated: new Date().toISOString(),
        sub_start: newPlan.createdAt ?? new Date().toISOString(),
        sub_end: newPlan.expiresAt ?? null,
        duration_days: 14,
        campaign_mgt_row: "created",
      },
    });
  }

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
        ambassadorToken: null,
      },
      { transaction },
    );
  });

  setImmediate(async () => {
    try {
      const campaignRow = await Credentials.findOne({
        where: { clientId: userId },
        paranoid: false,
      });
      if (campaignRow) {
        await campaignRow.update({
          Active: false,
          capitalized: "HOLD",
          SeekAnswerPriority: false,
          SeekAggregator: false,
          // Auto-unassign DPC/VPC/SPC on plan deactivation so no staff keeps
          // responsibility for a client whose subscription has ended.
          AssignedPCName: null,
          AssignedPCEmail: null,
          AssignedVetName: null,
          AssignedVetEmail: null,
          AssignedCompletedName: null,
          AssignedCompletedEmail: null,
          seekExternalCredentials: {
            ...(campaignRow.seekExternalCredentials as object),
            Active: false,
            Plan: null,
            CampaignEnd: null,
            SeekSubEndDate: null,
            SeekSubDurDays: 0,
          },
        });
        logger.info(`[DeactivateCoralPlan] Campaign Mgt row marked inactive for ${userId}`);
      }
    } catch (err: any) {
      logger.error(`[DeactivateCoralPlan] Campaign Mgt update failed: ${err.message}`);
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

const daysLeftFromExpiry = (expiresAt?: Date | null): number | null => {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Get a summary of a user's current active plan — used to populate the
 * "Change Plan" / "Add Days" modal header (uniqueId, plan title, days left).
 */
export const getUserPlanSummary = async (userId: string) => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "uniqueId", "firstName", "lastName", "plan"],
  });
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  const activePlan = await Plan.findOne({
    where: { userId, hasExpired: false },
    order: [["createdAt", "DESC"]],
  });

  // "Add Days" extends the grace period, not the subscription term itself
  // (see extendUserPlan) — so the effective end date staff should see here
  // is CampaignEnd (SeekSubEndDate + GraceDuration), live-computed the same
  // way campaign.service.ts's enrichCampaignFields does it, not the raw
  // stored SeekSubEndDate (which stays fixed at the actual paid term).
  // Falls back to Plan.expiresAt only when there's no Credentials row yet.
  // A Gold-plan client has a second, secondary-profile Credentials row
  // created after the primary one — order by createdAt so we always land on
  // the primary.
  const credentials = await Credentials.findOne({
    where: { clientId: userId },
    order: [["createdAt", "ASC"]],
  });
  const credentialsData = (credentials?.seekExternalCredentials as Record<string, any>) || {};

  let effectiveEndDate: Date | null = null;
  if (credentials) {
    const computed = calculateCampaignFields({
      SeekSubStartDate: credentials.SeekSubStartDate,
      createdAt: credentials.createdAt,
      SeekSubDurDays: credentialsData.SeekSubDurDays,
      GraceDuration: credentialsData.GraceDuration,
    });
    effectiveEndDate = parseCampaignDate(computed.CampaignEnd);
  }
  if (!effectiveEndDate) {
    effectiveEndDate = activePlan?.expiresAt ? new Date(activePlan.expiresAt) : null;
  }

  return {
    userId: user.id,
    uniqueId: user.uniqueId ?? null,
    currentPlan: activePlan?.title ?? user.plan ?? null,
    expiresAt: effectiveEndDate,
    daysLeft: daysLeftFromExpiry(effectiveEndDate),
  };
};

/**
 * Extend a user's active plan by a number of days.
 *
 * - Finds the user's current non-expired Plan record.
 * - Extends `expiresAt` by `days` from its current value (or from now if unset).
 * - Logs an audit entry and optionally emails the client an FYI notice.
 */
export const extendUserPlan = async (
  host: string,
  userId: string,
  days: number,
  options?: {
    reason?: string;
    notifyClient?: boolean;
    adminUser?: { id: string; firstName?: string; lastName?: string; role?: string };
    // Lets a future system-triggered caller (e.g. referral confirmation)
    // attribute the extension correctly instead of defaulting to "ADMIN — ...".
    triggeredBy?: string;
    referralsConfirmedToDate?: number;
  },
): Promise<Plan> => {
  logger.info(`[ExtendUserPlan] User: ${userId}, Days: ${days}`);

  const location = getEnvironmentFromHost(host);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  const activePlan = await Plan.findOne({
    where: { userId, hasExpired: false },
    order: [["createdAt", "DESC"]],
  });
  if (!activePlan) {
    throw new ErrorHandler("User has no active plan to extend", 400);
  }

  const userEmail = await fieldEncryption.getUserEmail(userId);
  const userFullName = getFullName(user);

  // "Add Days" extends the GRACE PERIOD, not the underlying subscription.
  // SeekSubDurDays and SeekSubEndDate represent what the client actually
  // paid for and must stay fixed. CampaignEnd (= SeekSubEndDate +
  // GraceDuration) is what actually determines the cutoff (SeekSubToExpireDays/
  // SeekSubExpired both key off it — see campaign-calculator.ts) and is
  // recomputed live on every read, so bumping GraceDuration alone is enough
  // to move it; nothing else needs to be (re)persisted.
  //
  // This also sidesteps a race with handleCampaignManagement's Credentials
  // write (fired async off plan activation/change) — that write overwrites
  // SeekSubDurDays/SeekSubEndDate/CampaignEnd wholesale but never touches
  // GraceDuration, so an extension landing before that write settles no
  // longer gets silently clobbered.
  //
  // A Gold-plan client has a second, secondary-profile Credentials row
  // created after the primary one — order by createdAt so we always land on
  // the primary (the one the dashboard actually displays).
  const credentials = await Credentials.findOne({
    where: { clientId: userId },
    order: [["createdAt", "ASC"]],
  });
  const credentialsData = (credentials?.seekExternalCredentials as Record<string, any>) || {};

  let storedSubEndDate: Date | null = null;
  let newSubEndDate: Date;

  if (credentials) {
    const currentGraceDays = Number(credentialsData.GraceDuration || 0);
    const newGraceDays = currentGraceDays + days;

    const before = calculateCampaignFields({
      SeekSubStartDate: credentials.SeekSubStartDate,
      createdAt: credentials.createdAt,
      SeekSubDurDays: credentialsData.SeekSubDurDays,
      GraceDuration: credentialsData.GraceDuration,
    });
    const after = calculateCampaignFields({
      SeekSubStartDate: credentials.SeekSubStartDate,
      createdAt: credentials.createdAt,
      SeekSubDurDays: credentialsData.SeekSubDurDays,
      GraceDuration: newGraceDays,
    });

    storedSubEndDate = parseCampaignDate(before.CampaignEnd);
    newSubEndDate =
      parseCampaignDate(after.CampaignEnd) ??
      addCampaignDays(storedSubEndDate ?? new Date(), days);

    await credentials.update({
      seekExternalCredentials: {
        ...credentialsData,
        GraceDuration: newGraceDays,
      },
    });
  } else {
    logger.warn(`[ExtendUserPlan] No Credentials row found for user ${userId} — GraceDuration not updated`);
    const base = activePlan.expiresAt ? new Date(activePlan.expiresAt) : new Date();
    newSubEndDate = addCampaignDays(base, days);
  }

  // Keep Plan.expiresAt in sync too so the Users page "Expires" display
  // doesn't drift out of step with the real subscription end date.
  const planBase = activePlan.expiresAt ? new Date(activePlan.expiresAt) : new Date();
  const newExpiresAt = new Date(planBase);
  newExpiresAt.setDate(newExpiresAt.getDate() + days);
  await activePlan.update({ expiresAt: newExpiresAt });

  const adminUser = options?.adminUser;
  const actorName = adminUser
    ? `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim() || "Admin"
    : "System";

  const formattedNewSubEndDate = newSubEndDate.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (adminUser) {
    AuditLogService.log({
      userId: adminUser.id,
      userFullName: actorName,
      userRole: adminUser.role || "admin",
      method: "PATCH",
      url: `/v1/admin/users/${userId}/plan/extend`,
      description: `Plan extended by ${days} day(s) for ${userFullName} (${userEmail})${options?.reason ? ` | reason: ${options.reason}` : ""}`,
      dataEntry: {
        action: "PLAN_EXTENDED",
        actor: actorName,
        target_user_id: (user as any).uniqueId ?? userId,
        target_email: userEmail,
        plan_title: activePlan.title,
        days_added: days,
        old_campaign_end: storedSubEndDate,
        new_campaign_end: newSubEndDate,
        plan_expires_at: newExpiresAt,
        reason: options?.reason || null,
        notify_client: options?.notifyClient === true,
      },
    });
  }

  if (options?.notifyClient && userEmail) {
    setImmediate(async () => {
      try {
        await sendPlanExtendedEmail({
          name: user.firstName,
          email: userEmail,
          planTitle: activePlan.title,
          daysAdded: days,
          newExpiresAt: formattedNewSubEndDate,
          frontendUrl: getFrontendUrl(),
        });
        logger.info(`[ExtendUserPlan] Plan-extended notification sent to ${userEmail}`);
      } catch (err: any) {
        logger.error(`[ExtendUserPlan] Plan-extended notification failed: ${err.message}`);
      }
    });
  }

  const triggeredByLabel = options?.triggeredBy || `ADMIN — ${actorName}`;
  const customerId = (user as any).uniqueId ?? userId;
  const signupAsLabel = formatSignUpAsLabel(user);
  const subEndFrom = formatShortDate(storedSubEndDate);
  const subEndTo = formatShortDate(newSubEndDate);

  setImmediate(async () => {
    try {
      await SlackService.notify({
        location,
        host,
        node: SlackNode.PAYMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        trigger: "Plan Days Added",
        type: SlackEventType.ADMIN_ACTION,
        channel: SlackChannel.PAID_SUB,
        teamMentions: "CSM",
        body: [
          `⏱ +${days} days added`,
          `Customer: ${customerId}  ·  Sign Up As: ${signupAsLabel}`,
          `Plan: ${activePlan.title} — unchanged`,
          options?.reason ? `Why: ${options.reason}` : undefined,
          `Triggered by: ${triggeredByLabel}`,
          `Sub end date: ${subEndFrom} → ${subEndTo}`,
          options?.referralsConfirmedToDate !== undefined
            ? `Referrals confirmed to date: ${options.referralsConfirmedToDate}`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch (err: any) {
      logger.error(`[ExtendUserPlan] Slack notification failed: ${err.message}`);
    }
  });

  logger.info(
    `[ExtendUserPlan] Plan ${activePlan.id} extended by ${days} day(s) — ` +
      `new sub end date: ${formatCampaignDate(newSubEndDate)}, plan expiresAt: ${newExpiresAt.toISOString()}`,
  );

  return activePlan;
};
