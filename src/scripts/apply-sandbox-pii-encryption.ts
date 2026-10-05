import { Sequelize } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { resolvePoolTarget } from "./_pool-target";

const logger = getServiceLogger("apply-sandbox-pii-encryption");

// One-off restore script: re-applies the PII-encryption layer (legacy
// plaintext fallback columns + *Encrypted/*Hash columns + hash indexes +
// the custom pgp_sym_decrypt-based SQL functions) onto a non-production
// database (sandbox, rat-pool, ...). All values below were extracted
// read-only from iat-pool's real database (c2c_iat) via information_schema /
// pg_get_functiondef — nothing here is guessed. This restores what
// force-syncing a target's schema from current Sequelize models could never
// produce, since every one of these columns is either VIRTUAL or entirely
// undeclared on the current models (field-encryption.ts manages them via
// raw SQL only).
//
// Never touches iat-pool. Target is picked via --target=<name> (see
// _pool-target.ts), defaulting to --target=sandbox for backward
// compatibility — never reads DB_NAME from .env.
const argv = process.argv.slice(2);
const target = resolvePoolTarget(argv);

const CONFIRMED = argv.includes("--force") || process.env.CONFIRM_DROP === "yes";

// Legacy plaintext fallback columns (the ones no current model declares —
// VIRTUAL or entirely absent — that the decrypt functions still read when
// the encrypted counterpart is null).
const FALLBACK_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: "users", column: "email", ddl: `VARCHAR(255)` },
  { table: "users", column: "phoneNumber", ddl: `VARCHAR(255)` },
  { table: "users", column: "whatsappNumber", ddl: `VARCHAR(255)` },
  { table: "users", column: "bankName", ddl: `VARCHAR(255)` },
  { table: "users", column: "bsbCode", ddl: `VARCHAR(255)` },
  { table: "users", column: "bankAccountNo", ddl: `VARCHAR(255)` },
  { table: "users", column: "bankAccountName", ddl: `VARCHAR(255)` },
  { table: "profiles", column: "socialSecurityNumber", ddl: `VARCHAR(255)` },
  { table: "profiles", column: "taxIdentificationNumber", ddl: `VARCHAR(255)` },
  { table: "profiles", column: "dateOfBirth", ddl: `VARCHAR(255)` },
  { table: "credentials", column: "seekEmail", ddl: `VARCHAR(64)` },
  { table: "credentials", column: "seekPassword", ddl: `VARCHAR(64)` },
  { table: "credentials", column: "AssignedPCName", ddl: `VARCHAR(128)` },
  { table: "credentials", column: "AssignedPCEmail", ddl: `VARCHAR(128)` },
  { table: "credentials", column: "AssignedVetName", ddl: `VARCHAR(128)` },
  { table: "credentials", column: "AssignedVetEmail", ddl: `VARCHAR(128)` },
  { table: "credentials", column: "AssignedCompletedName", ddl: `VARCHAR(128)` },
  { table: "credentials", column: "AssignedCompletedEmail", ddl: `VARCHAR(128)` },
  { table: "jobsite_credentials", column: "email", ddl: `VARCHAR(255)` },
  { table: "jobsite_credentials", column: "generatedPassword", ddl: `VARCHAR(255)` },
  { table: "referrers", column: "referredEmail", ddl: `VARCHAR(255)` },
  { table: "missing_info_responses", column: "fieldValue", ddl: `TEXT` },
];

