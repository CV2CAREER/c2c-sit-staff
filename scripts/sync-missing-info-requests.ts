import { Sequelize } from "sequelize";
import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
  DB_STATEMENT_TIMEOUT,
} from "../src/config/env";

const NEW_COLUMNS = [
  { name: "templateId",   sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "templateId" VARCHAR(255);` },
  { name: "token",        sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "token" VARCHAR(255);` },
  { name: "status",       sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'pending';` },
  { name: "channel",      sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "channel" VARCHAR(20) DEFAULT 'whatsapp';` },
  { name: "personalMessage", sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "personalMessage" TEXT;` },
  { name: "jobApplicationId", sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "jobApplicationId" VARCHAR(255);` },
  { name: "reminderCount", sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER DEFAULT 0;` },
  { name: "lastReminderAt", sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP;` },
  { name: "fulfilledAt",  sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP;` },
  { name: "requestedByName", sql: `ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "requestedByName" VARCHAR(255) NOT NULL DEFAULT 'Unknown';` },
];

async function run() {
  const sequelize = new Sequelize({
    database: DATABASE_NAME,
    username: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    dialect: "postgres",
    logging: console.log,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      statement_timeout: DB_STATEMENT_TIMEOUT,
    },
  });

  try {
    await sequelize.authenticate();
    console.log("Connected. Adding columns to missing_info_requests...\n");

    for (const col of NEW_COLUMNS) {
      try {
        await sequelize.query(col.sql);
        console.log(`  ✓ ${col.name}`);
      } catch (err: any) {
        if (err.message?.includes("already exists")) {
          console.log(`  – ${col.name} (already exists)`);
        } else {
          console.error(`  ✗ ${col.name}: ${err.message}`);
        }
      }
    }

    console.log("\nDone.");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await sequelize.close();
  }
}

run();
