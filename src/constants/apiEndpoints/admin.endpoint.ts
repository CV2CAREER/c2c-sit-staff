export const ADMIN_STATS = "/api/v1/admin/analytics";
export const ADMIN_APPLICATION_STATS = "/api/v1/admin/analytics"; // Both maps to analytics in v1
export const ADMIN_CLIENT_ALLOCATION = "/api/v1/admin/in-flight/staff"; // Closest match for staff list
export const ADMIN_CLIENT_MILESTONE_STATS = "/api/v1/admin/analytics/milestones"; // Note: Might need backend update
export const ADMIN_ONBOARDED_CLIENTS = "/api/v1/admin/analytics/onboarded"; // Note: Might need backend update
export const ADMIN_JOBSITE_STATS = "/api/v1/admin/analytics/jobsites"; // Note: Might need backend update
export const ADMIN_INFLIGHT_CLIENTS = "/api/v1/admin/in-flight";
export const ADMIN_APPLICATION_SERIES = "/api/v1/admin/analytics/series";
export const ADMIN_APPLICATION_CHART_DATA = "/api/v1/admin/analytics/series";
export const ADMIN_USERS = "/api/v1/admin/users";
export const ADMIN_USERS_FULL_NAME = "/api/v1/admin/users/full-name";
export const ADMIN_AGGREGATORS = "/api/v1/aggregator";
export const ADMIN_APPLICATIONS = "/api/v1/admin/applications";
export const ADMIN_QUESTIONS = "/api/v1/admin/interview-prep";
export const ADMIN_FOLLOWERS = "/api/v1/analytics/followers";
export const ADMIN_ANSWER_MODE = "/api/v1/admin/bot-toggle"; // Both share the same endpoint in v1
export const ADMIN_TABLE_MANAGER = "/api/v1/admin/schema";
export const ADMIN_SCHEMA_EXPAND = "/api/v1/admin/schema/expand";
export const ADMIN_SCHEMA_COLUMNS = (tableName: string) => `/api/v1/admin/schema/${tableName}/columns`;
export const ADMIN_SCHEMA_DELETE_COLUMN = (tableName: string, columnName: string) => `/api/v1/admin/schema/${tableName}/columns/${columnName}`;
export const ADMIN_THROTTLE = "/api/v1/admin/throttle";
export const ADMIN_STATUS = "/api/v1/admin/status";
export const ADMIN_JOBSITES = "/api/v1/aggregator";

export const ADMIN_AUDIT_TRAIL = "/api/v1/audit-trail";
export const ADMIN_AUDIT_TRAIL_PASSKEY = "/api/v1/audit-trail/passkey";
export const ADMIN_AUDIT_TRAIL_PASSKEY_VERIFY = "/api/v1/audit-trail/passkey/verify";

export const ADMIN_LOCATIONS = "/api/v1/admin/locations";
export const ADMIN_PRICING = "/api/v1/admin/pricing";
export const ADMIN_PRICING_PLANS = "/api/v1/admin/pricing-plans";
export const ADMIN_USER_INFO = (id: string | number) => `/api/v1/admin/user-info/${id}`;

export const USER_STAFF = "/api/v1/user/staff";
export const USER_ALL = "/api/v1/user/all";


export const ADMIN_CAMPAIGN_SHEET = "/api/v1/admin/campaign/sheet";
export const ADMIN_CAMPAIGN_SHEET_UPDATE = "/api/v1/admin/campaign/sheet/update";
export const ADMIN_CAMPAIGN_SHEET_UPDATE_SINGLE = "/api/v1/admin/campaign/sheet/update-single";
export const ADMIN_CAMPAIGN_SHEET_DELETE = "/api/v1/admin/campaign/sheet/delete";
export const ADMIN_CAMPAIGN_SHEET_UPDATE_KEYWORDS = "/api/v1/admin/keywords/update";
export const ADMIN_CLIENT_SAMPLE = "/api/v1/admin/samples";
export const ADMIN_CLIENT_SAMPLE_USERS = "/api/v1/admin/client-sample/users";
export const ADMIN_CLIENT_SAMPLE_TABLE = "/api/v1/admin/client-sample/table";
export const ADMIN_CAMPAIGN_CLIENT_INSIGHTS = (id: string | number) => `/api/v1/campaigns/users/${id}/profile`;
export const ADMIN_CAMPAIGN_COUNT_APPLICATIONS = "/api/v1/admin/campaign/sheet/count-applications";

// User specific actions
export const ADMIN_USER_DETAIL = (id: string) => `/api/v1/user/${id}`;

export const ADMIN_DISPATCH_CLIENT = "/api/v1/user/dispatch-client";
export const ADMIN_USER_EXTRACT_CV = "/api/v1/admin/extract-cv-data";
export const ADMIN_UPDATE_USER_PROGRESS = "/api/v1/admin/user-progress";
export const SHORTEN_WORDS = "/api/v1/shortenWords";