// *Encrypted (bytea) / *Hash (text) columns, plus the one stray `__meta_hash`
// text column observed on credentials in iat-pool.
const PII_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: "users", column: "emailEncrypted", ddl: `BYTEA` },
  { table: "users", column: "phoneNumberEncrypted", ddl: `BYTEA` },
  { table: "users", column: "whatsappNumberEncrypted", ddl: `BYTEA` },
  { table: "users", column: "emailHash", ddl: `TEXT` },
  { table: "users", column: "phoneNumberHash", ddl: `TEXT` },
  { table: "users", column: "bankNameEncrypted", ddl: `BYTEA` },
  { table: "users", column: "bsbCodeEncrypted", ddl: `BYTEA` },
  { table: "users", column: "bankAccountNoEncrypted", ddl: `BYTEA` },
  { table: "users", column: "bankAccountNameEncrypted", ddl: `BYTEA` },
  { table: "profiles", column: "socialSecurityNumberEncrypted", ddl: `BYTEA` },
  { table: "profiles", column: "taxIdentificationNumberEncrypted", ddl: `BYTEA` },
  { table: "profiles", column: "dateOfBirthEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "__meta_hash", ddl: `TEXT` },
  { table: "credentials", column: "seekPasswordEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "seekEmailEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "AssignedPCNameEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "AssignedPCEmailEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "AssignedVetNameEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "AssignedVetEmailEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "AssignedCompletedNameEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "AssignedCompletedEmailEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "InterimDPCNameEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "InterimDPCEmailEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "InterimSPCNameEncrypted", ddl: `BYTEA` },
  { table: "credentials", column: "InterimSPCEmailEncrypted", ddl: `BYTEA` },
  { table: "jobsite_credentials", column: "emailEncrypted", ddl: `BYTEA` },
  { table: "jobsite_credentials", column: "emailHash", ddl: `TEXT` },
  { table: "jobsite_credentials", column: "generatedPasswordEncrypted", ddl: `BYTEA` },
  { table: "referrers", column: "referredEmailEncrypted", ddl: `BYTEA` },
  { table: "referrers", column: "referredEmailHash", ddl: `TEXT` },
  { table: "missing_info_requests", column: "personalMessageEncrypted", ddl: `BYTEA` },
  { table: "missing_info_responses", column: "fieldValueEncrypted", ddl: `BYTEA` },
];

const INDEXES: { name: string; table: string; column: string }[] = [
  { name: "idx_users_email_hash", table: "users", column: "emailHash" },
  { name: "idx_users_phone_hash", table: "users", column: "phoneNumberHash" },
  { name: "idx_jobsite_credentials_email_hash", table: "jobsite_credentials", column: "emailHash" },
  { name: "idx_referrers_referred_email_hash", table: "referrers", column: "referredEmailHash" },
];

// Signature (name + arg types) for each function, used to DROP any stale
// version first — sandbox already had 5 of these as leftover objects from
// before the columns were wiped, with a different return type than what
// we're installing, and Postgres refuses `OR REPLACE` across a return-type
// change.
const FUNCTION_SIGNATURES: string[] = [
  "get_decrypted_user(character varying, text)",
  "find_user_by_email(text)",
  "find_user_by_phone(text)",
  "get_user_email(character varying, text)",
  "get_decrypted_profile(character varying, text)",
  "get_decrypted_seek_password(character varying, text)",
  "get_decrypted_user_bank(character varying, text)",
  "get_decrypted_credential_extended(character varying, text)",
  "get_decrypted_jobsite_credential(character varying, text)",
  "get_decrypted_referrer_email(character varying, text)",
  "find_referrer_by_email(text)",
  "get_decrypted_missing_request_personal_message(character varying, text)",
  "get_decrypted_missing_response_field_value(character varying, text)",
  "safe_pgp_sym_decrypt(bytea, text)",
];

