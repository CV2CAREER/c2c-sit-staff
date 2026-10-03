import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { Partner } from "../models/v1/partner.model";
import { sendMail } from "../config/sendGrid";
import { TEAM_EMAIL } from "../config/env";
import { getFullName, getFrontendUrl } from "../utils/helpers";
import { fieldEncryption } from "../utils/field-encryption";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { SlackService } from "./slack.service";
// 007 — cycle with client-journey.service (it imports this module): both
// sides only touch each other inside function bodies, which is safe under
// CommonJS, same convention as the admin-plan ↔ client-journey cycle.
import { getClientJourney } from "./client-journey.service";
import { CLIENT_JOURNEY_STEPS, STEP_LABELS } from "../utils/clientJourneySteps";
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
      bookingUrl: `${ctx.frontendUrl}/dashboard/sessions/booking`,
      frontendUrl: ctx.frontendUrl,
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
        frontendUrl: ctx.frontendUrl,
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
        frontendUrl: ctx.frontendUrl,
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
  service_selection: subscriptionStepMails,
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
        frontendUrl: ctx.frontendUrl,
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
        downloadUrl: ctx.details?.downloadUrl || `${ctx.frontendUrl}/dashboard/profile`,
        frontendUrl: ctx.frontendUrl,
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
        frontendUrl: ctx.frontendUrl,
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
        frontendUrl: ctx.frontendUrl,
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
        surveyUrl: `${ctx.frontendUrl}/dashboard/exit-survey`,
        frontendUrl: ctx.frontendUrl,
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
        referralsUrl: `${ctx.frontendUrl}/dashboard/referrals`,
        frontendUrl: ctx.frontendUrl,
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
        frontendUrl: ctx.frontendUrl,
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
        attachments: scheduledAt ? [preferenceReviewIcs(scheduledAt)] : [],
      },
    ];
  },
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
        referralLink = partnerCode
          ? `${frontendUrl}/register?ref=${partnerCode}`
          : `${frontendUrl}/register?ref=${userEmail}-partner`;
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
Plan: ${planTitle}${whenLine}${noteLine}`,
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
