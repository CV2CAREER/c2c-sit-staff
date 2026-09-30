import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { sendMail } from "../config/sendGrid";
import { TEAM_EMAIL } from "../config/env";
import { getFullName, getFrontendUrl } from "../utils/helpers";
import { fieldEncryption } from "../utils/field-encryption";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { SlackService } from "./slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";

const logger = getServiceLogger("client-journey-notify");

/**
 * SPR-21-11-005 / SPR-21-11-013: when an admin completes a subscription-scoped
 * journey step (Service Selection or Payment Confirmed) by hand, mirror what the
 * customer-triggered payment path sends — the customer "service activated"
 * email, the delivery-team copy, and a #town-crier Slack post.
 *
 * Fire-and-forget (setImmediate + try/catch): a notification failure must never
 * break the admin action that triggered it. The caller guards against re-sending
 * when the step was already complete, so attesting an already-done step does not
 * email twice.
 */
export const notifySubscriptionStepCompletedByAdmin = (
  userId: string,
  stepKey: string,
  actorId: string,
  host?: string,
): void => {
  setImmediate(async () => {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(
          `Step "${stepKey}" completed for unknown user ${userId} — skipping notifications`,
        );
        return;
      }

      const userEmail = await fieldEncryption.getUserEmail(userId);
      const fullName = getFullName(user);
      const planTitle = user.plan || user.selectedPlan || "Your plan";
      const frontendUrl = getFrontendUrl();
      const currentYear = new Date().getFullYear();

      if (userEmail) {
        await Promise.all([
          sendMail({
            email: userEmail,
            subject: `${planTitle} Service Activated Successfully`,
            templateName: "service-subscription-user.ejs",
            templateData: {
              name: user.firstName,
              plan: planTitle,
              frontendUrl,
              currentYear,
            },
          }),
          sendMail({
            email: TEAM_EMAIL!,
            subject: `Payment Received from ${fullName}`,
            templateName: "service-subscription-admin.ejs",
            templateData: {
              name: fullName,
              email: userEmail,
              plan: planTitle,
              link: `${frontendUrl}/admin-dashboard/users/${user.id}`,
              frontendUrl,
              currentYear,
            },
          }),
        ]);
      } else {
        logger.warn(
          `No resolvable email for user ${userId} — skipping step "${stepKey}" emails`,
        );
      }

      const slackHost = host || "localhost";
      await SlackService.notify({
        location: getEnvironmentFromHost(slackHost),
        host: slackHost,
        node: SlackNode.USER_MANAGEMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        type: SlackEventType.ADMIN_ACTION,
        channel: SlackChannel.TOWN_CRIER,
        teamMentions: "CSM",
        trigger: `${stepKey} completed by admin: ${userEmail || userId}`,
        body: `An admin completed the "${stepKey}" journey step.
User: ${fullName} (${userEmail || userId})
Completed by (admin id): ${actorId}
Plan: ${planTitle}`,
      });

      logger.info(
        `Admin step-completion notifications sent for step "${stepKey}" (user ${userId})`,
      );
    } catch (error) {
      logger.error(
        `Admin step-completion notifications failed for step "${stepKey}" (user ${userId}): ${error}`,
      );
    }
  });
};
