import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { sendMail } from "../config/sendGrid";
import { getFullName, getFrontendUrl } from "../utils/helpers";
import { fieldEncryption } from "../utils/field-encryption";
import {
  JourneyMessageLog,
  JourneyMessageLogStatus,
} from "../models/v1/journey-message-log.model";

const logger = getServiceLogger("journey-confirmation-messages");

/**
 * SPR-21-11-007 — the three component messages behind the "Confirmation
 * Messages Sent" step (Notification Audit, step 9): social follow
 * instructions, session details, and RTR/CV info. Staff used to send these by
 * hand outside the platform — no audit trail, inconsistent from client to
 * client. Attesting the step now dispatches all three from here.
 *
 * Audit trail: every dispatch writes one `journey_message_logs` row (message
 * type, recipient, timestamp, status) — the DoD's "log table ... (message
 * type, recipient, timestamp)". sendMail() additionally writes its usual
 * `email_logs` row per send.
 *
 * Fire-and-forget: each message is attempted independently, so one failure
 * never blocks the other two and the attest action itself never breaks.
 */
interface ConfirmationMessage {
  key: string;
  subject: string;
  templateName: string;
}

const CONFIRMATION_MESSAGES: ConfirmationMessage[] = [
  {
    key: "social_follow",
    subject: "Follow CVtoCAREER — Stay in the Loop",
    templateName: "confirmation-social-follow-client.ejs",
  },
  {
    key: "session_details",
    subject: "Your Session Details and What to Expect",
    templateName: "confirmation-session-details-client.ejs",
  },
  {
    key: "rtr_cv_info",
    subject: "Your Role Titles and CV — What Happens Next",
    templateName: "confirmation-rtr-cv-client.ejs",
  },
];

export const dispatchConfirmationMessages = (userId: string, triggeredBy: string): void => {
  setImmediate(async () => {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(`Confirmation messages for unknown user ${userId} — skipped`);
        return;
      }

      const clientEmail = await fieldEncryption.getUserEmail(userId);
      if (!clientEmail) {
        logger.warn(`No resolvable email for user ${userId} — confirmation messages skipped`);
        return;
      }

      const frontendUrl = getFrontendUrl();
      const currentYear = new Date().getFullYear();

      let sent = 0;
      let failed = 0;

      for (const message of CONFIRMATION_MESSAGES) {
        let status = JourneyMessageLogStatus.SENT;
        let errorMessage: string | undefined;

        try {
          await sendMail({
            email: clientEmail,
            subject: message.subject,
            templateName: message.templateName,
            templateData: {
              name: user.firstName,
              frontendUrl,
              currentYear,
            },
          });
          sent += 1;
        } catch (error) {
          failed += 1;
          status = JourneyMessageLogStatus.FAILED;
          errorMessage = String(error).slice(0, 512);
          logger.error(
            `Confirmation message "${message.key}" failed for user ${userId}: ${error}`,
          );
        }

        try {
          await JourneyMessageLog.create({
            userId,
            stepKey: "confirmation_sent",
            messageType: message.key,
            recipientEmail: clientEmail,
            status,
            errorMessage,
            triggeredByAdminId: triggeredBy,
          });
        } catch (logError) {
          logger.error(
            `Failed to record audit log for "${message.key}" / user ${userId}: ${logError}`,
          );
        }
      }

      logger.info(
        `Confirmation messages dispatched for user ${userId} (${getFullName(user)}) — ` +
          `sent=${sent} failed=${failed} step=confirmation_sent triggeredBy=${triggeredBy} ` +
          `templates=${CONFIRMATION_MESSAGES.map((m) => m.templateName).join(", ")}`,
      );
    } catch (error) {
      logger.error(`Confirmation message dispatch failed for user ${userId}: ${error}`);
    }
  });
};
