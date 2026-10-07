/**
 * SPR-21-36-001 — Re-encrypt pgcrypto PII from CAST5 (pgp_sym_encrypt default) to AES-256.
 *
 * Context
 *   pgcrypto's pgp_sym_encrypt() defaults to CAST5 (a weak 64-bit-block cipher) unless
 *   `cipher-algo=aes256` is passed. The application code now always passes aes256 for NEW
 *   writes, but rows written before that change remain CAST5. This script converts them.
 *
 * How it works
 *   For every encrypted column it runs, in batches:
 *       col = pgp_sym_encrypt(pgp_sym_decrypt(col, KEY), KEY, 'cipher-algo=aes256')
 *   pgp_sym_decrypt auto-detects the stored cipher, so CAST5 and AES rows both decrypt.
 *
 * Idempotency
 *   pgcrypto writes the cipher id into the OpenPGP session-key packet; get_byte(col, 3)
 *   returns it (3 = CAST5, 9 = AES-256). We only touch rows where it is NOT already 9, so
 *   re-running the script is safe and converges — no row is re-encrypted twice.
 *
 * Safety
 *   - Uses the same key the app uses (ENCRYPTION_SECRET). If the key is wrong, decrypt
 *     fails and the transaction rolls back — nothing is corrupted.
 *   - Runs each column in its own transaction; a failure rolls back that column only.
 *   - RUN ON A NON-PRODUCTION ENVIRONMENT (RAT) FIRST, WITH A FRESH DB BACKUP.
 *
 * Usage
 *   tsx src/scripts/reencrypt-cast5-to-aes256.ts            # migrate
 *   tsx src/scripts/reencrypt-cast5-to-aes256.ts --verify   # report cipher counts only
 *   tsx src/scripts/reencrypt-cast5-to-aes256.ts --dry-run  # report rows that WOULD change
 */
import "dotenv/config";
import { QueryTypes } from "sequelize";
import { getSequelize } from "../utils/sequelize";
import { ENCRYPTION_SECRET } from "../config/env";

// RFC 4880 symmetric-algorithm ids (byte 3 of the pgcrypto OpenPGP SKESK packet)
const CAST5 = 3;
const AES128 = 7; // pgcrypto's pgp_sym_encrypt DEFAULT
const AES192 = 8;
const AES256 = 9;
const BATCH = 500;

// table -> encrypted bytea columns (mirrors src/utils/field-encryption.ts)
const TARGETS: Record<string, string[]> = {
  users: [
    "emailEncrypted", "phoneNumberEncrypted", "whatsappNumberEncrypted",
    "bankNameEncrypted", "bsbCodeEncrypted", "bankAccountNoEncrypted", "bankAccountNameEncrypted",
  ],
  profiles: ["socialSecurityNumberEncrypted", "taxIdentificationNumberEncrypted", "dateOfBirthEncrypted"],
  credentials: [
    "seekPasswordEncrypted", "seekEmailEncrypted",
    "AssignedPCNameEncrypted", "AssignedPCEmailEncrypted",
    "AssignedVetNameEncrypted", "AssignedVetEmailEncrypted",
    "AssignedCompletedNameEncrypted", "AssignedCompletedEmailEncrypted",
    "InterimDPCNameEncrypted", "InterimDPCEmailEncrypted",
    "InterimSPCNameEncrypted", "InterimSPCEmailEncrypted",
  ],
  jobsite_credentials: ["emailEncrypted", "generatedPasswordEncrypted"],
  referrers: ["referredEmailEncrypted"],
  missing_info_requests: ["personalMessageEncrypted"],
  missing_info_responses: ["fieldValueEncrypted"],
};

const KEY = ENCRYPTION_SECRET!;
const mode = process.argv.includes("--verify")
  ? "verify"
  : process.argv.includes("--dry-run")
    ? "dry-run"
    : "migrate";

async function main() {
  if (!KEY) throw new Error("ENCRYPTION_SECRET is not set — aborting.");
  const sequelize = getSequelize();

  let totalConverted = 0;
  let totalRemainingCast5 = 0;
  let totalPending = 0; // rows not yet AES-256 (CAST5 + AES128 + AES192 + unknown)

  for (const [table, cols] of Object.entries(TARGETS)) {
    for (const col of cols) {
      // Cipher distribution for this column (byte 3 of the OpenPGP SKESK packet).
      const [{ cast5, aes128, aes192, aes256, other }] = (await sequelize.query(
        `SELECT
            count(*) FILTER (WHERE get_byte("${col}", 3) = ${CAST5})  AS cast5,
            count(*) FILTER (WHERE get_byte("${col}", 3) = ${AES128}) AS aes128,
            count(*) FILTER (WHERE get_byte("${col}", 3) = ${AES192}) AS aes192,
            count(*) FILTER (WHERE get_byte("${col}", 3) = ${AES256}) AS aes256,
            count(*) FILTER (WHERE get_byte("${col}", 3) NOT IN (${CAST5},${AES128},${AES192},${AES256})) AS other
         FROM "${table}" WHERE "${col}" IS NOT NULL`,
        { type: QueryTypes.SELECT },
      )) as any[];

      // "pending" = anything not yet AES-256 (upgrades CAST5/AES128/AES192 -> AES256).
      const pending = Number(cast5) + Number(aes128) + Number(aes192) + Number(other);
      totalRemainingCast5 += Number(cast5);
      totalPending += pending;
      console.log(`${table}.${col}: cast5=${cast5} aes128=${aes128} aes192=${aes192} aes256=${aes256} other=${other}`);

      if (mode !== "migrate" || pending === 0) continue;

      // Re-encrypt in batches of primary-key ids that are not already AES-256.
      for (;;) {
        const t = await sequelize.transaction();
        try {
          const rows = (await sequelize.query(
            `UPDATE "${table}" SET "${col}" =
                pgp_sym_encrypt(pgp_sym_decrypt("${col}", :key), :key, 'cipher-algo=aes256')
             WHERE id IN (
               SELECT id FROM "${table}"
               WHERE "${col}" IS NOT NULL AND get_byte("${col}", 3) <> ${AES256}
               LIMIT ${BATCH}
             )
             RETURNING id`,
            { replacements: { key: KEY }, type: QueryTypes.UPDATE, transaction: t },
          )) as any;
          const affected = Array.isArray(rows?.[0]) ? rows[0].length : (rows?.[1] ?? 0);
          await t.commit();
          totalConverted += Number(affected) || 0;
          if (!affected) break;
          console.log(`  …re-encrypted ${affected} rows of ${table}.${col}`);
        } catch (e) {
          await t.rollback();
          throw e;
        }
      }
    }
  }

  console.log("------------------------------------------------------------");
  if (mode === "migrate") {
    console.log(`Converted ${totalConverted} rows to AES-256.`);
    console.log("Re-run with --verify to confirm all rows are AES-256.");
  } else {
    console.log(`CAST5 remaining: ${totalRemainingCast5}`);
    console.log(
      totalPending === 0
        ? "VERIFY: all encrypted rows are AES-256. ✅"
        : `VERIFY: ${totalPending} rows are not yet AES-256 (see per-column aes128/aes192/cast5 above). ❌`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Re-encryption failed:", e);
    process.exit(1);
  });
