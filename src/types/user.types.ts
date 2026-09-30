/**
 * StaffRole — the full set of staff roles recognized by the frontend.
 *
 * ⚠️  Backend-supported roles (login permitted): admin | coach | assistant
 * All other roles will receive a 403 Forbidden from the backend login endpoint
 * until the backend team enables them.
 */
export type StaffRole =
  // ── Live (backend-permitted) ─────────────────────────────────────────────
  | "admin"
  | "coach"
  | "assistant"
  // ── Pending backend activation ───────────────────────────────────────────
  | "partner"
  | "sales"
  | "customer" // CSE
  | "tpc"
  | "client"
  | "guest"
  | "test"
  | "pc"
  | "cec";

export type IUser = {
  _id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive?: boolean;
  isViewingAsUser?: boolean;
  viewedByUserEmail?: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ReferrerType = {
  referrer: string;
  status: string;
};

export type ProfileType = {
  aggregators: any[];
};

export interface IUserDetail {
  _id: string;
  userSessionsMilestones: {
    documentAccepted: boolean;
  }[];
  progress: string;
  gender: string;
  firstName: string;
  lastName: string;
  email: string;
  middleName: string;
  paymentStatus: string;
  status: string;
  totalAmountPaid: number;
  updatedBy: string | undefined;
  revenue: string;
  referrer: ReferrerType | undefined;
  profileHistories: any[];
  service_history: any[];
  isDeleted: boolean;
  heritage: string;
  country: string;
  emailVerified: boolean;
  isEmailVerified: boolean;
  isDocumentUploaded: boolean;
  isDocumentApproved: boolean;
  isUserSubscribed: boolean;
  plan: null | any;
  role: StaffRole | any;
  profile: ProfileType | undefined | null;
  phoneNumber: string | undefined | null;
  currentCityOfResidence: string | null | undefined;
  isAmbassador?: boolean;
}


