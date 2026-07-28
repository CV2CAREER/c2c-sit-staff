import { Op, QueryTypes } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { getSequelize, resetSequelize } from "../utils/sequelize";
import { ManualApplication } from "../models/v1/manual-application.model";

const logger = getServiceLogger("migrate-manual-applications-to-applications");

// Same window used by count-applications-in-range.ts: inclusive start, exclusive end
// (2026-07-19 exclusive means the whole 18th is included).
const RANGE_START = "2026-07-15";
const RANGE_END_EXCLUSIVE = "2026-07-19";

const CHUNK_SIZE = 200;

const isExecute = process.argv.includes("--execute");

const isConnectionError = (error: unknown) =>
  /connection terminated|ECONNRESET|ENOTFOUND|ETIMEDOUT|Connection lost/i.test(
    (error as Error)?.message ?? "",
  );

// Wraps a DB operation so a transient network drop (the staging DB's hostname briefly
// failing to resolve, or the pool's connection getting cut mid-query) doesn't kill a
// run that's minutes into 1000+ rows — reconnect once and retry.
const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (!isConnectionError(error)) throw error;
    logger.warn(`Connection error, reconnecting and retrying once: ${(error as Error).message}`);
    await resetSequelize();
    return fn();
  }
};

const key = (clientId: string | undefined, jobId: string) => `${clientId ?? ""}::${jobId}`;

/**
 * Only fields that exist on both models are copied. Columns that exist as duplicate
 * pairs on the real applications table (confirmed against the reference Python bot's
 * INSERT — the Sequelize model only knows about the camelCase pair, not the lowercase
 * one) get the same value written to both. Everything else on applications with no
 * ManualApplication source is left alone.
 *
 * `id` is never set: the Sequelize model wrongly declares it as a UUID-default STRING,
 * but the real column is an auto-incrementing integer — raw SQL omits it so Postgres
 * assigns the next number itself.
 *
 * "client" (lowercase) is intentionally NOT written — in the reference bot it holds an
 * unrelated numeric customer_id that manual_applications has no equivalent for.
 */
const toApplicationFields = (row: ManualApplication) => ({
  Client: row.client_id,
  Timestamp: row.ApplicationSubmissionDate
    ? row.ApplicationSubmissionDate.toISOString()
    : "N/A",
  Status: "Successful",
  status: "Successful",
  Job_Title: row.Job_Title,
  JobId: row.JobId,
  Internal_Jobsite: row.Internal_Jobsite ?? "N/A",
  InternalJobsite: row.Internal_Jobsite ?? undefined,
  internal_jobsite: row.Internal_Jobsite ?? "N/A",
  External_Jobsite: row.External_Jobsite ?? "N/A",
  ExternalJobsite: row.External_Jobsite ?? undefined,
  external_jobsite: row.External_Jobsite ?? "N/A",
  Job_Type: row.Job_Type ?? "N/A",
  Advertiser: row.Advertiser,
  Location: row.Location,
  Country: row.Country,
  country: row.Country,
  client_id: row.Client,
  ApplicationSubmittedBy: row.ApplicationSubmittedBy,
  updateBy: row.ApplicationSubmittedBy,
  isDeleted: false,
});

type Fields = ReturnType<typeof toApplicationFields>;

const insertBatch = async (entries: Array<Fields & { createdAt: Date; updatedAt: Date }>) => {
  if (entries.length === 0) return [] as Array<{ id: number; client_id: string; JobId: string }>;

  const columns = Object.keys(entries[0]) as Array<keyof (typeof entries)[number]>;
  const quotedColumns = columns.map((c) => `"${c}"`).join(", ");

  const valueGroups: string[] = [];
  const bind: unknown[] = [];
  let i = 1;
  for (const entry of entries) {
    const placeholders = columns.map(() => `$${i++}`);
    valueGroups.push(`(${placeholders.join(", ")})`);
    for (const c of columns) bind.push((entry as any)[c] ?? null);
  }

  // QueryTypes.SELECT (not INSERT) so the RETURNING rows come back as plain objects
  // instead of being interpreted through Sequelize's per-dialect "insert result" shape.
  const rows = await getSequelize().query<{ id: number; client_id: string; JobId: string }>(
    `INSERT INTO applications (${quotedColumns}) VALUES ${valueGroups.join(", ")} RETURNING id, client_id, "JobId"`,
    { bind, type: QueryTypes.SELECT },
  );
  return rows;
};

