import dotenv from "dotenv";

// LOAD ENVIRONMENT VARIABLES
dotenv.config();

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
export const DATABASE_PORT = parseInt(process.env.DB_PORT || "", 10);

// PROXY DATABASE
export const REDIS_PORT = parseInt(process.env.CLIENT_SAMPLE_REDIS_PORT!, 10);
export const REDIS_HOST = process.env.CLIENT_SAMPLE_REDIS_HOST;
export const REDIS_PASSWORD = process.env.CLIENT_SAMPLE_REDIS_PASSWORD;
// Configurable toggle
export const USE_REDIS = process.env.USE_REDIS;

// URL
export const RAT_FRONTEND_URL = process.env.RAT_FRONTEND_URL;
export const IAT_FRONTEND_URL = process.env.IAT_FRONTEND_URL;
export const SIT_FRONTEND_URL = process.env.SIT_FRONTEND_URL;
export const UAT_FRONTEND_URL = process.env.UAT_FRONTEND_URL;
export const PROD_FRONTEND_URL = process.env.PROD_FRONTEND_URL;
export const LOCAL_FRONTEND_URL = process.env.LOCAL_FRONTEND_URL;
// URL
export const COOKIE_SECRET = process.env.COOKIE_SECRET;

// JUST CALL
export const JUSTCALL_API_KEY = process.env.JUSTCALL_API_KEY!;
export const JUSTCALL_API_SECRET = process.env.JUSTCALL_API_SECRET!;

// SLACK
export const SLACK_USERS_TOKEN = process.env.SLACK_USERS_TOKEN;
export const SLACK_TOKEN_KEY = process.env.SLACK_TOKEN_KEY;

// SENDGRID
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
export const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL!;
export const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME!;
