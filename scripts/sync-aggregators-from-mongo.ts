// import mongoose, { Schema } from "mongoose";
// import { Client as PgClient } from "pg";
// import { randomUUID } from "crypto";

// type MongoAggregatorDoc = {
//   _id: unknown;
//   name?: unknown;
//   picture?: unknown;
//   isEnabled?: unknown;
//   createdAt?: unknown;
//   updatedAt?: unknown;
// };

// type PgAggregatorRow = {
//   id: string;
//   name: string;
//   isStage?: boolean;
// };

// const decode = (value: string) => Buffer.from(value, "base64").toString("utf8");

// const MONGO_URI = decode(ENCODED.MONGO_URI);
// const MONGO_DB = decode(ENCODED.MONGO_DB);
// const PG_HOST = decode(ENCODED.PG_HOST);
// const PG_PORT = Number.parseInt(decode(ENCODED.PG_PORT), 10);
// const PG_DB = decode(ENCODED.PG_DB);
// const PG_USER = decode(ENCODED.PG_USER);
// const PG_PASS = decode(ENCODED.PG_PASS);

// const toDate = (value: unknown) => {
//   const parsed = value ? new Date(String(value)) : new Date();
//   return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
// };

// const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// const asBoolean = (value: unknown, fallback = false) => {
//   if (typeof value === "boolean") return value;
//   if (typeof value === "number") return value === 1;
//   if (typeof value === "string") {
//     const v = value.trim().toLowerCase();
//     if (["true", "1", "yes"].includes(v)) return true;
//     if (["false", "0", "no"].includes(v)) return false;
//   }
//   return fallback;
// };

// const hasColumn = async (pg: PgClient, table: string, column: string) => {
//   const res = await pg.query(
//     `
//     SELECT 1
//     FROM information_schema.columns
//     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
//     LIMIT 1
//     `,
//     [table, column],
//   );
//   return res.rowCount > 0;
// };

// const resolveTargetTable = async (pg: PgClient) => {
//   const preferred = ["aggregators", "aggregator_throttle_configs"];

//   for (const table of preferred) {
//     const exists = await pg.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
//     if (exists.rows[0]?.reg) return table;
//   }

//   throw new Error(
//     "Could not find target table. Expected one of: public.aggregators or public.aggregator_throttle_configs",
//   );
// };

// const run = async () => {
//   const dryRun = process.argv.includes("--dry-run");

//   const mongoSchema = new Schema(
//     {
//       name: { type: String },
//       picture: { type: Schema.Types.Mixed },
//       isEnabled: { type: Schema.Types.Mixed },
//     },
//     {
//       strict: false,
//       timestamps: true,
//       collection: "aggregators",
//     },
//   );

//   const MongoAggregator =
//     mongoose.models.__mongo_aggregator_sync ||
//     mongoose.model("__mongo_aggregator_sync", mongoSchema);

//   await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });

//   const pg = new PgClient({
//     host: PG_HOST,
//     port: PG_PORT,
//     database: PG_DB,
//     user: PG_USER,
//     password: PG_PASS,
//     ssl: { rejectUnauthorized: false },
//   });

//   await pg.connect();

//   try {
//     const targetTable = await resolveTargetTable(pg);
//     const hasIsStage = await hasColumn(pg, targetTable, "isStage");
//     const hasConfig = await hasColumn(pg, targetTable, "config");
//     const hasUpdatedByUserId = await hasColumn(pg, targetTable, "updatedByUserId");
//     const hasUserId = await hasColumn(pg, targetTable, "userId");
//     const hasIsDeleted = await hasColumn(pg, targetTable, "isDeleted");

//     const sourceDocs = (await MongoAggregator.find({}).lean()) as MongoAggregatorDoc[];

//     const normalized = sourceDocs
//       .map((doc) => ({
//         name: asString(doc.name),
//         picture: doc.picture ?? {},
//         isEnabled: asBoolean(doc.isEnabled, false),
//         createdAt: toDate(doc.createdAt),
//         updatedAt: toDate(doc.updatedAt),
//       }))
//       .filter((row) => row.name.length > 0);

