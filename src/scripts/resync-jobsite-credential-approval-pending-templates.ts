/**
 * Prod cutover for the jobsite-credential pending + approved email
 * templates.
 *
 * `seedEmailTemplates()` skips existing DB rows by default (admin-
 * editable body protection) and is not called on server boot, so a fresh
 * deploy will NOT refresh the DB copy of these two templates —
 * `sendMail` reads `template.body` from the DB, not disk. Without this
 * cutover the pending + approved emails will keep going out with the OLD
 * copy even after code deploys.
 *
 * This script is a scoped one-off that only touches these two keys and
 * only touches `body` + `variables` — `name`, `type`, and any admin
 * edits to other fields are left alone. Idempotent, safe to re-run.
 *
 * Run once per env (RAT/IAT/SIT/UAT/prod) after this branch merges:
 *   npx tsx src/scripts/resync-jobsite-credential-approval-pending-templates.ts
 *
 * Remove this script + the manual step from the runbook after the next
 * global template resync, or after adopting a boot-time seed here.
 */

import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import path from "node:path";
import { getSequelize } from "../utils/sequelize";
import { EmailTemplate } from "../models/v1/email-template.model";

const TEMPLATES: { key: string; file: string; variables: string[] }[] = [
  {
    key: "jobsite-credential-pending.ejs",
    file: "jobsite-credential-pending.ejs",
    variables: ["name", "email", "isStaffAdded", "frontendUrl", "currentYear"],
  },
  {
    key: "jobsite-credential-approved.ejs",
    file: "jobsite-credential-approved.ejs",
    variables: ["name", "email", "isAmbassador", "frontendUrl", "currentYear"],
  },
];

const emailsDir = path.resolve(__dirname, "..", "views", "emails");

async function main() {
  const sequelize = getSequelize();
  await sequelize.authenticate();
  console.log("Connected to database\n");

  try {
    for (const t of TEMPLATES) {
      const filePath = path.join(emailsDir, t.file);
      if (!fs.existsSync(filePath)) {
        console.log(`SKIP  ${t.key} — file not found at ${filePath}`);
        continue;
      }

      const body = fs.readFileSync(filePath, "utf-8");
      const row = await EmailTemplate.findOne({ where: { key: t.key } });

      if (!row) {
        console.log(
          `SKIP  ${t.key} — no DB row yet; run seed-email-templates.ts first`,
        );
        continue;
      }

      await row.update({
        body,
        variables: t.variables,
        updatedBy: "System",
      });
      console.log(`SYNCED  ${t.key} — body + variables refreshed from disk`);
    }

    console.log("\nDone.");
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("\nFailed:", err);
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

main();
