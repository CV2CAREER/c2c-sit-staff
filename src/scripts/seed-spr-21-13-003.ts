import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Sequelize } from "sequelize-typescript";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";

/**
 * SPR-21-13-003 — seed the two `email_templates` rows behind the First
 * Application Sent notify (Notification Audit, step 24):
 *
 *   1. `first-application-submitted-client.ejs`  customer — "your first
 *      application has been submitted"
 *   2. `first-application-submitted-admin.ejs`   delivery team copy
 *
 * Sent by the staff BE when `applications_started` is auto-completed by the
 * applications-started cron (or attested manually)
 * (client-journey-notify.service.ts STEP_MAILS).
 *
 * CREATE-ONLY (findOrCreate by key): existing rows are never touched, and the
 * script refuses to run if ALL keys already exist (nothing to do).
 *
 * Usage:
 *   npx tsx src/scripts/seed-spr-21-13-003.ts          # dry-run (prints scope, writes nothing)
 *   npx tsx src/scripts/seed-spr-21-13-003.ts --apply  # insert missing rows in one transaction
 */

dotenv.config();

const APPLY = process.argv.includes("--apply");

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  models: [EmailTemplate],
});

const STAFF_BE_EMAILS = path.resolve(__dirname, "..", "views", "emails");

interface TemplateSeed {
  key: string;
  name: string;
  type: EmailTemplateType;
  variables: string[];
  sourceDir: string;
}

const TEMPLATES: TemplateSeed[] = [
  {
    key: "first-application-submitted-client.ejs",
    name: "First Application Sent (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "frontendUrl", "currentYear"],
    sourceDir: STAFF_BE_EMAILS,
  },
  {
    key: "first-application-submitted-admin.ejs",
    name: "First Application Sent (Delivery Team)",
    type: EmailTemplateType.ADMIN,
    variables: ["clientName", "clientEmail", "plan", "link", "frontendUrl", "currentYear"],
    sourceDir: STAFF_BE_EMAILS,
  },
];

(async () => {
  try {
    console.log(
      `Environment: host=${process.env.DB_HOST} db=${process.env.DB_NAME} mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
    );

    const rows = TEMPLATES.map((t) => {
      const filePath = path.join(t.sourceDir, t.key);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Template file not found: ${filePath}`);
      }
      return { seed: t, filePath, body: fs.readFileSync(filePath, "utf-8") };
    });

    const [etBefore] = await sequelize.query(
      `SELECT count(*)::int AS n FROM email_templates`,
    );
    console.log(`email_templates rows before: ${(etBefore as any)[0].n}`);

    const existing = new Map<string, boolean>();
    for (const r of rows) {
      const found = await EmailTemplate.findOne({ where: { key: r.seed.key } });
      existing.set(r.seed.key, Boolean(found));
    }

    console.log("");
    console.log("Exact rows that would be INSERTed (missing only):");
    for (const r of rows) {
      const exists = existing.get(r.seed.key);
      console.log(
        JSON.stringify(
          {
            [r.seed.key]: {
              name: r.seed.name,
              type: r.seed.type,
              variables: r.seed.variables,
              updatedBy: "System",
              alreadyExists: exists ? "YES (skipped)" : "NO",
              body: `<${r.body.length} chars read from ${r.filePath}>`,
            },
          },
          null,
          2,
        ),
      );
    }

    const toInsert = rows.filter((r) => !existing.get(r.seed.key));

    if (toInsert.length === 0) {
      console.log("All keys already exist — nothing to insert.");
      process.exit(0);
    }

    if (!APPLY) {
      console.log("");
      console.log(
        `DRY-RUN only — nothing written. Re-run with --apply to insert ${toInsert.length} row(s).`,
      );
      process.exit(0);
    }

    await sequelize.transaction(async (transaction) => {
      for (const r of toInsert) {
        await EmailTemplate.create(
          {
            key: r.seed.key,
            name: r.seed.name,
            type: r.seed.type,
            body: r.body,
            variables: r.seed.variables,
            updatedBy: "System",
          },
          { transaction },
        );
      }
    });

    const [etAfter] = await sequelize.query(
      `SELECT count(*)::int AS n FROM email_templates`,
    );
    console.log(`email_templates rows after: ${(etAfter as any)[0].n}`);
    console.log(
      `APPLY complete: ${toInsert.length} row(s) inserted in one transaction.`,
    );
  } finally {
    await sequelize.close();
  }
})();
