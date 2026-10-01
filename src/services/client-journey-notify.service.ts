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
 * SPR-21-11-012: the same seam also notifies for the two Final Checks quality
 * gates the audit found silent — Profile Alignment Check (customer email) and
 * Campaign Readiness Confirmed (two customer emails: readiness + launch-ready) —
 * each with a #town-crier Slack post. Per-step content lives in STEP_MAILS /
 * STEP_SLACK_HEADLINES below; steps without a mail config still post to Slack.
 *
 * Fire-and-forget (setImmediate + try/catch): a notification failure must never
 * break the admin action that triggered it. The caller guards against re-sending
 * when the step was already complete, so attesting an already-done step does not
 * email twice.
 */
type StepMailContext = {
  userId: string;
  userEmail: string;
  firstName: string | null | undefined;
  fullName: string;
  planTitle: string;
  frontendUrl: string;
  currentYear: number;
  /** 006/010 — what the admin entered on the attest form. */
  details?: AttestDetails;
};

/**
 * SPR-21-11-006 / SPR-21-11-010 — optional details an admin supplies when
 * attesting the welcome-call / preference-review steps: the appointment's
 * date & time, an outcome note, and (for the single preference-review step)
 * which moment is being recorded — the session being scheduled or completed.
 */
export type AttestDetails = {
  scheduledAt?: Date;
  note?: string;
  mode?: "scheduled" | "completed";
};

type StepMail = {
  email: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
  /** 010 — the preference-review scheduling mail carries an .ics invite. */
  attachments?: {
    filename: string;
    content: string; // base64
    type?: string;
    disposition?: "attachment" | "inline";
  }[];
};

/** Human date for the 006/010 emails and the Slack body. */
const formatDateTime = (d?: Date): string =>
  d
    ? d.toLocaleString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "to be confirmed";

/**
 * 010 DoD — attach a 1-hour VEVENT for the preference review session to the
 * scheduling email so the customer can drop it straight into their calendar.
 */
const buildPreferenceReviewIcs = (scheduledAt: Date) => {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CVtoCAREER//Preference Review Session//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:preference-review-${scheduledAt.getTime()}@cvtocareer.com`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(scheduledAt)}`,
    `DTEND:${fmt(end)}`,
    "SUMMARY:Preference Review Session - CVtoCAREER",
    "DESCRIPTION:Your CVtoCAREER team will walk you through your job preferences\\, realities and expectations.",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return {
    filename: "preference-review-session.ics",
    content: Buffer.from(lines.join("\r\n"), "utf-8").toString("base64"),
    type: "text/calendar",
    disposition: "attachment" as const,
  };
};

/** 005/013 — mirrors the customer-triggered payment path exactly. */
const subscriptionStepMails = (ctx: StepMailContext): StepMail[] => [
  {
    email: ctx.userEmail,
    subject: `${ctx.planTitle} Service Activated Successfully`,
    templateName: "service-subscription-user.ejs",
    templateData: {
      name: ctx.firstName,
      plan: ctx.planTitle,
      frontendUrl: ctx.frontendUrl,
      currentYear: ctx.currentYear,
    },
  },
  {
    email: TEAM_EMAIL!,
    subject: `Payment Received from ${ctx.fullName}`,
    templateName: "service-subscription-admin.ejs",
    templateData: {
      name: ctx.fullName,
      email: ctx.userEmail,
      plan: ctx.planTitle,
      link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
      frontendUrl: ctx.frontendUrl,
      currentYear: ctx.currentYear,
    },
  },
];

/**
 * SPR-21-11-012 — what each attested step mails. Customer emails are collected
 * first, admin copies second; the caller sends them in one Promise.all and
 * skips everything when no customer email could be resolved (005/013 behaviour
 * kept byte-for-byte).
 */