//     const dedupMap = new Map<string, (typeof normalized)[number]>();
//     for (const row of normalized) {
//       dedupMap.set(row.name.toLowerCase(), row);
//     }
//     const deduped = [...dedupMap.values()];

//     const existing = await pg.query<PgAggregatorRow>(
//       hasIsStage
//         ? `SELECT id, name, "isStage" FROM "${targetTable}"`
//         : `SELECT id, name FROM "${targetTable}"`,
//     );

//     const existingByKey = new Map<string, PgAggregatorRow>();
//     for (const row of existing.rows) {
//       const key = hasIsStage
//         ? `${row.name.toLowerCase()}::${row.isStage ? "stage" : "live"}`
//         : row.name.toLowerCase();
//       existingByKey.set(key, row);
//     }

//     let inserted = 0;
//     let updated = 0;

//     if (!dryRun) {
//       await pg.query("BEGIN");
//     }

//     for (const row of deduped) {
//       const key = hasIsStage ? `${row.name.toLowerCase()}::live` : row.name.toLowerCase();
//       const matched = existingByKey.get(key);

//       if (matched) {
//         const setClauses = [
//           `name = $1`,
//           `picture = $2::jsonb`,
//           `"isEnabled" = $3`,
//           `"updatedAt" = $4`,
//         ];

//         const values: unknown[] = [
//           row.name,
//           JSON.stringify(row.picture ?? {}),
//           row.isEnabled,
//           row.updatedAt,
//         ];

//         if (hasConfig) {
//           setClauses.push(`config = COALESCE(config, '{}'::jsonb)`);
//         }

//         if (hasUpdatedByUserId) {
//           setClauses.push(`"updatedByUserId" = NULL`);
//         }

//         if (hasUserId) {
//           setClauses.push(`"userId" = NULL`);
//         }

//         if (hasIsDeleted) {
//           setClauses.push(`"isDeleted" = FALSE`);
//         }

//         const sql = `
//           UPDATE "${targetTable}"
//           SET ${setClauses.join(", ")}
//           WHERE id = $5
//         `;

//         if (!dryRun) {
//           await pg.query(sql, [...values, matched.id]);
//         }
//         updated += 1;
//       } else {
//         const columns = ["id", "name", "picture", "isEnabled", "createdAt", "updatedAt"];
//         const values: unknown[] = [
//           randomUUID(),
//           row.name,
//           JSON.stringify(row.picture ?? {}),
//           row.isEnabled,
//           row.createdAt,
//           row.updatedAt,
//         ];

//         if (hasConfig) {
//           columns.push("config");
//           values.push("{}");
//         }

//         if (hasUpdatedByUserId) {
//           columns.push("updatedByUserId");
//           values.push(null);
//         }

//         if (hasUserId) {
//           columns.push("userId");
//           values.push(null);
//         }

//         if (hasIsStage) {
//           columns.push("isStage");
//           values.push(false);
//         }

//         if (hasIsDeleted) {
//           columns.push("isDeleted");
//           values.push(false);
//         }

//         const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
//         const sql = `INSERT INTO "${targetTable}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

//         if (!dryRun) {
//           await pg.query(sql, values);
//         }
//         inserted += 1;
//       }
//     }

//     if (!dryRun) {
//       await pg.query("COMMIT");
//     }

//     console.log("--------------------------------------------------");
//     console.log(`Target table: ${targetTable}`);
//     console.log(`Source Mongo records: ${sourceDocs.length}`);
//     console.log(`Normalized unique records: ${deduped.length}`);
//     console.log(`Inserted: ${inserted}`);
//     console.log(`Updated: ${updated}`);
//     console.log(`Mode: ${dryRun ? "DRY RUN" : "WRITE"}`);
//     console.log("--------------------------------------------------");
//   } catch (error) {
//     await pg.query("ROLLBACK").catch(() => undefined);
//     throw error;
//   } finally {
//     await pg.end();
//     await mongoose.disconnect();
//   }
// };

// run().catch((error) => {
//   console.error("Aggregator migration failed:", error);
//   process.exit(1);
// });