// Dropdown/Schema management
export const ADMIN_DROPDOWN = "/api/v1/admin/dropdown";
export const ADMIN_CLIENT_JOBSITE = "/api/v1/admin/client-jobsite";
export const ADMIN_UPGRADE_PLAN = "/api/v1/admin/upgrade-plan";
export const ADMIN_PLANS = "/api/v1/admin/plans";
export const ADMIN_ACCOUNT_ACTION = "/api/v1/admin/account-action";
export const ADMIN_DELETE_USER = "/api/v1/admin/users";
export const ADMIN_APPLICATION_EMAILS = "/api/v1/admin/applications/emails";
export const ADMIN_DOCUMENTS = "/api/v1/document";
export const ADMIN_UPLOAD_DOCUMENTS = "/api/v1/admin/documents/upload";
export const ADMIN_DOCUMENTS_GET_SIGNED_URL = "/api/v1/admin/documents/get-signed-url";
export const ADMIN_DOCUMENT_REVIEW = "/api/v1/admin/documents/document-review";
export const ADMIN_USER_PREFERENCES = "/api/v1/admin/users/preferences";
export const ADMIN_JOB_PREFERENCES = "/api/v1/admin/job-preferences";
export const ADMIN_ACCESS_LEVELS = "/api/v1/admin/access-levels";
export const ADMIN_PERSONA_RULES = "/api/v1/admin/persona-rules";
export const ADMIN_UPDATE_USER_PREFERENCES = "/api/v1/admin/users/update-preferences";
export const ADMIN_PROFILE_HISTORY = (userId: string) => `/api/v1/admin/profile-history/${userId}`;
export const ADMIN_REFERRAL = "/api/v1/referrals";
export const ADMIN_AGGREGATED_REFERRALS = "/api/v1/referrals";
export const ADMIN_REFERRAL_HISTORY = "/api/v1/admin/referral";
export const ADMIN_REGEX_QUEUE = "/api/v1/admin/regexqueue";
export const ADMIN_NOTIFY_ADMIN = "/api/v1/notify-admin";
export const ADMIN_UPLOAD_FILES = "/api/v1/uploadfiles";
export const ADMIN_USER_PROFILE = "/api/v1/userprofile";
export const ADMIN_COACHING_SESSION = "/api/v1/admin/coaching/session";
export const ADMIN_EXTRACT_CV_DATA_POINTS = "/api/v1/uploads";
export const ADMIN_REVERSE_USER_ID = "/api/v1/admin/userId";
export const ADMIN_CV_REVAMP = "/api/v1/admin/cv-revamp";
export const ADMIN_SHEETS_TEMPLATES = "/api/v1/admin/sheets/templates";
export const SHEETS_API = "/api/v1/sheets";
export const AGGREGATOR_LOCATIONS = "/api/v1/aggregator-locations";
export const COUNTRY_INFO = "/api/v1/country-info";
export const ADMIN_SLACK_QUEUE = "/api/v1/aggregator/slack/queue";
export const ADMIN_RESOURCES = "/api/v1/resources";
export const ADMIN_PROMOTION = "/api/v1/admin/promos";
export const ADMIN_PROMOTION_WITH_ID = (id: string) => `/api/v1/admin/promos?id=${id}`;

// User Management Endpoints - Temidayo
export const ADMIN_FEATURE_TITLES = "/api/v1/user-management/features";
export const ADMIN_USER_PREFERENCES_V2 = (userId: string) => `/api/v1/user-management/users/${userId}/preferences`;
export const ADMIN_USER_PREFERENCES_HISTORY = (userId: string) => `/api/v1/user-management/users/${userId}/preferences/history`;
export const ADMIN_USER_REFERRALS = (userId: string) => `/api/v1/user-management/users/${userId}/referrals`;
export const ADMIN_USER_DOCUMENTS = (userId: string) => `/api/v1/user-management/users/${userId}/documents`;
export const ADMIN_USER_PROFILE_SAFE = (userId: string) => `/api/v1/user-management/users/${userId}/profile`;
export const ADMIN_USER_PROGRESS = (userId: string) => `/api/v1/user-management/users/${userId}/progress`;

// User Campaign Management Page - Temidayo
export const ADMIN_CAMPAIGN = "/api/v1/campaigns/clients";
export const ADMIN_SEND_PREFERENCE_EMAIL = "/api/v1/campaigns/preferences/notify";
export const ADMIN_SEND_PREFERENCE_EMAIL_BY_ID = "/api/v1/campaigns/preferences/notify"; 
export const ADMIN_GENERATE_PASSWORD = "/api/v1/campaigns/credentials/generate-password";
export const ADMIN_DISPATCH_CREDENTIALS = "/api/v1/campaigns/credentials/dispatch";
export const ADMIN_BOT_CONTROL = "/api/v1/campaigns/aggregators/toggle";
export const ADMIN_CAMPAIGN_JOBS_EXTRACT = "/api/v1/campaigns/jobs/extract";
export const ADMIN_CAMPAIGN_JOBS_SAVE = "/api/v1/campaigns/jobs/save";
export const ADMIN_UPLOADS_GENERATE_KEYWORDS = "/api/v1/uploads/generate-keywords";
export const ADMIN_CAMPAIGN_GET_CLIENTS = "/api/v1/campaigns/clients";
export const ADMIN_DISPATCH_SAMPLE = (clientId: string ) => `/api/v1/campaigns/clients/${clientId}/dispatch-samples`;
export const ADMIN_ASSIGN_VA = "/api/v1/campaigns/va/assign";

