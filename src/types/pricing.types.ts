// c2c-staff-rft/src/types/pricing.types.ts
export interface PricingLocation {
  _id: string;
  currencyCode: string;
  currencySymbol: string;
  multiplier: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PricingPlan {
  _id: string;
  title: string;
  tier: string;
  price: number;
  jobApplications: number;
  cvResumeRequests: number;
  validityPeriod: string;
  subscriptionBreak: string;
  profileLimit: number;
  isActive: boolean;
  locationIds: string[];
  description?: string;
  extra?: string;
  styleData?: {
    background?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateMultiplierPayload {
  locationId: string;
  multiplier: string;
}

export interface UpdatePlanPayload {
  planId: string;
  updates: Partial<PricingPlan>;
}
