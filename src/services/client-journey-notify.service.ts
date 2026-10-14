import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { Partner } from "../models/v1/partner.model";
import { Feature } from "../models/v1/feature.model";
import { Credentials } from "../models/v1/credentials.model";
import {
  calculateCampaignFields,
  daysUntil,
  parseDate as parseCampaignDate,
} from "../utils/campaign-calculator";
import { sendMail } from "../config/sendGrid";
import { CLIENT_APP_DOMAIN, TEAM_EMAIL } from "../config/env";
import { getFullName, getFrontendUrl } from "../utils/helpers";
import { fieldEncryption } from "../utils/field-encryption";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { SlackService } from "./slack.service";
// 007 — cycle with client-journey.service (it imports this module): both
// sides only touch each other inside function bodies, which is safe under
// CommonJS, same convention as the admin-plan ↔ client-journey cycle.
import { getClientJourney } from "./client-journey.service";
import { CLIENT_JOURNEY_STEPS, STEP_LABELS } from "../utils/clientJourneySteps";
import { buildReferralLink } from "../utils/referral-link.util";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";

const logger = getServiceLogger("client-journey-notify");

/** SPR-21-13-009 — the T-14 / T-7 / day-0 expiration trio. */
const EXPIRATION_NOTICE_STEPS = new Set<string>([
  "expiration_notice_14day",
  "expiration_notice_7day",
  "expiration_notice_0day",
]);

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
/** SPR-21-13-009 — the expiration-trio email context (recomputed end date). */
export type ExpiryInfo = { expiresOn: string; daysRemaining: number };

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
  /**
   * SPR-21-13-007 — the campaign-ended email leads with a summary of every
   * step the client has completed (label + completion date, registry order).
   * Prefetched by notifySubscriptionStepCompletedByAdmin for that step only.
   */
  journeySummary?: { label: string; completedAt: Date }[];
  /**
   * SPR-21-13-008 — the client's personal referral link for the referral
   * eligibility email, prefetched by notifySubscriptionStepCompletedByAdmin
   * (partner code when one exists, the email-based fallback otherwise).
   */
  referralLink?: string;
  /**
   * SPR-21-13-008 — the active plan tiers the renewal email renders as the
   * "pricing options" (same `features` rows the pricing page reads),
   * prefetched by notifySubscriptionStepCompletedByAdmin for that step only.
   */
  pricingTiers?: { title: string; price: number; validityPeriod: string }[];
  /**
   * SPR-21-13-009 — the client's recomputed campaign end date and how many
   * days remain, for the subscription expiration trio. Prefetched by
   * notifySubscriptionStepCompletedByAdmin for those steps only.
   */
  expiryInfo?: ExpiryInfo;
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
  /** SPR-21-13-004 — direct download URL for the IPP dispatch email. */
  downloadUrl?: string;
  /** SPR-21-13-006 — structured attest outcome ("Approved", "Eligible"…). */
  outcome?: string;
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

/** SPR-21-13-006 — approved/declined label for the decision mail and Slack line. */
const decisionLabel = (outcome?: string): string => {
  const v = (outcome || "").trim().toLowerCase();
  if (v === "approved") return "Approved";
  if (v === "declined") return "Declined";
  return "A decision has been recorded";
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

/** ICS text values escape comma/semicolon/backslash per RFC 5545. */
const icsEscape = (text: string) => text.replace(/([,;\\])/g, "\\$1");

type IcsEventOptions = {
  /** Unique-ish event id prefix, e.g. "welcome-call". */
  uidPrefix: string;
  summary: string;
  description: string;
  start: Date;
  filename: string;
};

/**
 * 006/010 DoD — attach a 1-hour VEVENT to the appointment's scheduling email
 * so the customer can drop it straight into their calendar (audit step 7 and
 * step 17 both ask for a calendar invite).
 */
const buildIcsEvent = ({ uidPrefix, summary, description, start, filename }: IcsEventOptions) => {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//CVtoCAREER//${uidPrefix}//EN`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uidPrefix}-${start.getTime()}@cvtocareer.com`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return {
    filename,
    content: Buffer.from(lines.join("\r\n"), "utf-8").toString("base64"),
    type: "text/calendar",
    disposition: "attachment" as const,
  };
};

