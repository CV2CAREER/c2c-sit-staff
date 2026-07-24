import { sendMail } from "../config/sendGrid";
import { TEAM_EMAIL, PRODUCT_OWNER_EMAIL } from "../config/env";
import { SlackService } from "./slack.service";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";

interface DeploymentSuccessEmailOptions {
  email: string;
  appName: string;
  environment: "rat" | "iat" | "sit" | "uat" | "prod";
  commitSha: string;
  commitMessage: string;
  deployedBy: string;
  duration: string; // e.g. "1m 42s"
  deploymentUrl: string;
  logsUrl: string;
  timestamp?: string; // defaults to now
}

export const sendDeploymentSuccessEmail = async (
  options: DeploymentSuccessEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `✅ ${options.appName} deployed to ${options.environment}`,
    templateName: "deployment-success.ejs",
    templateData: {
      ...options,
      timestamp: options.timestamp ?? new Date().toUTCString(),
      currentYear: new Date().getFullYear(),
    },
  });
};

interface DeploymentFailureEmailOptions {
  email: string;
  appName: string;
  environment: string;
  errorMessage: string;
}

export const sendDeploymentFailureEmail = async (
  options: DeploymentFailureEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `❌ ${options.appName} deployment failed on ${options.environment}`,
    templateName: "deployment-failure.ejs",
    templateData: {
      ...options,
      timestamp: new Date().toUTCString(),
      currentYear: new Date().getFullYear(),
    },
  });
};

interface ActivationEmailOptions {
  name: string;
  email: string;
  otp: string;
  verificationLink: string;
}

