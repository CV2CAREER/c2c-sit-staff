export type JobsiteVerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "rejected"
  | "exempt";

export interface JobsiteVerification {
  id: string;
  clientId: string;
  jobsiteId: string;
  country: string;
  status: JobsiteVerificationStatus;
  proofFileRef?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectReason?: string | null;
  exemptReason?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
    country?: string;
  };
}

export interface JobsiteConfig {
  id: string;
  jobsiteId: string;
  country: string;
  required: boolean;
  videoGuideUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobsiteRejectReason {
  id: string;
  reason: string;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobsiteVerificationQueueResponse {
  verifications: JobsiteVerification[];
  total: number;
  page: number;
  totalPages: number;
  stats: {
    pendingCount: number;
    approvedCount: number;
    totalClients: number;
  };
}

export interface ClientJobsiteVerificationResponse {
  client: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    country?: string;
  };
  verifications: JobsiteVerification[];
  configs: JobsiteConfig[];
  isExempt: boolean;
  pendingCount: number;
  verifiedCount: number;
}
