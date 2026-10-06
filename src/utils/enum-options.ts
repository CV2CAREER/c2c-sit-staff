// Single source of truth for admin grid filters and Edit modal option lists.
//
// Rule: `value` is what the database stores and what the API expects.
// Never rename a value here without a data migration.
// `label` is display-only and is allowed to differ from `value` — see
// PROGRESS_OPTIONS, where "Plan Selected" is stored but shown as
// "Service Selected".

export interface EnumOption {
  value: string;
  label: string;
}

// ── Capitalized ────────────────────────────────────────────────────────────
// Values are used exactly as they exist in the codebase today. FLIGHT is kept
// selectable because existing client rows hold it and backend jobs// (clientWithNoApplicationReport.job.ts) query for it.
export const CAPITALIZED_OPTIONS: EnumOption[] = [
  { value: "HOLD", label: "HOLD" },
  { value: "FLIGHT", label: "FLIGHT" },
  { value: "EMPLOYED", label: "EMPLOYED" },
];

// ── Customer Class ─────────────────────────────────────────────────────────
// Client behaviour classification. Deliberately NOT the same as PLAN_OPTIONS,
// even though the design mockup showed plan names here.
export const CUSTOMER_CLASS_OPTIONS: EnumOption[] = [
  { value: "family", label: "Family" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "satisfied", label: "Satisfied" },
  { value: "unsatisfied", label: "Unsatisfied" },
  { value: "upset", label: "Upset" },
  { value: "unclassified", label: "Unclassified" },
  { value: "blacklisted", label: "Blacklisted" },
  { value: "probono", label: "Probono" },
  { value: "inflight", label: "Inflight" },
  { value: "untraceable", label: "Untraceable" },
  { value: "friendly", label: "Friendly" },
  { value: "N/A", label: "N/A" },
  { value: "Warm_Lead", label: "Warm Lead" },
];

// ── Plan ───────────────────────────────────────────────────────────────────
// Array order is the display order used by the pricing tables.
export const PLAN_OPTIONS: EnumOption[] = [
  { value: "Emerald", label: "Emerald" },
  { value: "Bronze", label: "Bronze" },
  { value: "Silver", label: "Silver" },
  { value: "Gold", label: "Gold" },
  { value: "Platinum", label: "Platinum" },
  { value: "Coral", label: "Coral" },
];

// ── Sign up as ─────────────────────────────────────────────────────────────
// Values mirror the SignUpAs enum in staff-backend src/utils/enum.ts.
export const SIGN_UP_AS_OPTIONS: EnumOption[] = [
  { value: "Job_Seeker", label: "Job Seeker" },
  { value: "Employee", label: "Employee" },
  { value: "Channel_Partner", label: "Channel Partner" },
  { value: "Ambassador", label: "Ambassador" },
];

// ── Progress ───────────────────────────────────────────────────────────────
// 28 stages, in journey order. Mirrors the Progress enum in staff-backend
// src/utils/enum.ts.
//
// The three legacy values "Signed Up", "Preference Inserted" and "Uploaded Doc"
// used to be offered here but are NOT in the backend enum, so the database
// rejected them. They have been removed.
export const PROGRESS_OPTIONS: EnumOption[] = [
  { value: "Onboarding", label: "Onboarding" },
  { value: "Email Verified", label: "Email Verified" },
  { value: "Documents Accepted", label: "Documents Accepted" },
  { value: "Documents Declined", label: "Documents Declined" },
  { value: "CV/Resume Uplifted", label: "CV/Resume Uplifted" },
  { value: "Preferences Updated", label: "Preferences Updated" },
  { value: "Plan Selected", label: "Service Selected" },
  { value: "Service Selection", label: "Service Selection" },
  { value: "Payment Initiated", label: "Payment Initiated" },
  { value: "Payment Confirmed", label: "Payment Confirmed" },
  { value: "Login Credentials Verified", label: "Login Credentials Verified" },
  { value: "Followed on Socials", label: "Followed on Socials" },
  { value: "Social Follow Verification", label: "Social Follow Verification" },
  { value: "Jobsite Verification", label: "Jobsite Verification" },
  { value: "CV Variant Dispatch", label: "CV Variant Dispatch" },
  { value: "Sample Results Dispatched", label: "Sample Results Dispatched" },
  { value: "Sample Results Accepted", label: "Sample Results Accepted" },
  { value: "Sample Results Review", label: "Sample Results Review" },
  { value: "Preparatory Session Accepted", label: "Preparatory Session Accepted" },
  { value: "Preparatory Session Declined", label: "Preparatory Session Declined" },
  { value: "Preparatory Session", label: "Preparatory Session" },
  { value: "Application Commenced", label: "Application Commenced" },
  { value: "Application Hold", label: "Application Hold" },
  { value: "Application Expired", label: "Application Expired" },
  { value: "Job Applications", label: "Job Applications" },
  { value: "Offer Notification Received", label: "Offer Notification Received" },
  { value: "Campaign Ended", label: "Campaign Ended" },
  { value: "Prospect", label: "Prospect" },
];

