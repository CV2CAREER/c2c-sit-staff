import { EvidenceType, PrepStatus, SessionStatus, SessionType, ValidationStatus } from "../utils/enum";

/**
 * Time structure for session start and end times
 */
export interface SessionTime {
  startTime: string;
  endTime: string;
}

/**
 * Evidence link structure for files and URLs
 */
export interface EvidenceLink {
  url: string;
  type: "file" | "url";
  fileName?: string;
  uploadedAt?: Date;
  uploadedBy?: string;
}

/**
 * Evidence structure containing all evidence items
 */
export interface Evidence {
  files: EvidenceLink[];
  links: EvidenceLink[];
  notes?: string;
  submittedAt?: Date;
  requiresEvidence: boolean;
  validationStatus: ValidationStatus;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationNotes?: string;
}

/**
 * Grading structure for session evaluation
 */
export interface Grading {
  score?: number;
  maxScore?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
  criteria?: GradingCriteria[];
}

/**
 * Individual grading criteria item
 */
export interface GradingCriteria {
  name: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

/**
 * Session creation attributes
 */
export interface SessionCreationAttributes {
  chatSessionId?: string;
  sessionType: SessionType;
  sessionStatus?: SessionStatus;
  time?: SessionTime;
  duration?: number;
  description?: string;
  meetingLink?: string;
  scheduleId?: string;
  grading?: Grading;
  clientId?: string;
  coachId?: string;
  timezone?: string;
  eventId?: string;
  evidenceLink?: string;
  evidenceType?: EvidenceType | null;
  prepStatus?: PrepStatus;
  evidence?: Evidence;
  requiresEvidence?: boolean;
  validationStatus?: ValidationStatus;
  validationNotes?: string;
  validatedAt?: Date;
  validatedBy?: string;
  prepCompletedAt?: Date;
}