// Blog Endpoints
export const ADMIN_BLOG = "/api/v1/admin/blog";
export const ADMIN_BLOG_WITH_ID = (id: string) => `/api/v1/admin/blog?id=${id}`;
export const ADMIN_BLOG_DETAILS = "/api/v1/admin/blog/id";
export const ADMIN_BLOG_STATS = "/api/v1/admin/blog/stats";

// Admin Prompts Endpoints
const normalizeAiModulePath = (basePath: string) => basePath.replace(/^prompts\//, "");
export const ADMIN_PROMPTS_BASE = (basePath: string) => `/api/v1/admin/ai/${normalizeAiModulePath(basePath)}`;
export const ADMIN_PROMPTS_SIMULATION = (basePath: string) => `/api/v1/admin/ai/${normalizeAiModulePath(basePath)}/simulation`;
export const ADMIN_PROMPTS_QUEUE = (basePath: string) => `/api/v1/admin/ai/${normalizeAiModulePath(basePath)}/queue`;
export const ADMIN_PROMPTS_VCS = (basePath: string) => `/api/v1/admin/ai/${normalizeAiModulePath(basePath)}/vcs`;
export const ADMIN_PROMPTS_CV_STYLE = `/api/v1/admin/ai/cv-ai/style`;

// Admin Training Tracker Endpoints
export const ADMIN_TRAINING_TRACKER = "/api/v1/training-tracker";
export const ADMIN_TRAINING_TRACKER_SESSION = "/api/v1/training-tracker/sessions";
export const ADMIN_COACHES_VARIANT = "/api/v1/coach";

// Coach Specific Endpoints
export const COACH_SESSIONS = "/api/v1/coach/sessions";
export const COACH_SESSION_DETAIL = (id: string) => `/api/v1/coach/sessions/${id}`;
export const COACH_SESSION_COMPLETE = (id: string) => `/api/v1/coach/sessions/${id}/complete`;
export const COACH_ME = "/api/v1/coach/me";
export const COACH_SCHEDULES = "/api/v1/schedules";
export const COACH_SCHEDULE_DETAIL = (id: string) => `/api/v1/schedules/${id}`;

// Admin CR Tracking Endpoints
export const ADMIN_CR_TRACKING = "/api/v1/admin/trackers/cr";
export const ADMIN_CR_TRACKING_OPTIONS = "/api/v1/admin/trackers/cr/options";
export const ADMIN_CR_TRACKING_MODIFY = "/api/v1/admin/trackers/cr/modify";
export const ADMIN_CR_TRACKING_RESTORE = "/api/v1/admin/trackers/cr/restore";
export const ADMIN_CR_TRACKING_DELETE = "/api/v1/admin/trackers/cr/delete";
export const ADMIN_CR_TRACKING_HISTORY = "/api/v1/admin/trackers/cr/history";
export const ADMIN_SYSTEM_LOGS = "/api/v1/admin/system/logs";
export const ADMIN_SYSTEM_LOGS_EXPORT = "/api/v1/admin/system/logs/export/csv";
export const ADMIN_CR_TRACKING_EOT = "/api/v1/admin/trackers/cr/eot";
export const ADMIN_CR_TRACKING_NOTIFY_NIL = "/api/v1/admin/trackers/cr/notify-nil";

// slack management
export const ADMIN_SLACK_MANAGE = "/api/v1/slack-manage";
export const ADMIN_SLACK_MANAGE_WITH_ID = (id: string) => `/api/v1/slack-manage/${id}`;
export const ADMIN_CR_TRACKING_DOCUMENT_UPLOAD = "/api/v1/admin/documents/upload";
export const ADMIN_CR_TRACKING_VALIDATE_URL = "/api/v1/admin/documents/validate-and-upload-url";
export const ADMIN_CHATBOT_TRAIN = "/api/v1/admin/chatbot/train";
export const ADMIN_CHATBOT_LOGS = "/api/v1/admin/chatbot/logs";
export const ADMIN_SUPPORT_DESK = "/api/v1/admin/support";
export const ADMIN_SUPPORT_DESK_MESSAGES = (sessionId: string) =>
  `/api/v1/admin/support/${sessionId}/messages`;
export const ADMIN_SUPPORT_DESK_ASSIGN = "/api/v1/admin/support/assign";
export const ADMIN_SUPPORT_DESK_END = (sessionId: string) =>
  `/api/v1/admin/support/${sessionId}/end`;
export const ADMIN_TEMPLATES = "/api/v1/admin/templates";
export const COMMUNICATION_TEMPLATE_NOTIFY_MISSING_INFO = "/api/v1/communication-template/notify-missing-info";
export const ASSISTANT_CLIENTS_ASSIGNED = "/api/v1/assistant/clients-assigned";

// Sales Operation Endpoints
export const ADMIN_SALES_OPERATION = "/api/v1/sales-operation";

// Jobsite v2 Endpoints
export const ADMIN_JOBSITE = "/api/v1/jobsite";

