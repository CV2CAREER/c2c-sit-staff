// backfill-campaign-sub-end-date.ts — fills in the missing
// credentials.seekExternalCredentials.SeekSubEndDate (and CampaignEnd /
// SeekSubDurDays) for legacy rows, using the same calculation the app
// already performs live when SeekSubStartDate changes
// (see the SeekSubStartDate handler in src/services/campaign.service.ts):
// SeekSubEndDate = SeekSubStartDate + plans.validityPeriod, where the plan
// is the client's Plan row matched by clientId (and by title, when the
// credentials record names one via seekExternalCredentials.Plan).
//
// Run (report only, no writes):
//   tsx scripts/backfill-campaign-sub-end-date.ts
// Run (apply the fix):
//   tsx scripts/backfill-campaign-sub-end-date.ts --execute
//
// Requires: .env with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const EXECUTE = process.argv.includes("--execute");

interface CredentialRow {
  id: string;
  clientId: string | null;
  SeekSubStartDate: string | null;
  seekExternalCredentials: Record<string, any> | null;
}

// Accepts DD-MM-YYYY (the app's datepicker format) or ISO YYYY-MM-DD —
// mirrors the parsing in campaign.service.ts's SeekSubStartDate handler.
function parseStartDate(raw: string): Date | null {
  const trimmed = raw.trim();
  const parts =
    trimmed.includes("-") && trimmed.split("-")[0].length === 2
      ? trimmed.split("-")
      : null;
  const date = parts
    ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    : new Date(trimmed);
  return isNaN(date.getTime()) ? null : date;
}

// validityPeriod examples: "6 months", "12 months", "30 days", "1 year"
function computeExpiry(
  startDate: Date,
  validityPeriod: string,
): { expiry: Date; durationDays: number } | null {
  const [rawAmount, rawUnit = ""] = validityPeriod.trim().split(/\s+/);
  const amount = parseInt(rawAmount, 10);
  if (!amount || isNaN(amount)) return null;

  const unit = rawUnit.toLowerCase();
  const expiry = new Date(startDate);

  if (unit.startsWith("day")) {
    expiry.setDate(expiry.getDate() + amount);
  } else if (unit.startsWith("month")) {
    expiry.setMonth(expiry.getMonth() + amount);
  } else {
    expiry.setFullYear(expiry.getFullYear() + amount);
  }

  const durationDays = Math.round(
    (expiry.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return { expiry, durationDays };
}

function formatDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
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
    const { rows } = await client.query<CredentialRow>(
      `select id, "clientId", "SeekSubStartDate", "seekExternalCredentials"
       from credentials
       where "SeekSubStartDate" is not null
         and "clientId" is not null
         and (
           "seekExternalCredentials" is null
           or "seekExternalCredentials"->>'SeekSubEndDate' is null
           or "seekExternalCredentials"->>'SeekSubEndDate' = ''
         )`,
    );

    const toFix: {
      id: string;
      clientId: string;
      planTitle: string;
      startDate: string;
      endDate: string;
      durationDays: number;
    }[] = [];
    const skipped: { id: string; clientId: string; reason: string }[] = [];

    for (const row of rows) {
      const clientId = row.clientId as string;
      const planTitle = row.seekExternalCredentials?.Plan as string | undefined;

      const startDate = row.SeekSubStartDate
        ? parseStartDate(row.SeekSubStartDate)
        : null;
      if (!startDate) {
        skipped.push({
          id: row.id,
          clientId,
          reason: `Unparseable SeekSubStartDate: ${row.SeekSubStartDate}`,
        });
        continue;
      }

      const { rows: planRows } = await client.query<{ validityPeriod: string | null }>(
        `select "validityPeriod" from plans
         where "userId" = $1 and ($2::text is null or title = $2)
         order by "createdAt" desc
         limit 1`,
        [clientId, planTitle ?? null],
      );

      const validityPeriod = planRows[0]?.validityPeriod;
      if (!validityPeriod) {
        skipped.push({
          id: row.id,
          clientId,
          reason: planRows.length
            ? "Plan found but has no validityPeriod"
            : `No plan found${planTitle ? ` matching title "${planTitle}"` : ""}`,
        });
        continue;
      }

      const result = computeExpiry(startDate, validityPeriod);
      if (!result) {
        skipped.push({
          id: row.id,
          clientId,
          reason: `Unparseable validityPeriod: ${validityPeriod}`,
        });
        continue;
      }

      toFix.push({
        id: row.id,
        clientId,
        planTitle: planTitle ?? "(unknown)",
        startDate: formatDDMMYYYY(startDate),
        endDate: formatDDMMYYYY(result.expiry),
        durationDays: result.durationDays,
      });
    }

    console.log(`Scanned ${rows.length} row(s) with a missing SeekSubEndDate.`);
    console.log(`${toFix.length} row(s) can be backfilled.`);
    if (toFix.length) {
      console.table(toFix.slice(0, 20));
      if (toFix.length > 20) console.log(`...and ${toFix.length - 20} more.`);
    }

    if (skipped.length) {
      console.log(`${skipped.length} row(s) skipped (left untouched):`);
      console.table(skipped.slice(0, 20));
      if (skipped.length > 20) console.log(`...and ${skipped.length - 20} more.`);
    }

    if (!EXECUTE) {
      console.log("\nDry run only — no rows were updated. Re-run with --execute to apply.");
      return;
    }

    await client.query("BEGIN");
    for (const { id, endDate, durationDays } of toFix) {
      await client.query(
        `update credentials
         set "seekExternalCredentials" = jsonb_set(
               jsonb_set(
                 jsonb_set(
                   coalesce("seekExternalCredentials", '{}'::jsonb),
                   '{SeekSubEndDate}', to_jsonb($2::text), true
                 ),
                 '{CampaignEnd}', to_jsonb($2::text), true
               ),
               '{SeekSubDurDays}', to_jsonb($3::int), true
             ),
             "updatedBy" = 'System'
         where id = $1`,
        [id, endDate, durationDays],
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
  console.error(`Campaign SeekSubEndDate backfill failed: ${message}`);
  process.exit(1);
});
