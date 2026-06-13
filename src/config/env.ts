// import dotenv from "dotenv";

// // LOAD ENVIRONMENT VARIABLES
// dotenv.config();

export const NODE_ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT;

// GITHUB
export const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

// DATABASE
export const DATABASE_URL = process.env.DATABASE_URL;
export const DATABASE_NAME = process.env.DB_NAME;
export const DATABASE_USERNAME = process.env.DB_USER;
export const DATABASE_PASSWORD = process.env.DB_PASSWORD;
export const DATABASE_HOST = process.env.DB_HOST;
export const DATABASE_PORT = parseInt(process.env.DB_PORT || "5432", 10) || 5432;

// PROXY DATABASE
export const REDIS_PORT = parseInt(process.env.CLIENT_SAMPLE_REDIS_PORT!, 10);
export const REDIS_HOST = process.env.CLIENT_SAMPLE_REDIS_HOST;
export const REDIS_PASSWORD = process.env.CLIENT_SAMPLE_REDIS_PASSWORD;
// Configurable toggle
export const USE_REDIS = process.env.USE_REDIS;
export const ADMIN_ANALYTICS_DAILY_LOOKBACK_DAYS = parseInt(
  process.env.ADMIN_ANALYTICS_DAILY_LOOKBACK_DAYS || "180",
  10,
);

