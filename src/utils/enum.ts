export enum CustomerClass {
  FAMILY = "family",
  ENTHUSIASTIC = "enthusiastic",
  SATISFIED = "satisfied",
  UNSATISFIED = "unsatisfied",
  UPSET = "upset",
  UNCLASSIFIED = "unclassified",
  BLACKLISTED = "blacklisted",
  PROBONO = "probono",
  INFLIGHT = "inflight",
  UNTRACEABLE = "untraceable",
  FRIENDLY = "friendly",
  NA = "N/A",
  WARM_LEAD = "Warm_Lead",
}

export enum ApplicationStatus {
  NOT_STARTED = "Not Started",
  COMMENCED = "Commenced",
  HOLD = "Hold",
  EXPIRED = "Expired",
  PENDING = "Pending",
}

export enum PaymentStatus {
  UNPAID = "Unpaid",
  PAID = "Paid",
  PENDING = "Pending",
}

export enum Progress {
  ONBOARDING = "Onboarding",
  EMAIL_VERIFIED = "Email Verified",
  DOCUMENTS_ACCEPTED = "Documents Accepted",
  DOCUMENTS_DECLINED = "Documents Declined",
  CV_RESUME_UPLIFTED = "CV/Resume Uplifted",
  PAYMENT_INITIATED = "Payment Initiated",
  PLAN_SELECTED = "Plan Selected",
  FOLLOWED_ON_SOCIALS = "Followed on Socials",
  PAYMENT_CONFIRMED = "Payment Confirmed",
  LOGIN_CREDENTIALS_VERIFIED = "Login Credentials Verified",
  SAMPLE_RESULTS_DISPATCHED = "Sample Results Dispatched",
  SAMPLE_RESULTS_ACCEPTED = "Sample Results Accepted",
  PREFERENCES_UPDATED = "Preferences Updated",
  PREPARATORY_SESSION_ACCEPTED = "Preparatory Session Accepted",
  PREPARATORY_SESSION_DECLINED = "Preparatory Session Declined",
  APPLICATION_COMMENCED = "Application Commenced",
  APPLICATION_HOLD = "Application Hold",
  APPLICATION_EXPIRED = "Application Expired",
  OFFER_NOTIFICATION_RECEIVED = "Offer Notification Received",
  CAMPAIGN_ENDED = "Campaign Ended",
  PROSPECT = "Prospect",
}

export enum Role {
  GUEST = "guest",
  CLIENT = "client",
  PARTNER = "partner",
  SALES = "sales",
  CSE = "cse",
  COACH = "coach",
  ADMIN = "admin",
  PROBONO = "probono",
  TEST = "test",
  CUSTOMER = "customer",
  TECHNOLOGY = "technology",
  BUSINESS = "business",
  ASSISTANT = "assistant",
}

export enum AcceptedRole {
  GUEST = "guest",
  PARTNER = "partner",
  TEST = "test",
}

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  PREFER_NOT_TO_SAY = "Prefer Not to Say",
}

export enum SampleDispatchedStatus {
  PENDING = "Pending",
  DISPATCHED = "Dispatched",
  VIEWED = "Viewed",
  ACCEPTED = "Accepted",
}

export enum RevenueStatus {
  CAPITALIZED = "Capitalized",
  REFUNDED = "Refunded",
  PAID = "Paid",
  UNPAID = "Unpaid",
  AWAITING_PAYID = "AWAITING_PAYID",
}

export enum ReferrerStatus {
  PENDING = "PENDING",
  CLAIMED = "CLAIMED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum SocialPlatform {
  FACEBOOK = "F",
  LINKEDIN = "L",
  INSTAGRAM = "I",
  X = "X",
}

export enum Ability {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  EDIT = "edit",
  FULL = "full",
}



/**
 * Severity levels for Slack notifications (Mandatory)
 */
export enum SlackSeverity {
  INFO = "INFO",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
}

/**
 * System nodes that can generate notifications (Mandatory Mapping)
 */
export enum SlackNode {
  ACCESS_PROXY = "Access Proxy",
  ANALYTICS = "Analytics",
  AI = "Artificial intelligence",
  CODEBASE = "Codebase",
  DATA_STORE = "Data Store",
  DATABASE = "Database",
  DOMAIN_HOST = "Domain Host",
  FINANCE = "Finance",
  HOSTING_SERVER = "Hosting Server",
  HUMAN_RESOURCE = "Human Resource",
  LOAD_BALANCER = "Load Balancer",
  PAYMENT = "Payment",
  PROCESSING_SERVER = "Processing Server",
  TELEPHONY = "Telephony",
  MESSAGING = "Messaging",
  USER_MANAGEMENT = "User Management",
  APPLICATION = "Application",
  BACKGROUND_JOB = "Background Job",
}

