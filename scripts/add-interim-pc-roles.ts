// add-interim-pc-roles.ts — adds the InterimDPC/InterimSPC assignment
// columns to credentials and extends get_decrypted_credential_extended to
// decrypt them, alongside the existing DPC/VPC/SPC fields.
//
// This is purely additive: every line of the existing function body is
// preserved verbatim (confirmed against `SELECT
// pg_get_functiondef('get_decrypted_credential_extended'::regproc)` run
// against the live DB) — only 4 new output columns are appended. Existing
// DPC/VPC/SPC decryption is unaffected.
//
// Run (report only, no writes):
//   tsx scripts/add-interim-pc-roles.ts
// Run (apply the migration):
//   tsx scripts/add-interim-pc-roles.ts --execute
//
// Requires: .env with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const EXECUTE = process.argv.includes("--execute");

const ALTER_TABLE_SQL = `
  ALTER TABLE credentials
    ADD COLUMN IF NOT EXISTS "InterimDPCNameEncrypted" bytea,
    ADD COLUMN IF NOT EXISTS "InterimDPCEmailEncrypted" bytea,
    ADD COLUMN IF NOT EXISTS "InterimSPCNameEncrypted" bytea,
    ADD COLUMN IF NOT EXISTS "InterimSPCEmailEncrypted" bytea;
`;

// Postgres won't let CREATE OR REPLACE widen a function's OUT columns, so the
// old signature has to be dropped first — done in the same transaction as
// the CREATE immediately below, so there's no window where the function is
// missing for any concurrent caller (other sessions only see the DDL once
// this transaction commits).
const DROP_FUNCTION_SQL = `
  DROP FUNCTION IF EXISTS public.get_decrypted_credential_extended(character varying, text);
`;

// Every line above the two new CASE blocks is byte-for-byte identical to the
// function currently deployed — only the RETURNS TABLE signature and the
// SELECT list gained 4 new columns.
const CREATE_FUNCTION_SQL = `
  CREATE OR REPLACE FUNCTION public.get_decrypted_credential_extended(p_credential_id character varying, p_key text)
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
  $function$
`;

async function main() {
  console.log(EXECUTE ? "Running migration (--execute)…" : "Dry run — pass --execute to apply.\n");
  console.log("── ALTER TABLE ──");
  console.log(ALTER_TABLE_SQL);
  console.log("── DROP FUNCTION (old signature) ──");
  console.log(DROP_FUNCTION_SQL);
  console.log("── CREATE OR REPLACE FUNCTION ──");
  console.log(CREATE_FUNCTION_SQL);

  if (!EXECUTE) {
    console.log("\nDry run only — no changes made. Re-run with --execute to apply.");
    return;
  }

  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const dbName = process.env.DB_NAME;
  if (!user || !password || !host || !dbName) {
    throw new Error("Missing DB credentials in environment variables.");
  }

  const client = new Client({
    connectionString: `postgres://${user}:${password}@${host}:${port}/${dbName}?uselibpqcompat=true&sslmode=require`,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(ALTER_TABLE_SQL);
    await client.query(DROP_FUNCTION_SQL);
    await client.query(CREATE_FUNCTION_SQL);
    await client.query("COMMIT");
    console.log("\n✅ Migration applied: InterimDPC/InterimSPC columns added, function updated.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Migration failed, rolled back:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