// Verbatim from iat-pool via pg_get_functiondef, except
// get_decrypted_credential_extended's whitespace, which the terminal
// line-wrapped on copy — restored to match its sibling functions' spacing;
// no logic changed.
const FUNCTIONS: string[] = [
`CREATE OR REPLACE FUNCTION public.get_decrypted_user(p_user_id character varying, p_key text)
 RETURNS TABLE(id character varying, email character varying, "phoneNumber" character varying, "whatsappNumber" character varying)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    CASE WHEN u."emailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(u."emailEncrypted", p_key) ELSE u.email END,
    CASE WHEN u."phoneNumberEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(u."phoneNumberEncrypted", p_key) ELSE u."phoneNumber" END,
    CASE WHEN u."whatsappNumberEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(u."whatsappNumberEncrypted", p_key) ELSE u."whatsappNumber" END
  FROM users u
  WHERE u.id = p_user_id;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
 RETURNS TABLE(id character varying)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT u.id FROM users u
  WHERE u."emailHash" = ENCODE(DIGEST(LOWER(p_email), 'sha256'), 'hex');
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.find_user_by_phone(p_phone text)
 RETURNS TABLE(id character varying)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT u.id FROM users u
  WHERE u."phoneNumberHash" = ENCODE(DIGEST(p_phone, 'sha256'), 'hex');
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id character varying, p_key text)
 RETURNS character varying
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_email varchar;
BEGIN
  SELECT CASE WHEN u."emailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(u."emailEncrypted", p_key) ELSE u.email END
  INTO v_email
  FROM users u WHERE u.id = p_user_id;
  RETURN v_email;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_decrypted_profile(p_profile_id character varying, p_key text)
 RETURNS TABLE(id character varying, "socialSecurityNumber" character varying, "taxIdentificationNumber" character varying, "dateOfBirth" character varying)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    CASE WHEN p."socialSecurityNumberEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(p."socialSecurityNumberEncrypted", p_key)
         ELSE p."socialSecurityNumber" END,
    CASE WHEN p."taxIdentificationNumberEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(p."taxIdentificationNumberEncrypted", p_key)
         ELSE p."taxIdentificationNumber" END,
    CASE WHEN p."dateOfBirthEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(p."dateOfBirthEncrypted", p_key)
         ELSE p."dateOfBirth" END
  FROM profiles p
  WHERE p.id = p_profile_id;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_decrypted_seek_password(p_credential_id character varying, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_password text;
BEGIN
  SELECT CASE WHEN c."seekPasswordEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."seekPasswordEncrypted", p_key)
         ELSE c."seekPassword" END
  INTO v_password
  FROM credentials c WHERE c.id = p_credential_id;
  RETURN v_password;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_decrypted_user_bank(p_user_id character varying, p_key text)
 RETURNS TABLE(id character varying, "bankName" text, "bsbCode" text, "bankAccountNo" text, "bankAccountName" text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.id::varchar,
    CASE WHEN u."bankNameEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(u."bankNameEncrypted", p_key) ELSE u."bankName"::text END,
    CASE WHEN u."bsbCodeEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(u."bsbCodeEncrypted", p_key) ELSE u."bsbCode"::text END,
    CASE WHEN u."bankAccountNoEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(u."bankAccountNoEncrypted", p_key) ELSE u."bankAccountNo"::text END,
    CASE WHEN u."bankAccountNameEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(u."bankAccountNameEncrypted", p_key) ELSE u."bankAccountName"::text END
  FROM users u
  WHERE u.id::varchar = p_user_id;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_decrypted_credential_extended(p_credential_id character varying, p_key text)
 RETURNS TABLE(id character varying, "seekEmail" text, "AssignedPCName" text, "AssignedPCEmail" text, "AssignedVetName" text, "AssignedVetEmail" text, "AssignedCompletedName" text, "AssignedCompletedEmail" text, "InterimDPCName" text, "InterimDPCEmail" text, "InterimSPCName" text, "InterimSPCEmail" text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.id::varchar,
    CASE WHEN c."seekEmailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."seekEmailEncrypted", p_key) ELSE c."seekEmail"::text END,
    CASE WHEN c."AssignedPCNameEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."AssignedPCNameEncrypted", p_key) ELSE c."AssignedPCName"::text END,
    CASE WHEN c."AssignedPCEmailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."AssignedPCEmailEncrypted", p_key) ELSE c."AssignedPCEmail"::text END,
    CASE WHEN c."AssignedVetNameEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."AssignedVetNameEncrypted", p_key) ELSE c."AssignedVetName"::text END,
    CASE WHEN c."AssignedVetEmailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."AssignedVetEmailEncrypted", p_key) ELSE c."AssignedVetEmail"::text END,
    CASE WHEN c."AssignedCompletedNameEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."AssignedCompletedNameEncrypted", p_key) ELSE c."AssignedCompletedName"::text END,
    CASE WHEN c."AssignedCompletedEmailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."AssignedCompletedEmailEncrypted", p_key) ELSE c."AssignedCompletedEmail"::text END,
    CASE WHEN c."InterimDPCNameEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."InterimDPCNameEncrypted", p_key) ELSE NULL END,
    CASE WHEN c."InterimDPCEmailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."InterimDPCEmailEncrypted", p_key) ELSE NULL END,
    CASE WHEN c."InterimSPCNameEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."InterimSPCNameEncrypted", p_key) ELSE NULL END,
    CASE WHEN c."InterimSPCEmailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(c."InterimSPCEmailEncrypted", p_key) ELSE NULL END
  FROM credentials c
  WHERE c.id::varchar = p_credential_id;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_decrypted_jobsite_credential(p_credential_id character varying, p_key text)
 RETURNS TABLE(id character varying, email text, "generatedPassword" text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    j.id::varchar,
    CASE WHEN j."emailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(j."emailEncrypted", p_key) ELSE j.email::text END,
    CASE WHEN j."generatedPasswordEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(j."generatedPasswordEncrypted", p_key) ELSE j."generatedPassword"::text END
  FROM jobsite_credentials j
  WHERE j.id::varchar = p_credential_id;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_decrypted_referrer_email(p_referrer_id character varying, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_email text;
BEGIN
  SELECT CASE WHEN r."referredEmailEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(r."referredEmailEncrypted", p_key)
         ELSE r."referredEmail"::text END
  INTO v_email
  FROM referrers r WHERE r.id::varchar = p_referrer_id;
  RETURN v_email;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.find_referrer_by_email(p_email text)
 RETURNS TABLE(id character varying)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT r.id FROM referrers r
  WHERE r."referredEmailHash" = ENCODE(DIGEST(LOWER(p_email), 'sha256'), 'hex');
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_decrypted_missing_request_personal_message(p_request_id character varying, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_message text;
BEGIN
  SELECT CASE WHEN r."personalMessageEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(r."personalMessageEncrypted", p_key) END
  INTO v_message
  FROM missing_info_requests r WHERE r.id::varchar = p_request_id;
  RETURN v_message;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.get_decrypted_missing_response_field_value(p_response_id character varying, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_value text;
BEGIN
  SELECT CASE WHEN r."fieldValueEncrypted" IS NOT NULL
         THEN pgp_sym_decrypt(r."fieldValueEncrypted", p_key)
         ELSE r."fieldValue"::text END
  INTO v_value
  FROM missing_info_responses r WHERE r.id::varchar = p_response_id;
  RETURN v_value;
END;
$function$`,

`CREATE OR REPLACE FUNCTION public.safe_pgp_sym_decrypt(encrypted bytea, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  decrypted text;
BEGIN
  IF encrypted IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    decrypted := pgp_sym_decrypt(encrypted, p_key);
    RETURN decrypted;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$function$`,
];