const STEP_MAILS: Record<string, (ctx: StepMailContext) => StepMail[]> = {
  service_selection: subscriptionStepMails,
  payment_confirmed: subscriptionStepMails,
  profile_alignment_check: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Profile Has Been Aligned and Checked",
      templateName: "profile-alignment-confirmed-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  campaign_readiness_confirmed: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Campaign Readiness Is Confirmed",
      templateName: "campaign-readiness-confirmed-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
    {
      email: ctx.userEmail,
      subject: "You're Ready \u2014 Your Campaign Launches Shortly",
      templateName: "campaign-launch-ready-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-11-009 — CV Toolkit steps 12-14. The same content is sent by the
  // customer backend's own notify module when the upload path completes 13/14
  // automatically; these entries cover the manual-attest half of the
  // duplicate-notification safeguard.
  cv_variant_dispatch: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your CV Variant Is Ready to Review",
      templateName: "cv-variant-dispatched-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  cv_approved: (ctx) => [
    {
      email: TEAM_EMAIL!,
      subject: `CV Approved by ${ctx.fullName}`,
      templateName: "cv-approved-admin.ejs",
      templateData: {
        clientName: ctx.fullName,
        clientEmail: ctx.userEmail,
        link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  cv_variant_uploaded: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Final CV Is Locked In",
      templateName: "cv-variant-uploaded-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-11-006 — Welcome Call, steps 7 and 8.
  welcome_call_scheduled: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Welcome Call Is Scheduled",
      templateName: "welcome-call-scheduled-client.ejs",
      templateData: {
        name: ctx.firstName,
        dateTime: formatDateTime(ctx.details?.scheduledAt),
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  welcome_call_completed: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Welcome Call Is Complete — Next Steps",
      templateName: "welcome-call-completed-client.ejs",
      templateData: {
        name: ctx.firstName,
        dateTime: ctx.details?.scheduledAt
          ? formatDateTime(ctx.details.scheduledAt)
          : undefined,
        note: ctx.details?.note,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-11-010 — Preference Review Session, step 17. One journey step
  // covers both moments the DoD asks for, so the admin picks which one the
  // attest is recording: scheduled → invite email with the .ics attached,
  // completed → outcome/next-steps email.
  preference_review_session: (ctx) => {
    if (ctx.details?.mode === "completed") {
      return [
        {
          email: ctx.userEmail,
          subject: "Preference Review Session Complete — Outcomes and Next Steps",
          templateName: "preference-review-completed-client.ejs",
          templateData: {
            name: ctx.firstName,
            dateTime: ctx.details?.scheduledAt
              ? formatDateTime(ctx.details.scheduledAt)
              : undefined,
            note: ctx.details?.note,
            frontendUrl: ctx.frontendUrl,
            currentYear: ctx.currentYear,
          },
        },
      ];
    }
    const scheduledAt = ctx.details?.scheduledAt;
    return [
      {
        email: ctx.userEmail,
        subject: "Your Preference Review Session Is Scheduled",
        templateName: "preference-review-scheduled-client.ejs",
        templateData: {
          name: ctx.firstName,
          dateTime: formatDateTime(scheduledAt),
          frontendUrl: ctx.frontendUrl,
          currentYear: ctx.currentYear,
        },
        attachments: scheduledAt ? [buildPreferenceReviewIcs(scheduledAt)] : [],
      },
    ];
  },
};

/** First Slack line for 012's gates; other steps keep the generic body only. */
const STEP_SLACK_HEADLINES: Record<string, string> = {
  profile_alignment_check:
    "Profile Alignment Check passed \u2014 the client's profile has been aligned and verified.",
  campaign_readiness_confirmed:
    "Campaign Readiness Confirmed \u2014 final quality gate passed; the campaign is ready to launch.",
  cv_variant_dispatch:
    "CV Variant dispatched \u2014 ready for the client to review.",
  cv_approved:
    "CV approved by the client \u2014 feedback returned, delivery can pick up the final CV.",
  cv_variant_uploaded:
    "Final CV variant uploaded — locked in for applications.",
  welcome_call_scheduled: "Welcome call scheduled — date and time emailed to the client.",
  welcome_call_completed: "Welcome call completed — follow-up with next steps emailed to the client.",
};

export const notifySubscriptionStepCompletedByAdmin = (
  userId: string,
  stepKey: string,
  actorId: string,
  host?: string,
  details?: AttestDetails,
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

      const buildMails = STEP_MAILS[stepKey];
      if (!buildMails) {
        logger.warn(
          `No mail config for step "${stepKey}" — posting to Slack only`,
        );
      }

      // Emails and Slack must both fire for the same step completion (012's
      // DoD), so a mail failure is logged and Slack still posts instead of
      // being skipped by the outer catch.
      if (userEmail && buildMails) {
        try {
          const stepMails = buildMails({
            userId,
            userEmail,
            firstName: user.firstName,
            fullName,
            planTitle,
            frontendUrl,
            currentYear,
            details,
          });
          if (stepMails.length > 0) {
            await Promise.all(stepMails.map((mail) => sendMail(mail)));
          }
        } catch (mailError) {
          logger.error(
            `Emails for step "${stepKey}" failed (user ${userId}): ${mailError} — continuing to Slack`,
          );
        }
      } else if (!userEmail) {
        logger.warn(
          `No resolvable email for user ${userId} — skipping step "${stepKey}" emails`,
        );
      }

      const slackHost = host || "localhost";
      // 010's single step has two moments — pick the headline that matches
      // what the admin recorded on the attest form.
      const headline =
        stepKey === "preference_review_session"
          ? details?.mode === "completed"
            ? "Preference Review Session completed — outcome summary and next steps emailed to the client."
            : "Preference Review Session scheduled — date, time and calendar invite emailed to the client."
          : STEP_SLACK_HEADLINES[stepKey];
      const whenLine = details?.scheduledAt
        ? `\nScheduled for: ${formatDateTime(details.scheduledAt)}`
        : "";
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
        body: `${headline ? `${headline}\n` : ""}An admin completed the "${stepKey}" journey step.
User: ${fullName} (${userEmail || userId})
Completed by (admin id): ${actorId}
Plan: ${planTitle}${whenLine}`,
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
