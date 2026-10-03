import { ClientJourneyPhaseKey, ClientJourneyStepRow } from "@/types/client-journey.types";

// Canonical 39-step client journey registry — duplicated by hand from the
// staff backend's src/utils/clientJourneySteps.ts (which itself mirrors the
// customer backend's registry), same manual-sync convention used for every
// other table/enum shared across these repos.
export interface ClientJourneyStepDefinition {
  order: number;
  phaseKey: ClientJourneyPhaseKey;
  stepKey: string;
  perTour: boolean;
  label: string;
}

export const CLIENT_JOURNEY_PHASES: { key: ClientJourneyPhaseKey; label: string }[] = [
  { key: "getting-started", label: "Getting started" },
  { key: "welcome", label: "Welcome" },
  { key: "toolkit", label: "Toolkit" },
  { key: "final-checks", label: "Final checks" },
  { key: "campaign-live", label: "Campaign live" },
  { key: "campaign-review", label: "Campaign review" },
  { key: "campaign-ended", label: "Campaign ended" },
];

export const CLIENT_JOURNEY_STEPS: ClientJourneyStepDefinition[] = [
  // Phase 1 — Getting Started (one-time, account-level)
  { order: 0, phaseKey: "getting-started", stepKey: "account_signup", perTour: false, label: "Account signup" },
  { order: 1, phaseKey: "getting-started", stepKey: "email_verified", perTour: false, label: "Email verified" },
  { order: 2, phaseKey: "getting-started", stepKey: "document_uploaded", perTour: false, label: "Document uploaded" },
  { order: 3, phaseKey: "getting-started", stepKey: "document_accepted", perTour: false, label: "Document accepted" },
  { order: 4, phaseKey: "getting-started", stepKey: "service_selection", perTour: false, label: "Service selection" },
  { order: 5, phaseKey: "getting-started", stepKey: "payment_confirmed", perTour: false, label: "Payment confirmed" },
  { order: 6, phaseKey: "getting-started", stepKey: "payment_receipt_sent", perTour: false, label: "Payment receipt sent" },

  // Phase 2 — Welcome (tour-scoped)
  { order: 7, phaseKey: "welcome", stepKey: "welcome_call_scheduled", perTour: true, label: "Welcome call scheduled" },
  { order: 8, phaseKey: "welcome", stepKey: "welcome_call_completed", perTour: true, label: "Welcome call completed" },
  { order: 9, phaseKey: "welcome", stepKey: "confirmation_sent", perTour: true, label: "Confirmation sent" },
  { order: 10, phaseKey: "welcome", stepKey: "social_follow", perTour: true, label: "Social follow" },

  // Phase 3 — Building Your Toolkit (tour-scoped)
  { order: 11, phaseKey: "toolkit", stepKey: "cv_uploaded", perTour: true, label: "CV uploaded" },
  { order: 12, phaseKey: "toolkit", stepKey: "cv_variant_dispatch", perTour: true, label: "CV variant dispatch" },
  { order: 13, phaseKey: "toolkit", stepKey: "cv_approved", perTour: true, label: "CV approved" },
  { order: 14, phaseKey: "toolkit", stepKey: "cv_variant_uploaded", perTour: true, label: "CV variant uploaded" },
  { order: 15, phaseKey: "toolkit", stepKey: "rtr_dispatched", perTour: true, label: "RTR dispatched" },
  { order: 16, phaseKey: "toolkit", stepKey: "preference_update", perTour: true, label: "Preference update" },
  { order: 17, phaseKey: "toolkit", stepKey: "preference_review_session", perTour: true, label: "Preference review session" },

  // Phase 4 — Final Checks (tour-scoped)
  { order: 18, phaseKey: "final-checks", stepKey: "job_credentials_provided", perTour: true, label: "Job credentials provided" },
  { order: 19, phaseKey: "final-checks", stepKey: "jobsite_verification", perTour: true, label: "Jobsite verification" },
  { order: 20, phaseKey: "final-checks", stepKey: "jobsite_credentials_approved", perTour: true, label: "Jobsite credentials approved" },
  { order: 21, phaseKey: "final-checks", stepKey: "profile_alignment_check", perTour: true, label: "Profile alignment check" },
  { order: 22, phaseKey: "final-checks", stepKey: "campaign_readiness_confirmed", perTour: true, label: "Campaign readiness confirmed" },

  // Phase 5 — Campaign Live (tour-scoped)
  { order: 23, phaseKey: "campaign-live", stepKey: "campaign_launched", perTour: true, label: "Campaign launched" },
  { order: 24, phaseKey: "campaign-live", stepKey: "applications_started", perTour: true, label: "Applications started" },
  { order: 25, phaseKey: "campaign-live", stepKey: "week4_checkin", perTour: true, label: "Week 4 check-in" },
  { order: 26, phaseKey: "campaign-live", stepKey: "interview_milestone", perTour: true, label: "Interview milestone" },
  { order: 27, phaseKey: "campaign-live", stepKey: "interview_prep_pack_dispatched", perTour: true, label: "Interview prep pack dispatched" },
  { order: 28, phaseKey: "campaign-live", stepKey: "offer_placement_recorded", perTour: true, label: "Offer/placement recorded" },

  // Phase 6 — Campaign Review (tour-scoped)
  { order: 29, phaseKey: "campaign-review", stepKey: "expiration_notice_14day", perTour: true, label: "Expiration notice (14 day)" },
  { order: 30, phaseKey: "campaign-review", stepKey: "expiration_notice_7day", perTour: true, label: "Expiration notice (7 day)" },
  { order: 31, phaseKey: "campaign-review", stepKey: "extension_eligibility_check", perTour: true, label: "Extension eligibility check" },
  { order: 32, phaseKey: "campaign-review", stepKey: "extension_decision_made", perTour: true, label: "Extension decision made" },
  { order: 33, phaseKey: "campaign-review", stepKey: "extension_granted", perTour: true, label: "Extension granted" },
  { order: 34, phaseKey: "campaign-review", stepKey: "expiration_notice_0day", perTour: true, label: "Expiration notice (0 day)" },

  // Phase 7 — Campaign Ended (tour-scoped)
  { order: 35, phaseKey: "campaign-ended", stepKey: "campaign_ended", perTour: true, label: "Campaign ended" },
  { order: 36, phaseKey: "campaign-ended", stepKey: "exit_survey", perTour: true, label: "Exit survey" },
  { order: 37, phaseKey: "campaign-ended", stepKey: "referral_eligibility", perTour: true, label: "Referral eligibility" },
  { order: 38, phaseKey: "campaign-ended", stepKey: "renewal_offered", perTour: true, label: "Renewal offered" },
];