async function main() {
  logger.info(`Target: ${target.name} — ${target.host}:${target.port} db="${target.database}"`);

  const sequelize = new Sequelize(target.database, target.username, target.password, {
    host: target.host,
    port: target.port,
    dialect: "postgres",
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });

  try {
    await sequelize.authenticate();

    const [[{ current_database }]] = (await sequelize.query(
      "SELECT current_database()",
    )) as [{ current_database: string }[], unknown];
    if (current_database !== target.database) {
      throw new Error(`Connected database is "${current_database}", expected "${target.database}" — aborting.`);
    }
    logger.info(`✅ Connected to "${current_database}" @ ${target.host}:${target.port}`);

    const totalCols = FALLBACK_COLUMNS.length + PII_COLUMNS.length;
    logger.info(
      `Plan: 1 extension, ${totalCols} column(s) across 7 tables, ${INDEXES.length} index(es), ${FUNCTIONS.length} function(s).`,
    );

    if (!CONFIRMED) {
      logger.warn("🛑 Dry run only (no --force / CONFIRM_DROP=yes passed). Nothing was applied.");
      logger.info("Columns to add:");
      for (const c of [...FALLBACK_COLUMNS, ...PII_COLUMNS]) {
        logger.info(`  ${c.table}.${c.column} ${c.ddl}`);
      }
      logger.info("Indexes to create:");
      for (const i of INDEXES) logger.info(`  ${i.name} ON ${i.table}("${i.column}")`);
      logger.info(`Functions to create/replace: ${FUNCTIONS.length}`);
      return;
    }

    await sequelize.transaction(async (t) => {
      logger.info("Ensuring pgcrypto extension...");
      await sequelize.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`, { transaction: t });

      logger.info(`Adding ${FALLBACK_COLUMNS.length} legacy fallback column(s)...`);
      for (const { table, column, ddl } of FALLBACK_COLUMNS) {
        await sequelize.query(
          `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`,
          { transaction: t },
        );
      }

      logger.info(`Adding ${PII_COLUMNS.length} PII encrypted/hash column(s)...`);
      for (const { table, column, ddl } of PII_COLUMNS) {
        await sequelize.query(
          `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`,
          { transaction: t },
        );
      }

      logger.info(`Creating ${INDEXES.length} index(es)...`);
      for (const { name, table, column } of INDEXES) {
        await sequelize.query(
          `CREATE INDEX IF NOT EXISTS ${name} ON "${table}" USING btree ("${column}")`,
          { transaction: t },
        );
      }

      logger.info(`Dropping any stale version of ${FUNCTION_SIGNATURES.length} function(s)...`);
      for (const sig of FUNCTION_SIGNATURES) {
        await sequelize.query(`DROP FUNCTION IF EXISTS public.${sig}`, { transaction: t });
      }

      logger.info(`Creating ${FUNCTIONS.length} function(s)...`);
      for (const fn of FUNCTIONS) {
        await sequelize.query(fn, { transaction: t });
      }
    });

    logger.info(`✅ PII encryption layer applied to "${target.database}" successfully.`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  logger.error(`❌ apply-sandbox-pii-encryption failed: ${error?.message || error}`);
  process.exitCode = 1;
});