/**
 * Host environments (Mandatory)
 */
export enum SlackLocation {
  LOCALHOST = "localhost",
  STAGING = "staging",
  PRODUCTION = "production",
}

/**
 * Providers or external services (Mapped per Node)
 */
export enum SlackProvider {
  // Access Proxy
  SMART_PROXY = "Smart Proxy",
  DECODO = "Decodo",
  PACKETSTREAM = "PacketStream",
  IP_ROYAL = "IP Royal",

  // Analytics
  CLARITY = "Clarity",

  // AI
  CHATGPT = "ChatGPT",
  GEMINI = "Gemini",
  DEEPSEEK = "DeepSeek",
  DIGITAL_OCEAN_AI = "Digital Ocean",

  // Codebase
  GITHUB = "GitHub",

  // Data Store
  FIREBASE = "Firebase",

  // Database
  MONGODB = "MongoDB",
  MYSQL = "MySQL",
  POSTGRESQL = "PostgreSQL",

  // Domain Host
  NAMECHEAP = "Namecheap",

  // Finance
  ZOHO_BOOKS = "Zoho Books",

  // Hosting Server
  VERCEL = "Vercel",
  RENDER = "Render",

  // Human Resource
  HUBSTAFF = "Hubstaff",

  // Load Balancer
  REDIS = "Redis",

  // Payment
  STRIPE = "Stripe",
  PAYPAL = "Paypal",
  PAYSTACK = "Paystack", // Adding Paystack as it's used in the codebase

  // Processing Server
  DIGITAL_OCEAN = "Digital Ocean",

  // Telephony
  JUSTCALL = "JustCall",

  // Messaging
  SLACK = "Slack",
  SENDGRID = "SendGrid",
  SYSTEM = "System",

  NA = "N/A",
}

/**
 * Event types for notifications
 */
export enum SlackEventType {
  USER_REGISTRATION = "USER_REGISTRATION",
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILURE = "PAYMENT_FAILURE",
  SUBSCRIPTION_UPDATE = "SUBSCRIPTION_UPDATE",
  SUBSCRIPTION_CANCEL = "SUBSCRIPTION_CANCEL",
  MANUAL_APPLICATION = "MANUAL_APPLICATION",
  AUTO_APPLICATION = "AUTO_APPLICATION",
  PROFILE_UPDATE = "PROFILE_UPDATE",
  PROFILE_CREATION = "PROFILE_CREATION",
  DOCUMENT_UPLOAD = "DOCUMENT_UPLOAD",
  DOCUMENT_UPDATE = "DOCUMENT_UPDATE",
  JOB_PREFERENCE_UPDATE = "JOB_PREFERENCE_UPDATE",
  APPLICATION_PAUSE = "APPLICATION_PAUSE",
  APPLICATION_RESUME = "APPLICATION_RESUME",
  REFERRAL_SIGNUP = "REFERRAL_SIGNUP",
  CONTACT_CREATION = "CONTACT_CREATION",
  MISSING_INFO = "MISSING_INFO",
  MISSING_INFO_SENT = "MISSING_INFO_SENT",
  MISSING_INFO_BULK_REMINDER = "MISSING_INFO_BULK_REMINDER",
  MISSING_INFO_TEMPLATE_PUBLISHED = "MISSING_INFO_TEMPLATE_PUBLISHED",
  ADMIN_ACTION = "ADMIN_ACTION",
  CRON_EXECUTION = "CRON_EXECUTION",
  ERROR_ALERT = "ERROR_ALERT",
  SYSTEM_NOTIFICATION = "SYSTEM_NOTIFICATION",
  USER_TRIGGERED = "USER_TRIGGERED",
  SUPPORT_MESSAGE = "SUPPORT_MESSAGE",
  SYSTEM_JOB = "SYSTEM_JOB",
}

export enum SlackChannel {
  CRY_WOLF = "C06JUAXP73P",
  CHANGE_REQUESTS = "C07BBMUMMFX",
  TOWN_CRIER = "C0603SL8QJ0",
  DEPLOYMENTS_LOGS = "C04FA0YU72A",
  // PAYMENTS = 'C077H6PBBFS',
  // VA = 'C04FYK43Q2D',
  VA = "C09HJKSS42E",
  FREE_TRIALS = "C08PWPTA8FM",
  PAID_SUB = "C077H6PBBFS", // Replace with actual paid-sub channel ID
  JOB_PIPELINE = "C0B9KDACX5G", // Testing Channel
  RETENTION_CTRL = "PENDING_RC_CHANNEL_ID", // Replace with #retention-controller channel ID
}

