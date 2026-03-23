import { ReferrerStatus } from "../utils/enum";
import { IUser } from "./user.types";

export interface IReferrer {
  id: string;
  userId: string;
  user?: IUser;
  referrer?: string;
  status: ReferrerStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Referral Summary Response
export interface IReferralSummary {
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  referralLink: string;
}

// Referral with user details
export interface IReferralWithUser {
  id: string;
  status: ReferrerStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: {
      url?: string;
      key?: string;
      filename?: string;
    } | null;
  };
}

// Claim Referral Request
export interface IClaimReferralRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

// Claim Referral Response
export interface IClaimReferralResponse {
  success: boolean;
  message: string;
  referrerName?: string;
}

// Send Referral Email Request
export interface ISendReferralEmailRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

// Send Referral Email Response
export interface ISendReferralEmailResponse {
  success: boolean;
  message: string;
  referralLink: string;
}

// Bulk Upload Referral Item
export interface IBulkReferralItem {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
}

// Bulk Upload Referral Response
export interface IBulkUploadReferralResponse {
  success: boolean;
  message: string;
  totalSent: number;
  failed: number;
  failedEmails: string[];
}
