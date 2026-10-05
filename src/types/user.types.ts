import {
  Ability,
  AcceptedRole,
  ApplicationStatus,
  Perception,
  Gender,
  PaymentStatus,
  Progress,
  ReferrerStatus,
  RevenueStatus,
  Role,
  SampleDispatchedStatus,
  SocialPlatform,
} from "../utils/enum";
import { ICustomerService } from "./customer-service.types";
import { IPartner } from "./partner.types";
import { IProfile } from "./profile.types";
import { IReferrer } from "./referrer.types";
import { ISalesConsultant } from "./sales-consultant.types";
import { ResumeReview, ServiceHistory } from "./userdocument.types";
import { ILocation } from "./location.types";

export interface IUser {
  id: string;
  uniqueId?: string;
  zohoId?: string;

  email: string;

  firstName: string;
  lastName: string;
  middleName?: string;

  gender: Gender;

  businessName?: string;

  staffPerception: Perception;
  auditRequired?: boolean;
  auditFindings?: string | null;

  phoneNumber?: string;
  whatsappNumber?: string;

  profilePicture?: ProfilePicture;

  socials: SocialPlatform[];

  country: string;

  slackId?: string;

  referrer?: IReferrer;

  promotionalCount: number;
  numberOfReferralsBeforePromo: number;
  numberOfFreePromo: number;
  numberOfFreePromoCount: number;

  review: ResumeReview[];

  serviceHistory: ServiceHistory[];

  isApplicationStarted: boolean;
  resetTokenVerified: boolean;

  applicationStatus: ApplicationStatus;

  paymentStatus: PaymentStatus;

  totalAmountPaid: number;

  prepSessionStatus: 0 | 1 | 2;

  isSampleResultsAccepted?: boolean;

  isEmailVerified: boolean;

  isActive: boolean;

  isUserSubscribed: boolean;

  isDocumentApproved: boolean;

  isDocumentUploaded: boolean;

  hasOpenedJobsiteProfile: boolean;

  updatedBy: string;

  progress: Progress;

  profileId?: string;
  secondaryProfileId?: string;

  secondaryProfile?: IProfile;

  role: Role;

  manager: boolean;

  agreeToTerms: boolean;

  permissions: PermissionData[];

  accessToken?: string;

  bankName?: string;
  bsbCode?: string;
  bankAccountNo?: string;
  bankAccountName?: string;

  isSampleDispatched: SampleDispatchedStatus;

  returnCount: number;

  isSampleAccepted?: boolean;

  stars: number;

  promotionCode?: string;

  allowFreeBeforeReferal: boolean;

  userSessionsMilestones: Milestone[];

  currentCityOfResidence?: string;

  selectedPlan?: string;

  plan?: string;

  adminPassword?: string;

  revenue: RevenueStatus;

  partner?: IPartner;

  salesConsultant?: ISalesConsultant;

  profile?: IProfile;

  customerService?: ICustomerService;

  locationId?: string;
  location?: ILocation;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IUserRegistration {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: AcceptedRole;
  gender: Gender;
  voiceNumber: string;
  whatsappNumber: string;
  country: string;
  currentCityOfResidence: string;
  referrer?: string;
  promotionCode?: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface ReferrerData {
  referrer?: string;
  status: ReferrerStatus;
}

export interface PermissionData {
  resourceId: number; // Foreign key to resources table
  ability: Ability[];
}

export interface Milestone {
  planId?: string;
  emailVerified: boolean;
  documentAccepted: boolean;
  userSubscribed: boolean;
  planSelected: boolean;
  paymentConfirmed: boolean;
  jobsiteVerified: boolean;
  sampleResultsReviewed: boolean;
  preparatorySession: boolean;
  jobApplied: boolean;
}

export interface ProfilePicture {
  url?: string;
  key?: string;
  filename?: string;
  [key: string]: any;
}

export interface ILoginOptions {
  email: string;
  password: string;
}

export interface IUserUpdate {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: Gender;
  businessName?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  country?: string;
  currentCityOfResidence?: string;
  profilePicture?: ProfilePicture;
  socials?: SocialPlatform[];
  slackId?: string;
  bankName?: string;
  bsbCode?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}