export enum Length {
  OTP = 6,
  REFERRAL_CODE = 12,
  PASSWORD = 15,
  // eslint-disable-next-line
  SALT = 12,
}

// Upload Document Enums
export enum UploadType {
  RESUME = "resume",
  COVER_LETTER = "coverletter",
  CERTIFICATE = "certificate",
  OTHER_DOCS = "otherDocs",
}

export enum UploadStatus {
  PENDING = "Pending",
  REVISED = "Revised",
  ACCEPTED = "Accepted",
  REJECTED = "Rejected",
}

export enum UploadSource {
  CLIENT = "client",
  ADMIN = "admin",
}

export enum CvType {
  NATIVE = "native",
  REFINED = "refined",
  EXTRACTED = "extracted",
  DEFAULT = "default",
}

// Application Enums
export enum ApplicationMode {
  ATTENDED = "Attended",
  UNATTENDED = "Unattended",
}

export enum ApplicationSourceType {
  GENERIC = "Generic",
  SEEK = "Seek",
  INDEED = "Indeed",
  LINKEDIN = "LinkedIn",
  JORA = "Jora",
  CAREERONE = "CareerOne",
  OTHER = "Other",
}

export enum SelectionType {
  AUTO = "Auto",
  MANUAL = "Manual",
  HYBRID = "Hybrid",
}

// Session Enums
export enum SessionType {
  SCREENING_PREPARATION = "screening_preparation",
  INTERVIEW_PANEL = "interview_panel",
  CAREER_CONSULTATION = "career_consultation",
}

export enum SessionStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  SCHEDULED = "scheduled",
  CANCELED = "canceled",
  UNCOMPLETED = "uncompleted",
}

export enum EvidenceType {
  FILE = "file",
  URL = "url",
  MULTIPLE = "multiple",
}

export enum PrepStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  VERIFIED = "verified",
}

export enum ValidationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXEMPT = "exempt",
}

// Schedule Day Enum
export enum DayOfWeek {
  SUNDAY = "sunday",
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
}

// Client Availability Session Type Enum
export enum ClientSessionType {
  SCREENING_PREPARATION = "screening_preparation",
  INTERVIEW_PANEL = "interview_panel",
  CAREER_CONSULTATION = "career_consultation",
}

// Client Availability Status Enum
export enum ClientAvailabilityStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

// Jobsite Credential Status Enum (S.ADM.19 / C.CLT.16)
// pending: client submitted, nothing forwarded yet
// forwarded: client clicked "I have completed the email forwarding process"
// accepted: admin clicked Accept (requires forwarded) — client can no longer
//   edit the email from here on. From this stage, admin can send as many
//   Test emails as they like (no status change) before making a Decision:
//   Approve or Reject.
// active: admin approved the mailbox (requires accepted) — sends the
//   approval email + Slack notification, the only state that clears the
//   application gate. Admin can Unapprove to revert to accepted.
// failed: rejected by admin at any stage, with one of the 5 closed reasons
export enum JobsiteCredentialStatus {
  PENDING = "pending",
  FORWARDED = "forwarded",
  ACCEPTED = "accepted",
  ACTIVE = "active",
  FAILED = "failed",
}

// Jobsite Credential Rejection Reason Enum — closed list, never free text
export enum JobsiteCredentialRejectionReason {
  DELEGATION_NOT_GRANTED = "Delegation not granted",
  MAILBOX_NOT_REACHABLE = "Mailbox not reachable",
  TWO_FA_BLOCKING = "2FA blocking delegated access",
  EMAIL_REJECTED_BY_JOBSITE = "Email rejected by jobsite",
  EMAIL_ALREADY_IN_USE = "Email already in use",
}

// Client Journey — the 7-phase client-facing progress model that replaces
// the old flat `Progress` enum above. `Progress`/`progress` on User is kept
// for backfilling legacy accounts only; new writes use ClientJourneyStep.
export enum ClientJourneyPhase {
  GETTING_STARTED = "getting-started",
  WELCOME = "welcome",
  TOOLKIT = "toolkit",
  FINAL_CHECKS = "final-checks",
  CAMPAIGN_LIVE = "campaign-live",
  CAMPAIGN_REVIEW = "campaign-review",
  CAMPAIGN_ENDED = "campaign-ended",
}

export enum ClientJourneyStepStatus {
  DONE = "done",
  SKIPPED = "skipped",
}

// Who performed the update that completed/reopened a step — "system" covers
// automatic backend triggers (payment webhook, doc approval, etc.) where no
// real actor is available to attribute the change to.
export enum ClientJourneyActorType {
  CLIENT = "client",
  SYSTEM = "system",
  ADMIN = "admin",
}

export enum ClientJourneySource {
  AUTOMATIC = "automatic",
  MANUAL = "manual",
}