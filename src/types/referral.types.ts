export type ReferralStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'AGGREGATED';
export type ReferralType = 'USER_REFERRAL' | 'PARTNER_REFERRAL' | 'SALES_REFERRAL' | 'REGULAR_REFERRAL' | 'CLAIM_REFERRAL';

export interface IReferredUser {
  email: string;
  name?: string;
  status: ReferralStatus;
  role?: string;
  isClient?: boolean;
  paymentStatus?: string;
  source?: string;
  createdAt?: string;
  type?: ReferralType;
  firstName?: string;
  lastName?: string;
}

export interface IReferral {
  _id: string;
  type: ReferralType;
  referrerEmail: string;
  referrerName: string;
  referralCode: string;
  userId: string | null;
  paymentStatus: string;
  businessName: string;
  referredUsers: IReferredUser[];
  count: number;
  totalAmountOwed: number;
  status: ReferralStatus;
  createdAt: string;
  lastReferralDate: string;
  source: string;
  archived?: boolean;
}

export interface IReferralSummary {
  users: IReferral[];
  total: number;
}

export interface IAdminReferralActionPayload {
  id?: string;
  referralID?: string;
  action?: 'APPROVE_CLAIM' | 'DECLINE_CLAIM' | 'UPDATE_PAYMENT_STATUS';
  reason?: string;
  variance?: string;
  archived?: boolean;
  hard?: boolean;
  undo?: boolean;
  [key: string]: any;
}
