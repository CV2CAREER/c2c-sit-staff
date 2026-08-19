// fix-seek-sub-start-date-format.ts — normalizes credentials."SeekSubStartDate"
// to the app's accepted format, DD-MM-YYYY (see DATE_FORMAT in
// src/utils/campaign-calculator.ts). Legacy rows written by the old system
// are stored as "YYYY-MM-DD HH:mm:ss" (or plain "YYYY-MM-DD"), which
// parseDate() there silently fails on, breaking SeekSubToExpireDays etc.
//
// Run (report only, no writes):
//   tsx scripts/fix-seek-sub-start-date-format.ts
// Run (apply the fix):
//   tsx scripts/fix-seek-sub-start-date-format.ts --execute
//
// Requires: .env with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const EXECUTE = process.argv.includes("--execute");

const ALREADY_OK = /^\d{2}-\d{2}-\d{4}$/;
const LEGACY_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?.*)?$/;

// Returns the DD-MM-YYYY form, or null if the value isn't a recognized
// legacy format (left untouched so it can be reviewed manually).
function toAcceptedFormat(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(LEGACY_ISO);
  if (!match) return null;

  const [, year, month, day] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  return `${day}-${month}-${year}`;
}

const buildConnectionString = () => {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const dbName = process.env.DB_NAME;

  if (!user || !password || !host || !dbName) {
    throw new Error("Missing DB credentials in environment variables.");
  }

  return `postgres://${user}:${password}@${host}:${port}/${dbName}?uselibpqcompat=true&sslmode=require`;
};

const run = async () => {
  const client = new Client({
    connectionString: buildConnectionString(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const { rows } = await client.query<{ id: string; SeekSubStartDate: string }>(
      `select id, "SeekSubStartDate" from credentials where "SeekSubStartDate" is not null`,
    );

    const toFix: { id: string; from: string; to: string }[] = [];
    const unrecognized: { id: string; value: string }[] = [];

    for (const row of rows) {
      const value = row.SeekSubStartDate;
      if (ALREADY_OK.test(value.trim())) continue;

      const fixed = toAcceptedFormat(value);
      if (fixed) {
        toFix.push({ id: row.id, from: value, to: fixed });
      } else {
        unrecognized.push({ id: row.id, value });
      }
    }

    console.log(`Scanned ${rows.length} rows.`);
    console.log(`${toFix.length} row(s) to convert to DD-MM-YYYY.`);
    if (toFix.length) {
      console.table(toFix.slice(0, 20));
      if (toFix.length > 20) console.log(`...and ${toFix.length - 20} more.`);
    }

    if (unrecognized.length) {
      console.log(`${unrecognized.length} row(s) with an unrecognized format (left untouched):`);
      console.table(unrecognized.slice(0, 20));
    }

    if (!EXECUTE) {
      console.log("\nDry run only — no rows were updated. Re-run with --execute to apply.");
      return;
    }

    await client.query("BEGIN");
    for (const { id, to } of toFix) {
      await client.query(
        `update credentials set "SeekSubStartDate" = $2, "updatedBy" = 'System' where id = $1`,
        [id, to],
      );
    }
    await client.query("COMMIT");
    console.log(`\nUpdated ${toFix.length} row(s).`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`SeekSubStartDate format fix failed: ${message}`);
  process.exit(1);
});
