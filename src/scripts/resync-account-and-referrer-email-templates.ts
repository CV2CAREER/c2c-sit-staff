/**
 * Prod cutover for the 5 email templates added to support the account-
 * approve / account-delete / referrer-assign admin actions.
 *
 * `seedEmailTemplates()` on this repo skips existing DB rows by default
 * (admin-editable body protection) and is not called on server boot, so
 * a deploy alone will not create these new rows either — `sendMail`
 * looks up templates by `key` in the DB, and a missing row falls back to
 * disk with a Slack warning per send.
 *
 * This script upserts only the 5 keys below. Idempotent, safe to
 * re-run. Removes the runbook step once staff BE adopts a boot-time
 * seed or those 5 keys are picked up by the next global template
 * refresh.
 *
 * Run once per env (RAT/IAT/SIT/UAT/prod) after this branch merges:
 *   npx tsx src/scripts/resync-account-and-referrer-email-templates.ts
 */

import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import path from "node:path";
import { getSequelize } from "../utils/sequelize";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";

const TEMPLATES: {
  key: string;
  name: string;
  type: EmailTemplateType;
  file: string;
  variables: string[];
}[] = [
  {
    key: "account-approved-user.ejs",
    name: "Account Approved (Client)",
    type: EmailTemplateType.CUSTOMER,
    file: "account-approved-user.ejs",
    variables: ["name", "frontendUrl", "currentYear"],
  },
  {
    key: "account-approved-admin.ejs",
    name: "Admin: Account Approved",
    type: EmailTemplateType.ADMIN,
    file: "account-approved-admin.ejs",
    variables: ["clientName", "clientEmail", "approvedBy", "frontendUrl", "currentYear"],
  },
  {
    key: "account-deleted-user.ejs",
    name: "Account Deleted (Client)",
    type: EmailTemplateType.CUSTOMER,
    file: "account-deleted-user.ejs",
    variables: ["name", "frontendUrl", "currentYear"],
  },
  {
    key: "account-deleted-admin.ejs",
    name: "Admin: Account Deleted",
    type: EmailTemplateType.ADMIN,
    file: "account-deleted-admin.ejs",
    variables: ["clientName", "clientEmail", "purgedBy", "frontendUrl", "currentYear"],
  },
  {
    key: "referrer-assigned-admin.ejs",
    name: "Admin: Referrer Assigned",
    type: EmailTemplateType.ADMIN,
    file: "referrer-assigned-admin.ejs",
    variables: [
      "clientName",
      "clientEmail",
      "referrerLabel",
      "referralNumber",
      "freeBeforeReferral",
      "assignedBy",
      "frontendUrl",
      "currentYear",
    ],
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
        console.log(`SKIP    ${t.key} — file not found at ${filePath}`);
        continue;
      }

      const body = fs.readFileSync(filePath, "utf-8");
      const [row, wasCreated] = await EmailTemplate.findOrCreate({
        where: { key: t.key },
        defaults: {
          key: t.key,
          name: t.name,
          type: t.type,
          body,
          variables: t.variables,
          updatedBy: "System",
        } as any,
      });

      if (wasCreated) {
        console.log(`CREATED ${t.key}`);
      } else {
        await row.update({ body, variables: t.variables, updatedBy: "System" });
        console.log(`SYNCED  ${t.key} — body + variables refreshed from disk`);
      }
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