const welcomeCallIcs = (start: Date) =>
  buildIcsEvent({
    uidPrefix: "welcome-call",
    summary: "Welcome Call - CVtoCAREER",
    description: "Your CVtoCAREER team will introduce the platform and answer your questions.",
    start,
    filename: "welcome-call.ics",
  });

const preferenceReviewIcs = (start: Date) =>
  buildIcsEvent({
    uidPrefix: "preference-review",
    summary: "Preference Review Session - CVtoCAREER",
    description:
      "Your CVtoCAREER team will walk you through your job preferences, realities and expectations.",
    start,
    filename: "preference-review-session.ics",
  });

/** 005/013 — mirrors the customer-triggered payment path exactly. */
const subscriptionStepMails = (ctx: StepMailContext): StepMail[] => [
  {
    email: ctx.userEmail,
    subject: `${ctx.planTitle} Service Activated Successfully`,
    templateName: "service-subscription-user.ejs",
    templateData: {
      name: ctx.firstName,
      plan: ctx.planTitle,
      frontendUrl: CLIENT_APP_DOMAIN,
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
 * Service selection is NOT payment: the client picked a plan (journey step 4),
 * activation still waits on payment_confirmed (step 5). Previously both steps
 * shared `subscriptionStepMails`, so attesting either one mailed the identical
 * "Service Activated Successfully" / "Payment Received" pair. The selection
 * step now sends its own copy that makes no activation or payment claim.
 */
const serviceSelectionStepMails = (ctx: StepMailContext): StepMail[] => [
  {
    email: ctx.userEmail,
    subject: `${ctx.planTitle} Service Selection Confirmed`,
    templateName: "service-selection-confirmed-client.ejs",
    templateData: {
      name: ctx.firstName,
      plan: ctx.planTitle,
      frontendUrl: CLIENT_APP_DOMAIN,
      currentYear: ctx.currentYear,
    },
  },
  {
    email: TEAM_EMAIL!,
    subject: `Service Selection Recorded - ${ctx.fullName}`,
    templateName: "service-selection-confirmed-admin.ejs",
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
 * SPR-21-13-001 — Week 4 / Week 12 check-in pair (audit steps 25-26). One
 * builder for both weeks, parameterised by week label: the client mail carries
 * the session-booking link for their progress review call / screenshare, the
 * delivery team gets the admin copy. Fired by the check-in cron at campaign
 * day 28 / day 84 and by a manual attest of the same step.
 */
const checkinStepMails = (weekLabel: string) => (ctx: StepMailContext): StepMail[] => [
  {
    email: ctx.userEmail,
    subject: `Your ${weekLabel} Check-In Is Here`,
    templateName: "checkin-client.ejs",
    templateData: {
      name: ctx.firstName,
      weekLabel,
      bookingUrl: `${CLIENT_APP_DOMAIN}/dashboard/sessions/booking`,
      frontendUrl: CLIENT_APP_DOMAIN,
      currentYear: ctx.currentYear,
    },
  },
  {
    email: TEAM_EMAIL!,
    subject: `${weekLabel} Check-In Due - ${ctx.fullName}`,
    templateName: "checkin-admin.ejs",
    templateData: {
      clientName: ctx.fullName,
      clientEmail: ctx.userEmail,
      plan: ctx.planTitle,
      weekLabel,
      link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
      frontendUrl: ctx.frontendUrl,
      currentYear: ctx.currentYear,
    },
  },
];

/**
 * SPR-21-13-009 — Subscription expiration notices (audit steps 30/31/35).
 * One builder for all three milestones, parameterised by the milestone's
 * days-remaining (the fallback when the prefetch below could not resolve the
 * exact end date, so a 14-day notice never degrades to "today"): the client
 * gets the countdown renewal email, the delivery team their copy. Fired by
 * the expiration-notice cron at T-14 / T-7 / day 0 and by a manual attest of
 * the same step; the Town Crier post is the shared path below.
 */
const expirationNoticeMails = (milestoneDays: number) => (
  ctx: StepMailContext,
): StepMail[] => {
  const daysRemaining = ctx.expiryInfo?.daysRemaining ?? milestoneDays;
  const expiresOn = ctx.expiryInfo?.expiresOn ?? "the end of your current plan";
  const clientDaysLabel =
    daysRemaining <= 0
      ? "today"
      : `in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
  const noticeLabel =
    daysRemaining <= 0 ? "same-day" : `${daysRemaining}-day`;
  return [
    {
      email: ctx.userEmail,
      subject:
        daysRemaining <= 0
          ? "Your CVtoCAREER Plan Expires Today"
          : `Your CVtoCAREER Plan Expires in ${daysRemaining} Day${
              daysRemaining === 1 ? "" : "s"
            }`,
      templateName: "expiration-notice-client.ejs",
      templateData: {
        name: ctx.firstName,
        daysLabel: clientDaysLabel,
        expiresOn,
        renewalUrl: `${CLIENT_APP_DOMAIN}/dashboard/account`,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
    {
      email: TEAM_EMAIL!,
      subject: `Expiration Notice (${noticeLabel}) - ${ctx.fullName}`,
      templateName: "expiration-notice-admin.ejs",
      templateData: {
        clientName: ctx.fullName,
        clientEmail: ctx.userEmail,
        plan: ctx.planTitle,
        expiresOn,
        daysRemaining,
        noticeLabel,
        link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ];
};

/**
 * SPR-21-11-012 — what each attested step mails. Customer emails are collected
 * first, admin copies second; the caller sends them in one Promise.all and
 * skips everything when no customer email could be resolved (005/013 behaviour
 * kept byte-for-byte).
 */
const STEP_MAILS: Record<string, (ctx: StepMailContext) => StepMail[]> = {
  // SPR-21-13-002 — Campaign Commenced (audit step 23). On admin attest the
  // customer gets the "campaign is live" email and the delivery team their
  // copy; the Town Crier Slack post is the shared notify path below.
  campaign_launched: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Campaign Is Now Live",
      templateName: "campaign-launched-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
    {
      email: TEAM_EMAIL!,
      subject: `Campaign Launched - ${ctx.fullName}`,
      templateName: "campaign-launched-admin.ejs",
      templateData: {
        clientName: ctx.fullName,
        clientEmail: ctx.userEmail,
        plan: ctx.planTitle,
        link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-13-003 — First Application Sent (audit step 24). Fired by the
  // applications-started cron the moment a client's first `applications` row
  // lands (and by a manual attest of the same step): the customer gets the
  // "first application submitted" confirmation, the delivery team their copy.
  applications_started: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your First Application Has Been Submitted",
      templateName: "first-application-submitted-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
    {
      email: TEAM_EMAIL!,
      subject: `First Application Sent - ${ctx.fullName}`,
      templateName: "first-application-submitted-admin.ejs",
      templateData: {
        clientName: ctx.fullName,
        clientEmail: ctx.userEmail,
        plan: ctx.planTitle,
        link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-13-001 — Week 4 / Week 12 check-ins (audit steps 25-26). Fired by
  // the checkin-scheduler cron at campaign day 28 / day 84 (fresh 24h window,
  // campaign still live, week 12 only while the plan is active) and by a
  // manual attest of the same step: booking link to the client, admin copy
  // to the delivery team; the Town Crier post is the shared path below.
  week4_checkin: checkinStepMails("Week 4"),
  week12_checkin: checkinStepMails("Week 12"),
  service_selection: serviceSelectionStepMails,
  payment_confirmed: subscriptionStepMails,
  // SPR-21-13-004 — Interview Milestone Reached (audit step 27). Fired on the
  // FIRST completion from EITHER side: a staff attest (ADMIN_ATTEST_NOTIFY_STEPS
  // below) or the client's new self-report endpoint on the customer backend.
  // Audit alignment: Slack + customer + delivery-team emails.
  interview_milestone: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Interview Milestone Reached",
      templateName: "interview-milestone-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
    {
      email: TEAM_EMAIL!,
      subject: `Interview Milestone Reached - ${ctx.fullName}`,
      templateName: "interview-milestone-admin.ejs",
      templateData: {
        clientName: ctx.fullName,
        clientEmail: ctx.userEmail,
        plan: ctx.planTitle,
        link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-13-004 — Interview Preparation Pack Dispatched (audit step 28):
  // auto-attested when the IPP upload lands in document history; the customer
  // email carries the direct download link (DoD2; customer copy only — the
  // admin already got the existing "Interview Pack Generated" town-crier post).
  interview_prep_pack_dispatched: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Interview Preparation Pack Is Ready",
      templateName: "interview-pack-dispatched-client.ejs",
      templateData: {
        name: ctx.firstName,
        downloadUrl: ctx.details?.downloadUrl || `${CLIENT_APP_DOMAIN}/dashboard/profile`,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-13-005 — Offer / Placement Recorded (audit step 29). Fired on the
  // FIRST completion from EITHER side: a staff attest (ADMIN_ATTEST_NOTIFY_STEPS
  // below) or the client's self-report endpoint on the customer backend.
  // Audit alignment: Slack + customer congratulations + delivery-team copy.
  offer_placement_recorded: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Congratulations on Your Offer!",
      templateName: "offer-placement-recorded-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
    {
      email: TEAM_EMAIL!,
      subject: `Offer / Placement Recorded - ${ctx.fullName}`,
      templateName: "offer-placement-recorded-admin.ejs",
      templateData: {
        clientName: ctx.fullName,
        clientEmail: ctx.userEmail,
        plan: ctx.planTitle,
        link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-13-006 — Extension Decision Made (audit step 33). Customer copy
  // only (DoD2): the email states whether the extension was approved or
  // declined; the team-facing line goes to #town-crier instead of an admin
  // mail (the team made the decision and already knows it).
  extension_decision_made: (ctx) => [
    {
      email: ctx.userEmail,
      subject: `Your Extension Decision: ${decisionLabel(ctx.details?.outcome)}`,
      templateName: "extension-decision-client.ejs",
      templateData: {
        name: ctx.firstName,
        decision: decisionLabel(ctx.details?.outcome),
        note: ctx.details?.note || "",
        plan: ctx.planTitle,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-13-007 — Campaign Ended (audit step 36). Fired on the FIRST
  // completion from EITHER side: the journey-panel attest or the users-table
  // "Campaign Ended" progress milestone (confirmUserProgressController). The
  // customer copy leads with their completed-step summary and links to the
  // exit survey; the delivery team gets their copy; #town-crier fires via the
  // shared path below.
  campaign_ended: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Campaign Has Ended — Journey Summary & Feedback",
      templateName: "campaign-ended-client.ejs",
      templateData: {
        name: ctx.firstName,
        journeySummary: ctx.journeySummary ?? [],
        surveyUrl: `${CLIENT_APP_DOMAIN}/dashboard/exit-survey`,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
    {
      email: TEAM_EMAIL!,
      subject: `Campaign Ended - ${ctx.fullName}`,
      templateName: "campaign-ended-admin.ejs",
      templateData: {
        clientName: ctx.fullName,
        clientEmail: ctx.userEmail,
        plan: ctx.planTitle,
        stepsCompleted: (ctx.journeySummary ?? []).length,
        link: `${ctx.frontendUrl}/admin-dashboard/users/${ctx.userId}`,
        frontendUrl: ctx.frontendUrl,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-13-008 — Referral Eligibility Confirmed (audit step 38). Customer
  // copy only (DoD1): the email carries the programme details and the
  // client's personal referral link; #town-crier fires via the shared path
  // below on the same first completion.
  referral_eligibility: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "You're Eligible for the CVtoCAREER Referral Programme",
      templateName: "referral-eligibility-client.ejs",
      templateData: {
        name: ctx.firstName,
        referralLink: ctx.referralLink,
        referralsUrl: `${CLIENT_APP_DOMAIN}/dashboard/referrals`,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-13-008 — Renewal / Next Steps Offered (audit step 39). Fired on
  // the FIRST completion from EITHER side: the campaign_ended cascade or a
  // manual attest of this step. Customer copy only (DoD2): the email shows
  // the pricing options (active plan tiers from the `features` table) with a
  // CTA to the pricing page; #town-crier fires via the shared path below.
  renewal_offered: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Renewal & Next Steps — Your Pricing Options",
      templateName: "renewal-offered-client.ejs",
      templateData: {
        name: ctx.firstName,
        plan: ctx.planTitle,
        tiers: ctx.pricingTiers ?? [],
        pricingUrl: `${CLIENT_APP_DOMAIN}/dashboard/account`,
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
  ],
  profile_alignment_check: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Profile Has Been Aligned and Checked",
      templateName: "profile-alignment-confirmed-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: CLIENT_APP_DOMAIN,
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
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
    {
      email: ctx.userEmail,
      subject: "You're Ready \u2014 Your Campaign Launches Shortly",
      templateName: "campaign-launch-ready-client.ejs",
      templateData: {
        name: ctx.firstName,
        frontendUrl: CLIENT_APP_DOMAIN,
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
        frontendUrl: CLIENT_APP_DOMAIN,
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
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
    },
  ],
  // SPR-21-11-006 — Welcome Call, steps 7 and 8. The scheduling mail carries
  // the .ics invite too: audit step 7 asks for "email + calendar invite" in
  // all three personas.
  welcome_call_scheduled: (ctx) => [
    {
      email: ctx.userEmail,
      subject: "Your Welcome Call Is Scheduled",
      templateName: "welcome-call-scheduled-client.ejs",
      templateData: {
        name: ctx.firstName,
        dateTime: formatDateTime(ctx.details?.scheduledAt),
        frontendUrl: CLIENT_APP_DOMAIN,
        currentYear: ctx.currentYear,
      },
      attachments: ctx.details?.scheduledAt
        ? [welcomeCallIcs(ctx.details.scheduledAt)]
        : [],
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
        frontendUrl: CLIENT_APP_DOMAIN,
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
            frontendUrl: CLIENT_APP_DOMAIN,
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
          frontendUrl: CLIENT_APP_DOMAIN,
          currentYear: ctx.currentYear,
        },
        attachments: scheduledAt ? [preferenceReviewIcs(scheduledAt)] : [],
      },
    ];
  },
  // SPR-21-13-009 — subscription expiration trio (audit steps 30/31/35):
  // the T-14 / T-7 / day-0 countdown notices. One builder keyed by the
  // days-remaining the prefetch resolved; the cron fires them at the exact
  // milestone day and a manual attest sends the same set.
  expiration_notice_14day: expirationNoticeMails(14),
  expiration_notice_7day: expirationNoticeMails(7),
  expiration_notice_0day: expirationNoticeMails(0),
};

/** First Slack line for 012's gates; other steps keep the generic body only. */
const STEP_SLACK_HEADLINES: Record<string, string> = {
  campaign_launched:
    "Campaign launched \u2014 the client's campaign is live; applications begin now.",
  applications_started:
    "First application sent \u2014 the client's first job application has gone out on their behalf.",
  // SPR-21-13-001 — Week 4 / Week 12 check-ins (audit steps 25-26).
  week4_checkin:
    "Week 4 check-in \u2014 booking link emailed to the client for their progress review call or screenshare.",
  week12_checkin:
    "Week 12 check-in \u2014 booking link emailed to the client for their progress review call or screenshare.",
  interview_milestone:
    "Interview milestone reached \u2014 recorded by the client or the team; interview follow-up begins.",
  interview_prep_pack_dispatched:
    "Interview Preparation Pack dispatched \u2014 emailed to the client with a direct download link.",
  offer_placement_recorded:
    "Offer / placement recorded — congratulations to the client; the leaderboard picks up the new placement.",
  // SPR-21-13-006 — Extension Granted / +14 Days: extendUserPlan has bumped
  // the subscription end date; the confirmation email is plan-extended.ejs
  // (sent by extendUserPlan itself), so no STEP_MAILS entry here.
  extension_granted:
    "Extension granted — +14 days added to the subscription end date; the confirmation email is on its way.",
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
  // SPR-21-13-007 — Campaign Ended (audit step 36).
  campaign_ended:
    "Campaign ended — journey summary and exit-survey link emailed to the client.",
  // SPR-21-13-008 — Referral Eligibility Confirmed (audit step 38).
  referral_eligibility:
    "Referral eligibility confirmed — programme details and the client's personal referral link emailed to them.",
  // SPR-21-13-008 — Renewal / Next Steps Offered (audit step 39).
  renewal_offered:
    "Renewal offered — pricing options and next steps emailed to the client after the campaign ended.",
  // SPR-21-13-009 — subscription expiration trio (audit steps 30/31/35).
  expiration_notice_14day:
    "14-day expiration notice sent — the client has 14 days left; renewal reminder emailed to them.",
  expiration_notice_7day:
    "7-day expiration notice sent — the client has 7 days left; renewal reminder emailed to them.",
  expiration_notice_0day:
    "Expiration day notice sent — the client's plan expires today; final renewal reminder emailed to them.",
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
      // SPR-21-13-008 — the referral email needs the client's partner
      // referral code, so that one step prefetches the association; every
      // other step keeps the plain lookup.
      const user = await User.findByPk(userId, {
        include:
          stepKey === "referral_eligibility"
            ? [{ model: Partner, attributes: ["referralCode"] }]
            : [],
      });
      if (!user) {
        logger.warn(
          `Step "${stepKey}" completed for unknown user ${userId} — skipping notifications`,
        );
        return;
      }

      const userEmail = await fieldEncryption.getUserEmail(userId);
      const fullName = getFullName(user);
      const planTitle = user.plan || user.selectedPlan || "Your plan";
      const actor = actorId ? await User.findByPk(actorId) : null;
      const actorName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() : "";
      const frontendUrl = getFrontendUrl();
      const currentYear = new Date().getFullYear();

      // SPR-21-13-007 — the campaign-ended email leads with the client's
      // completed steps. Prefetched here (registry order, plain-English
      // labels) so the STEP_MAILS builders stay synchronous; a failed
      // prefetch degrades to an empty summary rather than dropping the mail.
      let journeySummary: { label: string; completedAt: Date }[] | undefined;
      if (stepKey === "campaign_ended") {
        try {
          const journey = await getClientJourney(userId);
          const orderOf = new Map(CLIENT_JOURNEY_STEPS.map((s, i) => [s.stepKey, i]));
          journeySummary = journey.steps
            .slice()
            .sort(
              (a, b) =>
                (orderOf.get(a.stepKey) ?? Number.MAX_SAFE_INTEGER) -
                (orderOf.get(b.stepKey) ?? Number.MAX_SAFE_INTEGER),
            )
            .map((s) => ({
              label: STEP_LABELS[s.stepKey] ?? s.stepKey,
              completedAt: s.completedAt,
            }));
        } catch (journeyError) {
          logger.warn(
            `Journey summary for campaign_ended (user ${userId}) unavailable: ${journeyError} — sending without it`,
          );
        }
      }

      // SPR-21-13-008 — the referral email's personal link, built exactly
      // like referral.service: the partner's code when one exists, the
      // email-based fallback otherwise. Prefetched here so the STEP_MAILS
      // builder stays synchronous.
      let referralLink: string | undefined;
      if (stepKey === "referral_eligibility") {
        const partnerCode = (user as any).partner?.referralCode;
        referralLink = buildReferralLink(frontendUrl, userEmail, partnerCode);
      }

      // SPR-21-13-008 — the renewal email's "pricing options": active tiers
      // from the `features` table (same rows the pricing page reads).
      // Prefetched here so the STEP_MAILS builder stays synchronous; a
      // failed prefetch degrades to an empty tier list rather than dropping
      // the mail (the template still links the pricing page).
      let pricingTiers: { title: string; price: number; validityPeriod: string }[] | undefined;
      if (stepKey === "renewal_offered") {
        try {
          const features = await Feature.findAll({
            where: { isActive: true },
            attributes: ["title", "price", "validityPeriod"],
            order: [["price", "ASC"]],
          });
          pricingTiers = features.map((f) => ({
            title: f.title,
            price: Number(f.price),
            validityPeriod: f.validityPeriod,
          }));
        } catch (tierError) {
          logger.warn(
            `Pricing tiers for renewal_offered (user ${userId}) unavailable: ${tierError} — sending without them`,
          );
        }
      }

      // SPR-21-13-009 — the expiration trio's emails lead with the client's
      // recomputed campaign end date and the days remaining. Prefetched here
      // (same calculator the campaign page uses) so both the cron-fired and
      // the manually-attested path render the correct countdown; a failed
      // lookup degrades to a generic date rather than dropping the mail.
      let expiryInfo: ExpiryInfo | undefined;
      if (EXPIRATION_NOTICE_STEPS.has(stepKey)) {
        try {
          const credential = await Credentials.findOne({
            where: { clientId: userId },
          });
          if (credential) {
            const jsonb = ((credential as any).seekExternalCredentials ||
              {}) as Record<string, any>;
            const computed = calculateCampaignFields({
              SeekSubStartDate: (credential as any).SeekSubStartDate,
              createdAt: (credential as any).createdAt,
              SeekSubDurDays: jsonb.SeekSubDurDays,
              GraceDuration: jsonb.GraceDuration,
            });
            const endDate = parseCampaignDate(computed.CampaignEnd);
            if (endDate) {
              expiryInfo = {
                expiresOn: endDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }),
                daysRemaining: daysUntil(endDate),
              };
            }
          }
        } catch (expiryError) {
          logger.warn(
            `Expiry info for step "${stepKey}" (user ${userId}) unavailable: ${expiryError} — sending without the exact date`,
          );
        }
      }

      const buildMails = STEP_MAILS[stepKey];
      if (!buildMails) {
        logger.warn(
          `No mail config for step "${stepKey}" — posting to Slack only`,
        );
      }

      // Emails and Slack must both fire for the same step completion (012's
      // DoD), so a mail failure is logged and Slack still posts instead of
      // being skipped by the outer catch.
      let emailsSent = false;
      const hasMailConfig = Boolean(buildMails);
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
            journeySummary,
            referralLink,
            pricingTiers,
            expiryInfo,
          });
          if (stepMails.length > 0) {
            await Promise.all(stepMails.map((mail) => sendMail(mail)));
          }
          emailsSent = true;
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

      const slackHost = host || CLIENT_APP_DOMAIN;
      // 010's single step has two moments — pick the headline that matches
      // what the admin recorded on the attest form. 006's two outcome steps
      // embed the picker value (eligibility result / approved-vs-declined).
      const headline =
        stepKey === "preference_review_session"
          ? details?.mode === "completed"
            ? "Preference Review Session completed — outcome summary and next steps emailed to the client."
            : "Preference Review Session scheduled — date, time and calendar invite emailed to the client."
          : stepKey === "extension_eligibility_check"
            ? details?.outcome
              ? `Extension eligibility check — result: ${details.outcome}.`
              : "Extension eligibility check completed — no structured result recorded."
            : stepKey === "extension_decision_made"
              ? `Extension decision made — ${decisionLabel(details?.outcome)}; the customer has been emailed.`
              : STEP_SLACK_HEADLINES[stepKey];
      const whenLine = details?.scheduledAt
        ? `\nScheduled for: ${formatDateTime(details.scheduledAt)}`
        : "";
      const noteLine = details?.note ? `\nNote: ${details.note}` : "";
      // SPR-21-13-008 — Slack must still fire (012's DoD) but must never claim
      // the client was emailed when the send failed or no address resolved.
      const mailNotSentLine =
        hasMailConfig && (!userEmail || !emailsSent)
          ? "\n⚠ The customer email was NOT sent — follow up manually."
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
Completed by: ${actorName || actorId}
Plan: ${planTitle}${whenLine}${noteLine}${mailNotSentLine}`,
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
