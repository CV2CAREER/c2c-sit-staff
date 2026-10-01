import dotenv from "dotenv";
dotenv.config();
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { JourneyMessageLog } from "../models/v1/journey-message-log.model";

/**
 * SPR-21-11-007 — create the `journey_message_logs` audit table on the
 * target database (the app normally creates it at boot via
 * src/config/database.ts line 98 `JourneyMessageLog.sync({ force: false })`).
 *
 * CREATE-ONLY: no-op if the table already exists; never drops or alters.
 *
 * Usage:
 *   npx tsx src/scripts/create-spr-21-11-007-log-table.ts          # dry-run
 *   npx tsx src/scripts/create-spr-21-11-007-log-table.ts --apply   # CREATE TABLE
 */

const APPLY = process.argv.includes("--apply");

async function main() {
  const sequelize = new Sequelize({
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    models: [JourneyMessageLog],
  });

  console.log(`Connected to DB @ ${process.env.DB_HOST}`);
  console.log(`Database: ${process.env.DB_NAME}`);

  const [before] = await sequelize.query<{ reg: string | null }>(
    "SELECT to_regclass('public.journey_message_logs') AS reg",
    { type: QueryTypes.SELECT },
  );

  if (before?.reg) {
    console.log(`journey_message_logs already exists (${before.reg}) — nothing to do.`);
    await sequelize.close();
    return;
  }

  if (!APPLY) {
    console.log(
      `DRY-RUN only — nothing written. Re-run with --apply to CREATE TABLE journey_message_logs (empty, no data touched).`,
    );
    await sequelize.close();
    return;
  }

  await sequelize.sync({ force: false });

  const [after] = await sequelize.query<{ reg: string | null }>(
    "SELECT to_regclass('public.journey_message_logs') AS reg",
    { type: QueryTypes.SELECT },
  );
  if (!after?.reg) {
    throw new Error("Post-create verification failed — table still missing.");
  }
  const [cnt] = await sequelize.query<{ c: string }>(
    "SELECT count(*)::text AS c FROM journey_message_logs",
    { type: QueryTypes.SELECT },
  );
  console.log(`APPLIED — table journey_message_logs created (rows: ${cnt?.c}).`);
  await sequelize.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
