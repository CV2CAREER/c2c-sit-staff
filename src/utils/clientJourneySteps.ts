import { ClientJourneyPhase } from "./enum";

// Canonical 23-step client journey registry — mirrors the customer backend's
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
  { order: 0, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "email_verified", perTour: false },
  { order: 1, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "document_uploaded", perTour: false },
  { order: 2, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "document_accepted", perTour: false },
  { order: 3, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "service_selection", perTour: false },
  { order: 4, phaseKey: ClientJourneyPhase.GETTING_STARTED, stepKey: "payment_confirmed", perTour: false },
  { order: 5, phaseKey: ClientJourneyPhase.WELCOME, stepKey: "account_activated", perTour: true },
  { order: 6, phaseKey: ClientJourneyPhase.WELCOME, stepKey: "welcome_call", perTour: true },
  { order: 7, phaseKey: ClientJourneyPhase.WELCOME, stepKey: "confirmation_sent", perTour: true },
  { order: 8, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "preference_update", perTour: true },
  { order: 9, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "cv_variant_dispatch", perTour: true },
  { order: 10, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "jobsite_accounts", perTour: true },
  { order: 11, phaseKey: ClientJourneyPhase.TOOLKIT, stepKey: "email_alias", perTour: true },
  { order: 12, phaseKey: ClientJourneyPhase.FINAL_CHECKS, stepKey: "jobsite_verification", perTour: true },
  { order: 13, phaseKey: ClientJourneyPhase.FINAL_CHECKS, stepKey: "social_follow", perTour: true },
  { order: 14, phaseKey: ClientJourneyPhase.FINAL_CHECKS, stepKey: "prep_session", perTour: true },
  { order: 15, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "campaign_launched", perTour: true },
  { order: 16, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "applications_started", perTour: true },
  { order: 17, phaseKey: ClientJourneyPhase.CAMPAIGN_LIVE, stepKey: "interview_milestone", perTour: true },
  { order: 18, phaseKey: ClientJourneyPhase.CAMPAIGN_REVIEW, stepKey: "performance_review", perTour: true },
  { order: 19, phaseKey: ClientJourneyPhase.CAMPAIGN_REVIEW, stepKey: "lqa_audit", perTour: true },
  { order: 20, phaseKey: ClientJourneyPhase.WHATS_NEXT, stepKey: "campaign_ended", perTour: true },
  { order: 21, phaseKey: ClientJourneyPhase.WHATS_NEXT, stepKey: "referral_eligibility", perTour: true },
  { order: 22, phaseKey: ClientJourneyPhase.WHATS_NEXT, stepKey: "renewal_offered", perTour: true },
];

export const CLIENT_JOURNEY_STEP_BY_KEY = new Map<string, ClientJourneyStepDefinition>(
  CLIENT_JOURNEY_STEPS.map((step) => [step.stepKey, step]),
);

// Steps with no code path anywhere that completes them automatically —
// campaign_launched and applications_started have a real signal on the
// customer side but were deliberately left unwired due to a race risk with
// the payment webhook, so they're treated the same as the fully-manual ones.
export const NO_AUTO_TRIGGER_STEP_KEYS = new Set<string>([
  "welcome_call",
  "confirmation_sent",
  "cv_variant_dispatch",
  "jobsite_accounts",
  "email_alias",
  "jobsite_verification",
  "prep_session",
  "campaign_launched",
  "applications_started",
  "interview_milestone",
  "performance_review",
  "lqa_audit",
  "referral_eligibility",
  "renewal_offered",
]);
