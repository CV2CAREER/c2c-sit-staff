// cleanup-justcall-duplicate-events.ts — removes duplicate justcall_events
// rows left behind by testing before the upsert-by-externalId behavior
// existed (every webhook delivery used to insert its own row; now a
// delivery for a call/message already on file updates that row instead).
// Keeps only the most-recently-updated row per externalId; rows with a
// null externalId are left untouched. Also removes the justcall_event_logs
// rows that point at the duplicates being deleted (their FK would
// otherwise block the delete) - that's the only history lost, since it
// belongs to rows this script is retiring anyway.
//
// Run (report only, no writes):
//   tsx scripts/cleanup-justcall-duplicate-events.ts
// Run (apply the fix):
//   tsx scripts/cleanup-justcall-duplicate-events.ts --execute
//
// Requires: .env with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const EXECUTE = process.argv.includes("--execute");

interface DuplicateRow {
  id: string;
  externalId: string;
  eventType: string;
  updatedAt: string;
  rn: string;
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
    const { rows: duplicates } = await client.query<DuplicateRow>(
      `select id, "externalId", "eventType", "updatedAt",
              row_number() over (
                partition by "externalId"
                order by "updatedAt" desc
              ) as rn
       from justcall_events
       where "externalId" is not null
         and "externalId" in (
           select "externalId"
           from justcall_events
           where "externalId" is not null
           group by "externalId"
           having count(*) > 1
         )
       order by "externalId", "updatedAt" desc`,
    );

    const toDelete = duplicates.filter((row) => Number(row.rn) > 1);
    const distinctCalls = new Set(duplicates.map((row) => row.externalId)).size;

    if (toDelete.length === 0) {
      console.log("No duplicate justcall_events rows found. Nothing to do.");
      return;
    }

    console.log(
      `Found ${distinctCalls} call(s)/message(s) with duplicate rows — ${toDelete.length} stale row(s) to remove:`,
    );
    console.table(
      toDelete.slice(0, 20).map((row) => ({
        id: row.id,
        externalId: row.externalId,
        eventType: row.eventType,
        updatedAt: row.updatedAt,
      })),
    );
    if (toDelete.length > 20) console.log(`...and ${toDelete.length - 20} more.`);

    const { rows: logCountRows } = await client.query<{ count: string }>(
      `select count(*) from justcall_event_logs where "justCallEventId" = any($1::text[])`,
      [toDelete.map((row) => row.id)],
    );
    console.log(
      `This will also remove ${logCountRows[0].count} justcall_event_logs row(s) attached to those stale duplicates.`,
    );

    if (!EXECUTE) {
      console.log("\nDry run only — no rows were deleted. Re-run with --execute to apply.");
      return;
    }

    const idsToDelete = toDelete.map((row) => row.id);

    await client.query("BEGIN");
    await client.query(
      `delete from justcall_event_logs where "justCallEventId" = any($1::text[])`,
      [idsToDelete],
    );
    await client.query(`delete from justcall_events where id = any($1::text[])`, [idsToDelete]);
    await client.query("COMMIT");

    console.log(`\nDeleted ${toDelete.length} duplicate justcall_events row(s).`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`JustCall duplicate cleanup failed: ${message}`);
  process.exit(1);
});
