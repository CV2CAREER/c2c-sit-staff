import { ClientJourneyPhase } from "./enum";

// Canonical 39-step client journey registry — mirrors the customer backend's
// registry exactly (kept in sync by hand, same convention as the duplicated
// ClientJourneyStep model/enums). perTour: false steps are one-time,
// account-level and always carry tourId: null; perTour: true steps are
// scoped to whichever CredentialsTour was active when completed, so a
// renewal gets a fresh set of rows without losing history of the first.
export interface ClientJourneyStepDefinition {
  order: number;
  phaseKey: ClientJourneyPhase;
  stepKey: string;
  perTour: boolean;
}

export const CLIENT_JOURNEY_STEPS: ClientJourneyStepDefinition[] = [
  // Phase 1 — Getting Started (one-time, account-level)
  { order: 0, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "account_signup", perTour: false },
  { order: 1, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "email_verified", perTour: false },
  { order: 2, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "document_uploaded", perTour: false },
  { order: 3, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "document_accepted", perTour: false },
  { order: 4, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "service_selection", perTour: false },
  { order: 5, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "payment_confirmed", perTour: false },
  { order: 6, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "payment_receipt_sent", perTour: false },

  // Phase 2 — Welcome (tour-scoped)
  { order: 7, phaseKey: ClientJourneyPhase.WELCOME, stepKey: "welcome_call_scheduled", perTour: true },
  { order: 8, phaseKey: ClientJourneyPhase.WELCOME, stepKey: "welcome_call_completed", perTour: true },
  { order: 9, phaseKey: ClientJourneyPhase.WELCOME, stepKey: "confirmation_sent", perTour: true },
  { order: 10, phaseKey: ClientJourneyPhase.WELCOME, stepKey: "social_follow", perTour: true },

  // Phase 3 — Building Your Toolkit (tour-scoped)
  { order: 11, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "cv_uploaded", perTour: true },
  { order: 12, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "cv_variant_dispatch", perTour: true },
  { order: 13, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "cv_approved", perTour: true },
  { order: 14, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "cv_variant_uploaded", perTour: true },
  { order: 15, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "rtr_dispatched", perTour: true },
  { order: 16, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "preference_update", perTour: true },
  { order: 17, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "preference_review_session", perTour: true },

  // Phase 4 — Final Checks (tour-scoped)
  { order: 18, phaseKey: ClientJourneyPhase.FINAL_CHECKS, stepKey: "job_credentials_provided", perTour: true },
  { order: 19, phaseKey: ClientJourneyPhase.FINAL_CHECKS, stepKey: "jobsite_verification", perTour: true },
  { order: 20, phaseKey: ClientJourneyPhase.FINAL_CHECKS, stepKey: "jobsite_credentials_approved", perTour: true },
  { order: 21, phaseKey: ClientJourneyPhase.FINAL_CHECKS, stepKey: "profile_alignment_check", perTour: true },
  { order: 22, phaseKey: ClientJourneyPhase.FINAL_CHECKS, stepKey: "campaign_readiness_confirmed", perTour: true },

  // Phase 5 — Campaign Live (tour-scoped)
  { order: 23, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "campaign_launched", perTour: true },
  { order: 24, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "applications_started", perTour: true },
  { order: 25, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "week4_checkin", perTour: true },
  { order: 26, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "interview_milestone", perTour: true },
  { order: 27, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "interview_prep_pack_dispatched", perTour: true },
  { order: 28, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "offer_placement_recorded", perTour: true },

  // Phase 6 — Campaign Review (tour-scoped)
  { order: 29, phaseKey: ClientJourneyPhase.CAMPAIGN_REVIEW, stepKey: "expiration_notice_14day", perTour: true },
  { order: 30, phaseKey: ClientJourneyPhase.CAMPAIGN_REVIEW, stepKey: "expiration_notice_7day", perTour: true },
  { order: 31, phaseKey: ClientJourneyPhase.CAMPAIGN_REVIEW, stepKey: "extension_eligibility_check", perTour: true },
  { order: 32, phaseKey: ClientJourneyPhase.CAMPAIGN_REVIEW, stepKey: "extension_decision_made", perTour: true },
  { order: 33, phaseKey: ClientJourneyPhase.CAMPAIGN_REVIEW, stepKey: "extension_granted", perTour: true },
  { order: 34, phaseKey: ClientJourneyPhase.CAMPAIGN_REVIEW, stepKey: "expiration_notice_0day", perTour: true },

  // Phase 7 — Campaign Ended (tour-scoped)
  { order: 35, phaseKey: ClientJourneyPhase.CAMPAIGN_ENDED, stepKey: "campaign_ended", perTour: true },
  { order: 36, phaseKey: ClientJourneyPhase.CAMPAIGN_ENDED, stepKey: "exit_survey", perTour: true },
  { order: 37, phaseKey: ClientJourneyPhase.CAMPAIGN_ENDED, stepKey: "referral_eligibility", perTour: true },
  { order: 38, phaseKey: ClientJourneyPhase.CAMPAIGN_ENDED, stepKey: "renewal_offered", perTour: true },
];

export const CLIENT_JOURNEY_STEP_BY_KEY = new Map<string, ClientJourneyStepDefinition>(
  CLIENT_JOURNEY_STEPS.map((step) => [step.stepKey, step]),
);

// Steps with no code path anywhere that completes them automatically —
// email_verified, document_uploaded, document_accepted, service_selection,
// payment_confirmed, payment_receipt_sent, social_follow, preference_update,
// rtr_dispatched, cv_uploaded, job_credentials_provided, cv_variant_dispatch,
// cv_approved, cv_variant_uploaded, applications_started (SPR-21-13-003 cron),
// interview_prep_pack_dispatched (SPR-21-13-004 IPP upload hook) and
// campaign_ended are the only ones wired to a real trigger elsewhere;
// everything else (including every newly added step below) requires an admin
// Attest until a real automatic trigger is built for it. Note the attest-only
// steps can still NOTIFY on first completion (ADMIN_ATTEST_NOTIFY_STEPS) —
// this set only tracks which ones have a non-attest trigger.
export const NO_AUTO_TRIGGER_STEP_KEYS = new Set<string>([
  "account_signup",
  "welcome_call_scheduled",
  "welcome_call_completed",
  "confirmation_sent",
  "preference_review_session",
  "jobsite_verification",
  "jobsite_credentials_approved",
  "profile_alignment_check",
  "campaign_readiness_confirmed",
  "campaign_launched",
  "week4_checkin",
  "interview_milestone",
  "offer_placement_recorded",
  "expiration_notice_14day",
  "expiration_notice_7day",
  "extension_eligibility_check",
  "extension_decision_made",
  "extension_granted",
  "expiration_notice_0day",
  "exit_survey",
  "referral_eligibility",
  "renewal_offered",
]);
