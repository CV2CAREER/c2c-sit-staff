export type ClientSampleVariance = "queue" | "processing" | "completed";

export interface ClientSampleUser {
  Alias_Email: string;
  Full_Name?: string;
  uid?: string;
}

export interface ClientSampleRow {
  id: string | number;
  uid: string;
  name: string;
  email: string;
  jobsiteEmail: string;
  aggregator: string;
  bot: string | null;
  startTime: string | null;
  endTime: string | null;
  progress: number;
  status: "Success" | "Failed" | "Pending" | "Running";
  env: string;
  credentialId?: string | number;
}

export interface ClientSamplePayload {
  environment: string;
  queue: string;
  email?: string;
  aggregator?: string;
  processENV?: string;
  clientId?: string | number;
}

export interface RemoveFromQueuePayload {
  environment: string;
  email: string;
  queue: string;
}

export interface RetryClientSamplePayload {
  queue: string;
  email: string;
}
