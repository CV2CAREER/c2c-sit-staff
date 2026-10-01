import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Sequelize } from "sequelize-typescript";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";

/**
 * SPR-21-11-006 / SPR-21-11-010 — seed the new `email_templates` rows for
 * the Welcome Call pair (steps 7-8) and the Preference Review Session
 * (step 17):
 *
 *   1. `welcome-call-scheduled-client.ejs`      006, scheduled (date/time)
 *   2. `welcome-call-completed-client.ejs`      006, completed (next steps)
 *   3. `preference-review-scheduled-client.ejs` 010, scheduled (+ .ics)
 *   4. `preference-review-completed-client.ejs` 010, completed (outcomes)
 *
 * All four are sent by the staff BE when the step is attested
 * (client-journey-notify.service.ts STEP_MAILS).
 *
 * CREATE-ONLY (findOrCreate by key): existing rows are never touched, and the
 * script refuses to run if ALL keys already exist (nothing to do).
 *
 * Usage:
 *   npx tsx src/scripts/seed-spr-21-11-006-010.ts          # dry-run (prints scope, writes nothing)
 *   npx tsx src/scripts/seed-spr-21-11-006-010.ts --apply  # insert missing rows in one transaction
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
    key: "welcome-call-scheduled-client.ejs",
    name: "Welcome Call Scheduled (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "dateTime", "frontendUrl", "currentYear"],
    sourceDir: STAFF_BE_EMAILS,
  },
  {
    key: "welcome-call-completed-client.ejs",
    name: "Welcome Call Completed — Next Steps (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "dateTime", "note", "frontendUrl", "currentYear"],
    sourceDir: STAFF_BE_EMAILS,
  },
  {
    key: "preference-review-scheduled-client.ejs",
    name: "Preference Review Session Scheduled (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "dateTime", "frontendUrl", "currentYear"],
    sourceDir: STAFF_BE_EMAILS,
  },
  {
    key: "preference-review-completed-client.ejs",
    name: "Preference Review Session Completed (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "dateTime", "note", "frontendUrl", "currentYear"],
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