// ── Application Status ─────────────────────────────────────────────────────
// Mirrors ApplicationStatus in staff-backend src/utils/enum.ts
export const APPLICATION_STATUS_OPTIONS: EnumOption[] = [
  { value: "Not Started", label: "Not Started" },
  { value: "Commenced", label: "Commenced" },
  { value: "Hold", label: "Hold" },
  { value: "Expired", label: "Expired" },
  { value: "Pending", label: "Pending" },
];

// ── Prep Session Status ────────────────────────────────────────────────────
// The model column is `0 | 1 | 2`, so `value` is the digit as a string and the
// digit is what gets sent. See Step 7c for the number conversion.
export const PREP_SESSION_STATUS_OPTIONS: EnumOption[] = [
  { value: "0", label: "Not booked" },
  { value: "1", label: "Booked" },
  { value: "2", label: "Completed" },
];

// ── Sample Dispatched ──────────────────────────────────────────────────────
// Mirrors SampleDispatchedStatus in staff-backend src/utils/enum.ts
export const SAMPLE_DISPATCHED_OPTIONS: EnumOption[] = [
  { value: "Pending", label: "Pending" },
  { value: "Dispatched", label: "Dispatched" },
  { value: "Viewed", label: "Viewed" },
  { value: "Accepted", label: "Accepted" },
];

// ── Revenue ────────────────────────────────────────────────────────────────
// Mirrors RevenueStatus in staff-backend src/utils/enum.ts. NOT the same field
// as the `paymentStatus` grid column (Unpaid/Paid/Pending) in cpanColumns.tsx.
export const REVENUE_OPTIONS: EnumOption[] = [
  { value: "Capitalized", label: "Capitalized" },
  { value: "Refunded", label: "Refunded" },
  { value: "Paid", label: "Paid" },
  { value: "Unpaid", label: "Unpaid" },
  { value: "AWAITING_PAYID", label: "AWAITING_PAYID" },
];

// --- Gender ---------------------------------------------------------------
// Values mirror the PostgreSQL enum enum_users_gender exactly:
// Male, Female, Prefer Not to Say. The DB rejects anything else, so these
// strings must not be re-cased or reworded.
export const GENDER_OPTIONS: EnumOption[] = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Prefer Not to Say", label: "Prefer Not to Say" },
];

// --- Heritage -------------------------------------------------------------
// Source: SPR-21-01 Design HTML, the Heritage select in the Personal
// Information section of "Edit Customer Info Modal on Users Mgt II". Stored as
// free text in a varchar(255) column. "Other" is an explicit catch-all so
// reporting can group it.
export const HERITAGE_OPTIONS: EnumOption[] = [
  { value: "Nigerian", label: "Nigerian" },
  { value: "Indian", label: "Indian" },
  { value: "Other", label: "Other" },
];

// --- Communication --------------------------------------------------------
// Preferred contact method. Matches the simulation SPR-21-01.
export const COMMUNICATION_OPTIONS: EnumOption[] = [
  { value: "Email", label: "Email" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Phone", label: "Phone" },
];

// --- SPR-21-41-013 Journey: modal-scoped option lists -----------------------
// These are deliberately narrower than REVENUE_OPTIONS and
// SAMPLE_DISPATCHED_OPTIONS above. Those two mirror the database enums, which
// hold legacy values (Capitalized, Refunded, AWAITING_PAYID / Viewed,
// Accepted) that the ticket does not list. The admin dropdowns offer only the
// two values the ticket requires.
//
// Do NOT reuse the enum-wide lists for these dropdowns: an existing row holding
// a legacy value would then have no matching option, and saving the modal for
// an unrelated reason would silently overwrite it. The modal handles that case
// by rendering the stored value as a disabled option instead.

// AC5: "only offers Paid or Unpaid".
export const MODAL_REVENUE_OPTIONS: EnumOption[] = [
  { value: "Paid", label: "Paid" },
  { value: "Unpaid", label: "Unpaid" },
];

// AC4: "only offers Pending or Dispatched".
export const MODAL_SAMPLE_DISPATCHED_OPTIONS: EnumOption[] = [
  { value: "Pending", label: "Pending" },
  { value: "Dispatched", label: "Dispatched" },
];
