import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Sequelize } from "sequelize-typescript";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";

/**
 * SPR-21-13-007 — seed the three `email_templates` rows behind the Campaign
 * Ended notification and the exit-survey receipt (Notification Audit steps
 * 36-37):
 *
 *   1. `campaign-ended-client.ejs`    customer copy: journey summary + exit-
 *                                      survey CTA (DoD1-2)
 *   2. `campaign-ended-admin.ejs`     delivery-team copy of the campaign-end
 *                                      notification (DoD3, delivery channel)
 *   3. `exit-survey-admin.ejs`        delivery-team receipt carrying the
 *                                      client's answers (step 37, admin copy)
 *
 * The Town Crier posts and the customer's survey-page redirect need no rows —
 * they are the shared Slack path and the frontend route respectively.
 *
 * CREATE-ONLY (findOrCreate by key): existing rows are never touched, and the
 * script refuses to run if ALL keys already exist (nothing to do).
 *
 * Usage:
 *   npx tsx src/scripts/seed-spr-21-13-007.ts          # dry-run (prints scope, writes nothing)
 *   npx tsx src/scripts/seed-spr-21-13-007.ts --apply  # insert missing rows in one transaction
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
    key: "campaign-ended-client.ejs",
    name: "Campaign Ended (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "journeySummary", "surveyUrl", "frontendUrl", "currentYear"],
    sourceDir: STAFF_BE_EMAILS,
  },
  {
    key: "campaign-ended-admin.ejs",
    name: "Campaign Ended (Delivery Team)",
    type: EmailTemplateType.ADMIN,
    variables: [
      "clientName",
      "clientEmail",
      "plan",
      "stepsCompleted",
      "link",
      "frontendUrl",
      "currentYear",
    ],
    sourceDir: STAFF_BE_EMAILS,
  },
  {
    key: "exit-survey-admin.ejs",
    name: "Exit Survey Submitted (Delivery Team)",
    type: EmailTemplateType.ADMIN,
    variables: [
      "clientName",
      "clientEmail",
      "plan",
      "satisfaction",
      "wentWell",
      "improvement",
      "comments",
      "link",
      "frontendUrl",
      "currentYear",
    ],
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