export const sendActivationEmail = async (
  options: ActivationEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Activate Your Account`,
    templateName: "activation.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface NewReferralEmailOptions {
  name: string;
  email: string;
  refName: string;
  frontendUrl: string;
}

export const sendNewReferralEmail = async (
  options: NewReferralEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `New Invitee Alert`,
    templateName: "new-referral-alert.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface AdminActivationEmailOptions {
  name: string;
  email: string;
  frontendUrl: string;
}

export const sendAdminActivationEmail = async (
  options: AdminActivationEmailOptions,
): Promise<void> => {
  await sendMail({
    email: TEAM_EMAIL,
    subject: `New User Registration: Action Required`,
    templateName: "admin-activation.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface WelcomeEmailOptions {
  name: string;
  email: string;
  frontendUrl: string;
}

export const sendWelcomeEmail = async (
  options: WelcomeEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Welcome Email`,
    templateName: "welcome-email.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};
interface AdminWelcomeEmailOptions {
  name: string;
  lastName: string;
  email: string;
  frontendUrl: string;
}

export const sendAdminWelcomeEmail = async (
  options: AdminWelcomeEmailOptions,
): Promise<void> => {
  await sendMail({
    email: TEAM_EMAIL,
    subject: `${options.name} ${options.lastName} Welcome to CVtoCAREER`,
    templateName: "admin-welcome-email.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface NewOTPEmailOptions {
  name: string;
  email: string;
  frontendUrl: string;
  otp: string;
}

export const sendNewOTPEmail = async (
  options: NewOTPEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `New OTP Token`,
    templateName: "new-otp.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface AdminNewOTPEmailOptions {
  name: string;
  lastName: string;
  email: string;
  frontendUrl: string;
}

export const sendAdminNewOTPEmail = async (
  options: AdminNewOTPEmailOptions,
): Promise<void> => {
  await sendMail({
    email: TEAM_EMAIL,
    subject: `${options.name} ${options.lastName} New OTP Token`,
    templateName: "admin-new-otp.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface PasswordResetEmailOptions {
  name: string;
  email: string;
  frontendUrl: string;
  otp: string;
}

export const sendPasswordResetEmail = async (
  options: PasswordResetEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Request for Password Change`,
    templateName: "reset-password.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface TermsConditionsEmailOptions {
  name: string;
  email: string;
  planName: string;
  validityPeriod: string;
  frontendUrl: string;
  pdfAttachment: {
    filename: string;
    content: string; // base64 encoded PDF
    type: string;
  };
}

export const sendTermsConditionsEmail = async (
  options: TermsConditionsEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Terms & Conditions - ${options.planName}`,
    templateName: "terms-conditions.ejs",
    templateData: {
      name: options.name,
      planName: options.planName,
      validityPeriod: options.validityPeriod,
      frontendUrl: options.frontendUrl,
      currentYear: new Date().getFullYear(),
    },
    attachments: [
      {
        filename: options.pdfAttachment.filename,
        content: options.pdfAttachment.content,
        type: options.pdfAttachment.type || "application/pdf",
        disposition: "attachment",
      },
    ],
  });
};

interface SendReferralEmailOptions {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  referrerName: string;
  referralLink: string;
  frontendUrl: string;
}

export const sendReferralInvitationEmail = async (
  options: SendReferralEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `${options.referrerName} invites you to join CVtoCAREER`,
    templateName: "referral-invitation.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface ReferralClaimedEmailOptions {
  email: string;
  name: string;
  claimedUserName: string;
  frontendUrl: string;
}

export const sendReferralClaimedEmail = async (
  options: ReferralClaimedEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Your referral has been claimed!`,
    templateName: "referral-claimed.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface ApplicationActionUserEmailOptions {
  name: string;
  email: string;
  frontendUrl: string;
  action: "start" | "end";
}

export const sendApplicationActionUserEmail = async (
  options: ApplicationActionUserEmailOptions,
): Promise<void> => {
  const subject =
    options.action === "start"
      ? "Your Application Has Commenced"
      : "Your Application Has Expired";
  await sendMail({
    email: options.email,
    subject,
    templateName: "application-action-user.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface CoralActiveEmailOptions {
  name: string;
  email: string;
  subEndDate: string;
  frontendUrl: string;
}

export const sendCoralActiveEmail = async (
  options: CoralActiveEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Your Coral plan is active — CVtoCAREER`,
    templateName: "coral-active.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface ApplicationActionAdminEmailOptions {
  name: string;
  email: string;
  triggeredBy: string;
  action: "start" | "end";
}

export const sendApplicationActionAdminEmail = async (
  options: ApplicationActionAdminEmailOptions,
): Promise<void> => {
  const subject =
    options.action === "start"
      ? `Application Commenced – ${options.name}`
      : `Application Expired – ${options.name}`;
  await sendMail({
    email: TEAM_EMAIL,
    subject,
    templateName: "application-action-admin.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface GrpConfirmedEmailOptions {
  name: string;
  email: string;
  referrerName: string;
  frontendUrl: string;
}

export const sendGrpConfirmedEmail = async (
  options: GrpConfirmedEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Your referral has been approved — CVtoCAREER`,
    templateName: "grp-confirmed.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface GrpDeclinedEmailOptions {
  name: string;
  email: string;
  referrerName: string;
  declinedReason: string;
  frontendUrl: string;
}

export const sendGrpDeclinedEmail = async (
  options: GrpDeclinedEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Update on your referral — CVtoCAREER`,
    templateName: "grp-declined.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface CrpPaidEmailOptions {
  name: string;
  email: string;
  payoutAmount: string;
  frontendUrl: string;
}

export const sendCrpPaidEmail = async (
  options: CrpPaidEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Your referral reward has been paid — CVtoCAREER`,
    templateName: "crp-paid.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface CrpPayoutOwedEmailOptions {
  referrerName: string;
  referrerEmail: string;
  referrerId?: string;       // customer uniqueId
  refereeName: string;
  refereeEmail: string;
  payoutAmount: string;
  adminUrl: string;
  referralId?: string;       // sequential ID e.g. "CRP-001"
  payId?: string;
  referredSubDate?: string;  // date the referred person subscribed
}

export const sendCrpPayoutOwedEmail = async (
  options: CrpPayoutOwedEmailOptions,
): Promise<void> => {
  const subject = `💰 CRP payout owed — ${options.referrerName} · $50 UNPAID`;
  const templateData = { ...options, currentYear: new Date().getFullYear() };

  await sendMail({
    email: TEAM_EMAIL,
    subject,
    templateName: "crp-payout-owed.ejs",
    templateData,
  });

  if (PRODUCT_OWNER_EMAIL && PRODUCT_OWNER_EMAIL !== TEAM_EMAIL) {
    await sendMail({
      email: PRODUCT_OWNER_EMAIL,
      subject,
      templateName: "crp-payout-owed.ejs",
        templateData,
    });
  }
};

interface InternalReferralEmailOptions {
  // Always required
  referralType: string; // "Coral" | "GRP" | "CRP" | "PRP"
  action: string;       // "Approved" | "Declined" | "Coral Plan Activated" | "Payout Paid"
  adminUrl: string;

  // Referrer / ambassador info
  referrerName: string;
  referrerEmail: string;
  referrerId?: string;       // customer uniqueId

  // Referred person
  refereeName: string;
  refereeEmail: string;

  // Coral-specific
  registeredDate?: string;
  activatedDate?: string;
  subStart?: string;
  subEnd?: string;

  // GRP / CRP — shared
  referralId?: string;       // sequential ID e.g. "GRP-001"
  adminName?: string;        // who approved / declined / marked paid

  // GRP Approved
  oldEndDate?: string;
  newEndDate?: string;
  confirmedCount?: number;

  // GRP Declined
  reasonCode?: string;
  declinedNote?: string;

  // CRP Paid
  payId?: string;
  paidDate?: string;

  extra?: string;
}

export const sendInternalReferralEmail = async (
  options: InternalReferralEmailOptions,
): Promise<void> => {
  const subjects: Record<string, string> = {
    "Coral Plan Activated": `🪸 Coral activated — ${options.referrerName}`,
    "Approved":             `🎁 GRP referral approved — ${options.referrerName} → ${options.refereeName}`,
    "Declined":             `✕ GRP referral declined — ${options.referrerName}`,
    "Payout Paid":          `✓ CRP payout marked as paid — ${options.referrerName}`,
  };
  const subject = subjects[options.action] ?? `[Internal] Referral ${options.action}: ${options.referrerName}`;

  await sendMail({
    email: TEAM_EMAIL,
    subject,
    templateName: "internal-referral.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

interface PrpInternalEmailOptions {
  partnerName: string;
  partnerEmail: string;
  refereeName: string;
  refereeEmail: string;
  adminUrl: string;
}

export const sendPrpInternalEmail = async (
  options: PrpInternalEmailOptions,
): Promise<void> => {
  await sendMail({
    email: TEAM_EMAIL,
    subject: `🤝 Channel Partner referral — thank-you sent · ${options.partnerName}`,
    templateName: "prp-internal.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};

export const sendRCFollowUpTag = async (params: {
  host: string;
  fullName: string;
  customerId: string | null | undefined;
  templateId: string;
}): Promise<void> => {
  const location = getEnvironmentFromHost(params.host);
  const timestamp = new Date().toISOString();
  const clientLine = params.customerId
    ? `${params.fullName} · ${params.customerId}`
    : params.fullName;

  await SlackService.notify({
    location,
    host: params.host,
    node: SlackNode.MESSAGING,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    trigger: `RC follow-up: ${params.templateId}`,
    type: SlackEventType.SYSTEM_NOTIFICATION,
    channel: SlackChannel.RETENTION_CTRL,
    body: `📲 RC follow-up — reach out on WhatsApp
Client: ${clientLine}
Message sent: ${params.templateId}
Sent at: ${timestamp}
Confirm: did it land, and do they know what to do next?
@retention-controller please confirm on WhatsApp.`,
  });
};

interface PrpThankyouEmailOptions {
  name: string;
  email: string;
  referrerName: string;
  frontendUrl: string;
}

export const sendPrpThankyouEmail = async (
  options: PrpThankyouEmailOptions,
): Promise<void> => {
  await sendMail({
    email: options.email,
    subject: `Thank you for your partnership — CVtoCAREER`,
    templateName: "prp-thankyou.ejs",
    templateData: {
      ...options,
      currentYear: new Date().getFullYear(),
    },
  });
};
