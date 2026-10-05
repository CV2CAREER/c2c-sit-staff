// Assurance result for a submission (SPR-21-58-001), shared by manual_applications
// and applications. The server stamps who and when; the client only sends the result.
export const ASSURANCE_STATUSES = ["ASSURED", "FAILED"] as const;
export type AssuranceStatus = (typeof ASSURANCE_STATUSES)[number];

export type AssuranceFields = {
  AssuranceStatus: AssuranceStatus | null;
  AssuredBy: string | null;
  AssuranceDate: Date | null;
};

/** Accepts "ASSURED" | "FAILED" (any case), or null/""/undefined meaning "clear". */
export const parseAssuranceStatus = (raw: unknown): AssuranceStatus | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if ((ASSURANCE_STATUSES as readonly string[]).includes(value)) {
    return value as AssuranceStatus;
  }
  throw new Error(`assuranceStatus must be one of ${ASSURANCE_STATUSES.join(", ")} or null`);
};

/**
 * Columns to write for a decision. A result stores the staff member and the time of
 * that decision (a later change overwrites them); clearing blanks all three.
 */
export const buildAssuranceUpdate = (
  status: AssuranceStatus | null,
  actorName: string,
): AssuranceFields =>
  status
    ? { AssuranceStatus: status, AssuredBy: actorName, AssuranceDate: new Date() }
    : { AssuranceStatus: null, AssuredBy: null, AssuranceDate: null };
