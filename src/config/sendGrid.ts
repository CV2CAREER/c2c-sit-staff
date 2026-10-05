import sgMail, { MailDataRequired } from "@sendgrid/mail";
import path from "path";
import ejs from "ejs";
import { getServiceLogger } from "../utils/createLogger";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";
import { EmailTemplateTrigger } from "../models/v1/email-template-trigger.model";
import { EmailLog, EmailLogStatus } from "../models/v1/email-log.model";
import { User } from "../models/v1/user.model";
import { SlackService } from "../services/slack.service";
import { fieldEncryption } from "../utils/field-encryption";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import {
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  SENDGRID_FROM_NAME,
  CLIENT_APP_DOMAIN,
  CUSTOMER_EMAIL_BCC,
} from "./env";
import { getEnvironmentFromHost } from "@/utils/slack-helpers";

const logger = getServiceLogger("sendgrid");

// Resolved client-app domain (env var or NODE_ENV convention): local dev
// resolves to localhost (correctly tags LOCALHOST), hosted environments tag
// their real domain — never a hardcoded localhost label in production.
const slackHost = CLIENT_APP_DOMAIN;
const environment = getEnvironmentFromHost(slackHost);

// The original .ejs files are still on disk under views/emails (never
// deleted when templates moved to the DB) — used as the fallback for the
// exact same template if the DB lookup/render fails for any reason.
const mailDirectory = path.resolve(__dirname, "../views/emails");

const notifySendFailure = async (
  options: Pick<EmailOptions, "email" | "subject" | "templateName">,
  reason: string,
) => {
  await SlackService.notify({
    location: environment,
    host: slackHost,
    node: SlackNode.MESSAGING,
    provider: SlackProvider.SENDGRID,
    severity: SlackSeverity.ERROR,
    type: SlackEventType.ERROR_ALERT,
    channel: SlackChannel.TOWN_CRIER,
    trigger: "sendMail",
    body: [
      `Email failed to send`,
      `To: ${options.email}`,
      `Subject: ${options.subject}`,
      `Template: ${options.templateName}`,
      `Reason: ${reason}`,
    ].join("\n"),
  });
};

const notifyFallbackUsed = async (
  options: Pick<EmailOptions, "email" | "subject" | "templateName">,
  reason: string,
) => {
  await SlackService.notify({
    location: environment,
    host: slackHost,
    node: SlackNode.MESSAGING,
    provider: SlackProvider.SENDGRID,
    severity: SlackSeverity.ERROR,
    type: SlackEventType.SYSTEM_NOTIFICATION,
    channel: SlackChannel.TOWN_CRIER,
    trigger: "sendMail",
    body: [
      `⚠️ Fallback email template used`,
      `To: ${options.email}`,
      `Subject: ${options.subject}`,
      `Template: ${options.templateName}`,
      `DB reason: ${reason}`,
      `The on-disk copy in views/emails was sent instead — please check/restore this template's row in the admin panel.`,
    ].join("\n"),
  });
};

const resolveUserId = async (
  options: Pick<EmailOptions, "email" | "userId">,
): Promise<string | undefined> => {
  if (options.userId) return options.userId;
  return (await fieldEncryption.findUserByEmail(options.email)) ?? undefined;
};

// Writes one `email_logs` row per send attempt so every sendMail() call site
// is captured automatically — backs the client-facing "notifications" list.
// Never throws: a logging failure must not mask the original send outcome.
const logEmail = async (
  options: Pick<EmailOptions, "email" | "subject" | "templateName" | "userId">,
  status: EmailLogStatus,
  errorMessage?: string,
): Promise<void> => {
  try {
    const userId = await resolveUserId(options);
    await EmailLog.create({
      userId,
      email: options.email,
      subject: options.subject,
      templateName: options.templateName,
      status,
      errorMessage: errorMessage?.slice(0, 512),
    });
  } catch (logErr: any) {
    logger.error(`Failed to record email log for ${options.email}: ${logErr.message}`);
  }
};

let isInitialized = false;

export const initializeSendGrid = () => {
  if (isInitialized) return;

  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is missing from environment variables");
  }

  sgMail.setApiKey(SENDGRID_API_KEY);
  isInitialized = true;
  logger.info("✅ SendGrid client initialized");
};

// ---

interface EmailOptions {
  email: string;
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  /** Skips the recipient lookup below when the caller already has the user's id. */
  userId?: string;
  attachments?: {
    filename: string;
    path?: string;
    content?: string; // base64
    type?: string;
    disposition?: "attachment" | "inline";
    contentId?: string;
  }[];
}