// Steps with no code path anywhere that completes them automatically —
// these are the only ones that get an Attest button. campaign_launched and
// applications_started have a real signal on the customer side but were
// deliberately left unwired due to a race risk with the payment webhook, so
// they're treated the same as the fully-manual ones. Every newly added step
// also starts here — none of them have a real automatic trigger yet.
// job_credentials_provided dropped out (SPR-21-11-011): the customer's own
// credential submission now completes it. cv_uploaded dropped out
// (SPR-21-11-008): a resume upload now completes it. cv_variant_dispatch,
// cv_approved and cv_variant_uploaded dropped out (SPR-21-11-009): admin save
// of the variant and the client's approving re-upload now complete them.
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
  "applications_started",
  "week4_checkin",
  "interview_milestone",
  "interview_prep_pack_dispatched",
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

export type DerivedStepState = "done" | "current" | "awaiting";
export type DerivedPhaseState = "done" | "current" | "pending";

export interface DerivedStep extends ClientJourneyStepDefinition {
  state: DerivedStepState;
  completion: ClientJourneyStepRow | null;
}

export interface DerivedPhase {
  key: ClientJourneyPhaseKey;
  label: string;
  state: DerivedPhaseState;
  steps: DerivedStep[];
}

// "current" = first step (in registry order) with no completion row;
// everything before it is "done", everything after is "awaiting" — the
// same derivation the customer side uses, kept here so the stepper and the
// sub-step list can never disagree.
export function deriveJourneyState(steps: ClientJourneyStepRow[]): {
  phases: DerivedPhase[];
  currentPhaseKey: ClientJourneyPhaseKey;
} {
  const completionByKey = new Map(steps.map((row) => [row.stepKey, row]));

  let currentFound = false;
  const derivedSteps: DerivedStep[] = CLIENT_JOURNEY_STEPS.map((def) => {
    const completion = completionByKey.get(def.stepKey) ?? null;

    if (completion) {
      return { ...def, state: "done" as const, completion };
    }

    if (!currentFound) {
      currentFound = true;
      return { ...def, state: "current" as const, completion: null };
    }

    return { ...def, state: "awaiting" as const, completion: null };
  });

  let currentPhaseKey: ClientJourneyPhaseKey = CLIENT_JOURNEY_PHASES[CLIENT_JOURNEY_PHASES.length - 1].key;

  const phases: DerivedPhase[] = CLIENT_JOURNEY_PHASES.map((phase) => {
    const phaseSteps = derivedSteps.filter((step) => step.phaseKey === phase.key);
    const allDone = phaseSteps.every((step) => step.state === "done");
    const hasCurrent = phaseSteps.some((step) => step.state === "current");

    if (hasCurrent) {
      currentPhaseKey = phase.key;
    }

    const state: DerivedPhaseState = allDone ? "done" : hasCurrent ? "current" : "pending";

    return { key: phase.key, label: phase.label, state, steps: phaseSteps };
  });

  return { phases, currentPhaseKey };
}
