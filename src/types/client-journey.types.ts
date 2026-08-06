export type ClientJourneyPhaseKey =
  | "getting-started"
  | "welcome"
  | "toolkit"
  | "final-checks"
  | "campaign-live"
  | "campaign-review"
  | "whats-next";

export type ClientJourneyActorType = "client" | "system" | "admin";
export type ClientJourneySource = "automatic" | "manual";
export type ClientJourneyStepStatus = "done" | "skipped";

export interface ClientJourneyStepRow {
  id: string;
  userId: string;
  tourId: string | null;
  phaseKey: ClientJourneyPhaseKey;
  stepKey: string;
  status: ClientJourneyStepStatus;
  completedAt: string;
  actorId: string;
  actorType: ClientJourneyActorType;
  source: ClientJourneySource;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientJourneyResponse {
  activeTourId: string | null;
  activeTourNumber: number;
  steps: ClientJourneyStepRow[];
}