export const sendMail = async (options: EmailOptions): Promise<void> => {
  initializeSendGrid();

  // A trigger can be rebound to a different template, or explicitly
  // disabled (templateId null — admin chose "send nothing" for this
  // trigger). Absence of a row means "use the default" — today's only
  // behavior — so an unbound trigger is completely unaffected.
  const binding = await EmailTemplateTrigger.findOne({
    where: { triggerKey: options.templateName },
  });

  if (binding && binding.templateId === null) {
    logger.info(
      `Skipped sending "${options.templateName}" to ${options.email} — trigger disabled by an admin (set to send nothing).`,
    );
    return;
  }

  let html: string;
  let usedFallback = false;
  let template: EmailTemplate | null = null;
  try {
    template = binding?.templateId
      ? await EmailTemplate.findByPk(binding.templateId)
      : await EmailTemplate.findOne({ where: { key: options.templateName } });
    if (!template) {
      throw new Error(
        `Email template "${options.templateName}" not found in database`,
      );
    }
    html = ejs.render(template.body, options.templateData);
  } catch (error: any) {
    const reason = error.message || "Unknown template error";
    logger.error(
      `Failed to load/render DB template ${options.templateName} for ${options.email}: ${reason} — falling back to on-disk copy`,
    );

    try {
      html = await ejs.renderFile(
        path.join(mailDirectory, options.templateName),
        options.templateData,
      );
      usedFallback = true;
      await notifyFallbackUsed(options, reason);
    } catch (fallbackError: any) {
      const fallbackReason = fallbackError.message || "Unknown fallback error";
      logger.error(
        `On-disk fallback also failed for ${options.templateName}: ${fallbackReason}`,
      );
      await notifySendFailure(options, `DB error: ${reason}; fallback error: ${fallbackReason}`);
      await logEmail(options, EmailLogStatus.FAILED, `DB error: ${reason}; fallback error: ${fallbackReason}`);
      throw new Error(`Email failed: ${fallbackReason}`);
    }
  }

  const allAttachments = [...(options.attachments || [])];

  // Customer-facing emails (as opposed to internal/admin notifications, e.g.
  // those addressed to TEAM_EMAIL) are blind-copied to CUSTOMER_EMAIL_BCC.
  // Falls back to CUSTOMER when the template's type can't be determined
  // (matches the DB column's own default), so an edge-case lookup failure
  // still gets the blind copy rather than silently skipping it.
  const templateType = template?.type ?? EmailTemplateType.CUSTOMER;
  const bcc =
    templateType === EmailTemplateType.CUSTOMER && CUSTOMER_EMAIL_BCC
      ? CUSTOMER_EMAIL_BCC
      : undefined;

  const msg: MailDataRequired = {
    to: options.email,
    ...(bcc ? { bcc } : {}),
    from: {
      email: SENDGRID_FROM_EMAIL,
      name: SENDGRID_FROM_NAME,
    },
    subject: options.subject,
    html,
    attachments: allAttachments.map((a) => ({
      filename: a.filename,
      content: a.content || "",
      type: a.type || "application/octet-stream",
      disposition: a.disposition || "attachment",
      contentId: a.contentId,
    })),
  };

  try {
    await sgMail.send(msg);
    logger.info(
      `✅ Email sent to ${options.email} — subject: "${options.subject}"${usedFallback ? " (fallback template used)" : ""}`,
    );
    await logEmail(options, EmailLogStatus.SENT);
  } catch (error: any) {
    const sgError =
      error?.response?.body?.errors?.[0]?.message || error.message;
    logger.error(`Failed to send email to ${options.email}: ${sgError}`);
    await notifySendFailure(options, sgError);
    await logEmail(options, EmailLogStatus.FAILED, sgError);
    throw new Error(`Email failed: ${sgError}`);
  }
};

interface RawTestEmailOptions {
  email: string;
  subject: string;
  html: string;
}

/**
 * Sends pre-rendered HTML as-is — no DB template lookup, no on-disk
 * fallback, no BCC, and (deliberately) no EmailLog write. Used only for
 * admin "test send," which already resolved/rendered its own HTML from a
 * specific template and must not be conflated with real send analytics —
 * see EmailTestSendLog in CommunicationTemplateService.sendTestEmail.
 */
export const sendRawTestEmail = async (options: RawTestEmailOptions): Promise<void> => {
  initializeSendGrid();

  const msg: MailDataRequired = {
    to: options.email,
    from: {
      email: SENDGRID_FROM_EMAIL,
      name: SENDGRID_FROM_NAME,
    },
    subject: options.subject,
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    logger.info(`✅ Test email sent to ${options.email} — subject: "${options.subject}"`);
  } catch (error: any) {
    const sgError = error?.response?.body?.errors?.[0]?.message || error.message;
    logger.error(`Failed to send test email to ${options.email}: ${sgError}`);
    throw new Error(`Test email failed: ${sgError}`);
  }
};

// helper to convert local file to base64 for SendGrid attachments
const fileToBase64 = async (filePath: string): Promise<string> => {
  const fs = await import("fs/promises");
  const buffer = await fs.readFile(filePath);
  return buffer.toString("base64");
};
