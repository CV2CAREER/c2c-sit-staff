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
  | "pc";

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


