import { ClientJourneyPhaseKey, ClientJourneyStepRow } from "@/types/client-journey.types";

// Canonical 23-step client journey registry — duplicated by hand from the
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
  { key: "whats-next", label: "What's next" },
];

export const CLIENT_JOURNEY_STEPS: ClientJourneyStepDefinition[] = [
  { order: 0, phaseKey: "getting-started", stepKey: "email_verified", perTour: false, label: "Email verified" },
  { order: 1, phaseKey: "getting-started", stepKey: "document_uploaded", perTour: false, label: "Document uploaded" },
  { order: 2, phaseKey: "getting-started", stepKey: "document_accepted", perTour: false, label: "Document accepted" },
  { order: 3, phaseKey: "getting-started", stepKey: "service_selection", perTour: false, label: "Service selection" },
  { order: 4, phaseKey: "getting-started", stepKey: "payment_confirmed", perTour: false, label: "Payment confirmed" },
  { order: 5, phaseKey: "welcome", stepKey: "account_activated", perTour: true, label: "Account activated" },
  { order: 6, phaseKey: "welcome", stepKey: "welcome_call", perTour: true, label: "Welcome call" },
  { order: 7, phaseKey: "welcome", stepKey: "confirmation_sent", perTour: true, label: "Confirmation sent" },
  { order: 8, phaseKey: "toolkit", stepKey: "preference_update", perTour: true, label: "Preference update" },
  { order: 9, phaseKey: "toolkit", stepKey: "cv_variant_dispatch", perTour: true, label: "CV variant dispatch" },
  { order: 10, phaseKey: "toolkit", stepKey: "jobsite_accounts", perTour: true, label: "Jobsite accounts" },
  { order: 11, phaseKey: "toolkit", stepKey: "email_alias", perTour: true, label: "Email alias" },
  { order: 12, phaseKey: "final-checks", stepKey: "jobsite_verification", perTour: true, label: "Jobsite verification" },
  { order: 13, phaseKey: "final-checks", stepKey: "social_follow", perTour: true, label: "Social follow" },
  { order: 14, phaseKey: "final-checks", stepKey: "prep_session", perTour: true, label: "Prep session" },
  { order: 15, phaseKey: "campaign-live", stepKey: "campaign_launched", perTour: true, label: "Campaign launched" },
  { order: 16, phaseKey: "campaign-live", stepKey: "applications_started", perTour: true, label: "Applications started" },
  { order: 17, phaseKey: "campaign-live", stepKey: "interview_milestone", perTour: true, label: "Interview milestone" },
  { order: 18, phaseKey: "campaign-review", stepKey: "performance_review", perTour: true, label: "Performance review" },
  { order: 19, phaseKey: "campaign-review", stepKey: "lqa_audit", perTour: true, label: "LQA audit" },
  { order: 20, phaseKey: "whats-next", stepKey: "campaign_ended", perTour: true, label: "Campaign ended" },
  { order: 21, phaseKey: "whats-next", stepKey: "referral_eligibility", perTour: true, label: "Referral eligibility" },
  { order: 22, phaseKey: "whats-next", stepKey: "renewal_offered", perTour: true, label: "Renewal offered" },
];

// Steps with no code path anywhere that completes them automatically —
// these are the only ones that get an Attest button. campaign_launched and
// applications_started have a real signal on the customer side but were
// deliberately left unwired due to a race risk with the payment webhook, so
// they're treated the same as the fully-manual ones for now.
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
