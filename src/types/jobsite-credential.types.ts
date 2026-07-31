export type JobsiteCredentialStatus =
  | "pending"
  | "forwarded"
  | "accepted"
  | "active"
  | "failed";

export const JOBSITE_CREDENTIAL_REJECTION_REASONS = [
  "Delegation not granted",
  "Mailbox not reachable",
  "2FA blocking delegated access",
  "Email rejected by jobsite",
  "Email already in use",
] as const;

export type JobsiteCredentialRejectionReason =
  (typeof JOBSITE_CREDENTIAL_REJECTION_REASONS)[number];

export interface JobsiteCredential {
  id: string;
  clientId: string;
  email: string;
  generatedPassword: string | null;
  status: JobsiteCredentialStatus;
  rejectionReason: JobsiteCredentialRejectionReason | null;
  rejectionNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  forwardedAt: string | null;
  acceptedAt: string | null;
  testedAt: string | null;
  accountsCreatedAt: string | null;
  clientNotified: boolean;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  // The client's existing Submission Placement Controller (SPC) assignment,
  // from Credentials.AssignedCompletedName/Email — the staff member who
  // will manually create the jobsite accounts once this is Active.
  spcName: string | null;
  spcEmail: string | null;
}

export interface JobsiteCredentialCsvImportResult {
  created: number;
  skipped: { row: number; reason: string }[];
}