export const SCHEMA_MANAGED_TABLES = (process.env.SCHEMA_MANAGED_TABLES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const BOT_SCRAPING_QUEUES = (process.env.BOT_SCRAPING_QUEUES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const TABLE_MANAGER_TABLES = (process.env.TABLE_MANAGER_TABLES ||
  "users,campaigns,applications")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

// FRONTEND URL
export const RAT_FRONTEND_URL = process.env.RAT_FRONTEND_URL;
export const IAT_FRONTEND_URL = process.env.IAT_FRONTEND_URL;
export const SIT_FRONTEND_URL = process.env.SIT_FRONTEND_URL;
export const UAT_FRONTEND_URL = process.env.UAT_FRONTEND_URL;
export const PROD_FRONTEND_URL = process.env.PROD_FRONTEND_URL;
export const LOCAL_FRONTEND_URL = process.env.LOCAL_FRONTEND_URL;

// BACKEND URL (for serving static assets in emails)
export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:50001";

// URL
export const COOKIE_SECRET = process.env.COOKIE_SECRET;

// JUST CALL
export const JUSTCALL_API_KEY = process.env.JUSTCALL_API_KEY!;
export const JUSTCALL_API_SECRET = process.env.JUSTCALL_API_SECRET!;

// SLACK
export const SLACK_USERS_TOKEN = process.env.SLACK_USERS_TOKEN;
export const SLACK_TOKEN_KEY = process.env.SLACK_TOKEN_KEY;
export const SLACK_ADMIN_CHANNEL_ID = process.env.SLACK_ADMIN_CHANNEL_ID;

// SENDGRID
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
export const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL!;
export const SENDGRID_FROM_NAME = "CVtoCAREER PTY LTD";

// PASSWORD HASH
export const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS!);

// TOKEN ENCRYPTION (STRING)
export const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET!;

// TOKEN ENCRYPTION (OBJECT)
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// OTP VERIFICATION SECRET
export const JWT_VERIFICATION_SECRET_KEY =
  process.env.JWT_VERIFICATION_SECRET_KEY;

// OTP VERIFICATION SECRET - EXPIRY
export const JWT_VERIFICATION_SECRET_KEY_EXPIRY = parseInt(
  process.env.JWT_VERIFICATION_SECRET_KEY_EXPIRY!,
);

// EMAIL
export const TEAM_EMAIL = process.env.TEAM_EMAIL!;

// ACCESS TOKEN SECRET
export const SIGN_IN_ACCESS_SECRET_KEY = process.env.SIGN_IN_ACCESS_SECRET_KEY;

// TOKEN EXPIRATION
export const ACCESS_TOKEN_EXPIRATION = parseInt(
  process.env.ACCESS_TOKEN_EXPIRATION!,
);

// COOKIE NAMES
export const VERIFY_OTP_COOKIE_NAME = "c2c-verify";
export const RESET_PASSWORD_OTP_COOKIE_NAME = "c2c-reset";
export const ACCESS_TOKEN_COOKIE_NAME = "c2c-access";

// PAYPAL
export const PAYPAL_BASE_URL = process.env.PAY_PAL_BASE_URL!;
export const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
export const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY!;

// ZOHO BOOKS
export const ZOHO_BASE_URI = process.env.ZOHO_BASE_URI!;
export const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID!;
export const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID!;
export const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET!;
export const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN!;
export const ZOHO_REDIRECT_URI = process.env.ZOHO_REDIRECT_URI!;
export const ZOHO_OAUTH_URI = process.env.ZOHO_OAUTH_URI!;
export const ZOHO_BOOKS_DASHBOARD_MODULE_API_NAME =
  process.env.ZOHO_BOOKS_DASHBOARD_MODULE_API_NAME || "cm_business_snapshot";
export const ZOHO_BOOKS_TOTAL_USERS_FIELD_API_NAME =
  process.env.ZOHO_BOOKS_TOTAL_USERS_FIELD_API_NAME || "cf_total_users";
export const ZOHO_BOOKS_ACTIVE_AGGREGATORS_FIELD_API_NAME =
  process.env.ZOHO_BOOKS_ACTIVE_AGGREGATORS_FIELD_API_NAME ||
  "cf_active_aggregators";
export const ZOHO_BOOKS_ACTIVE_SUBSCRIPTIONS_FIELD_API_NAME =
  process.env.ZOHO_BOOKS_ACTIVE_SUBSCRIPTIONS_FIELD_API_NAME ||
  "cf_active_subscriptions";
export const ZOHO_BOOKS_VERIFIED_AGGREGATOR_LINKS_FIELD_API_NAME =
  process.env.ZOHO_BOOKS_VERIFIED_AGGREGATOR_LINKS_FIELD_API_NAME ||
  "cf_verified_aggregator_links";
export const ZOHO_BOOKS_GENERATED_AT_FIELD_API_NAME =
  process.env.ZOHO_BOOKS_GENERATED_AT_FIELD_API_NAME || "cf_generated_at";

// DIGITAL OCEAN AI
export const GRADIENT_ACCESS_TOKEN = process.env.GRADIENT_ACCESS_TOKEN;
export const GRADIENT_AGENT_ACCESS_KEY = process.env.GRADIENT_AGENT_ACCESS_KEY;
export const GRADIENT_AGENT_ENDPOINT = process.env.GRADIENT_AGENT_ENDPOINT;

// VIEW AS USER
export const CLIENT_APP_DOMAIN = process.env.CLIENT_APP_DOMAIN || "http://localhost:3001";
export const VIEW_AS_USER_JWT_SECRET = process.env.VIEW_AS_USER_JWT_SECRET || process.env.SIGN_IN_ACCESS_SECRET_KEY;

// FIREBASE SERVICE ACCOUNT
export const FIREBASE_TYPE = process.env.FIREBASE_TYPE;
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
export const FIREBASE_PRIVATE_KEY_ID = process.env.FIREBASE_PRIVATE_KEY_ID;
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
export const FIREBASE_CLIENT_ID = process.env.FIREBASE_CLIENT_ID;
export const FIREBASE_AUTH_URI = process.env.FIREBASE_AUTH_URI;
export const FIREBASE_TOKEN_URI = process.env.FIREBASE_TOKEN_URI;
export const FIREBASE_AUTH_PROVIDER_X509_CERT_URL = process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL;
export const FIREBASE_CLIENT_X509_CERT_URL = process.env.FIREBASE_CLIENT_X509_CERT_URL;
export const FIREBASE_UNIVERSEDOMAIN = process.env.FIREBASE_UNIVERSEDOMAIN;

// GOOGLE DRIVE SERVICE ACCOUNT
export const GOOGLE_DRIVE_TYPE = process.env.TYPE;
export const GOOGLE_DRIVE_PROJECT_ID = process.env.PROJECTID;
export const GOOGLE_DRIVE_PRIVATE_KEY_ID = process.env.PRIVATEKEYID;
export const GOOGLE_DRIVE_PRIVATE_KEY = process.env.PRIVATEKEY;
export const GOOGLE_DRIVE_CLIENT_EMAIL = process.env.CLIENTEMAIL;
export const GOOGLE_DRIVE_CLIENT_ID = process.env.CLIENTID;
export const GOOGLE_DRIVE_AUTH_URI = process.env.AUTHURI;
export const GOOGLE_DRIVE_TOKEN_URI = process.env.TOKENURI;
export const GOOGLE_DRIVE_AUTH_PROVIDER_X509_CERT_URL = process.env.AUTHPROVIDERX509CERTURL;
export const GOOGLE_DRIVE_CLIENT_X509_CERT_URL = process.env.CLIENTX509CERTURL;
export const GOOGLE_DRIVE_UNIVERSE_DOMAIN = process.env.UNIVERSEDOMAIN;