const updateOne = async (appId: number, fields: Fields) => {
  const columns = Object.keys(fields) as Array<keyof Fields>;
  const setClause = columns.map((c, idx) => `"${c}" = $${idx + 1}`).join(", ");
  const bind = columns.map((c) => (fields as any)[c] ?? null);
  bind.push(new Date()); // updatedAt
  bind.push(appId);

  await getSequelize().query(
    `UPDATE applications SET ${setClause}, "updatedAt" = $${bind.length - 1} WHERE id = $${bind.length}`,
    { bind, type: QueryTypes.UPDATE },
  );
};

export const migrateManualApplicationsToApplications = async (
  rangeStart: string = RANGE_START,
  rangeEndExclusive: string = RANGE_END_EXCLUSIVE,
) => {
  const sequelize = getSequelize();

  const sample = await withRetry(() =>
    sequelize.query<{ Timestamp: string }>(
      `SELECT "Timestamp" FROM applications WHERE "Timestamp" ~ '^\\d{4}' ORDER BY "createdAt" DESC LIMIT 3`,
      { type: QueryTypes.SELECT },
    ),
  );
  logger.info(`Sample existing applications.Timestamp values: ${JSON.stringify(sample.map((s) => s.Timestamp))}`);

  const candidates = await withRetry(() =>
    ManualApplication.findAll({
      where: {
        isDeleted: false,
        Status: { [Op.iLike]: "submitted" },
        ApplicationSubmissionDate: {
          [Op.gte]: new Date(rangeStart),
          [Op.lt]: new Date(rangeEndExclusive),
        },
      },
    }),
  );

  logger.info(`Found ${candidates.length} submitted manual_applications rows in range ${rangeStart} to ${rangeEndExclusive} (exclusive)`);

  // One bulk lookup instead of one SELECT per row — matches on (client_id, JobId) so two
  // different clients applying to the same external job posting never collide.
  const jobIds = [...new Set(candidates.map((c) => c.JobId))];
  const existingRows =
    jobIds.length === 0
      ? []
      : await withRetry(() =>
          sequelize.query<{ id: number; client_id: string; JobId: string }>(
            `SELECT id, client_id, "JobId" FROM applications WHERE "JobId" = ANY($1::text[])`,
            { bind: [jobIds], type: QueryTypes.SELECT },
          ),
        );

  const existingMap = new Map<string, number>();
  for (const r of existingRows) existingMap.set(key(r.client_id, r.JobId), r.id);

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    const chunk = candidates.slice(i, i + CHUNK_SIZE);
    const toInsert: Array<Fields & { createdAt: Date; updatedAt: Date }> = [];

    for (const row of chunk) {
      const k = key(row.client_id, row.JobId);
      const existingId = existingMap.get(k);
      const fields = toApplicationFields(row);

      if (existingId !== undefined) {
        if (isExecute) {
          try {
            await withRetry(() => updateOne(existingId, fields));
          } catch (error) {
            failed += 1;
            logger.error(`Failed to update applications.id=${existingId} for manual_applications id=${row.id}:`, error);
            continue;
          }
        }
        updated += 1;
      } else {
        toInsert.push({ ...fields, createdAt: row.createdAt, updatedAt: new Date() });
      }
    }

    if (toInsert.length > 0) {
      if (isExecute) {
        try {
          const insertedRows = await withRetry(() => insertBatch(toInsert));
          for (const r of insertedRows) existingMap.set(key(r.client_id, r.JobId), r.id);
          inserted += insertedRows.length;
        } catch (error) {
          failed += toInsert.length;
          logger.error(`Failed to insert batch starting at candidate index ${i}:`, error);
        }
      } else {
        // Dry run: still reserve the keys so duplicate JobIds within this same batch are
        // correctly reported as "would update" on their second occurrence.
        for (const row of toInsert) existingMap.set(key(row.client_id, row.JobId), -1);
        inserted += toInsert.length;
      }
    }

    logger.info(
      `Progress: ${Math.min(i + CHUNK_SIZE, candidates.length)}/${candidates.length} (inserted=${inserted}, updated=${updated}, failed=${failed})`,
    );
  }

  const summary = {
    mode: isExecute ? "EXECUTE" : "DRY RUN",
    candidates: candidates.length,
    inserted,
    updated,
    failed,
  };

  logger.info(`Migration summary: ${JSON.stringify(summary)}`);
  return summary;
};

if (require.main === module) {
  require("dotenv").config();

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");

      if (!isExecute) {
        logger.warn("DRY RUN — no rows will be written. Pass --execute to actually migrate.");
      }

      const summary = await migrateManualApplicationsToApplications();
      console.log(summary);

      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Migration failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
