import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Sequelize } from "sequelize-typescript";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";

/**
 * SPR-21-11-003 + SPR-21-11-004 — seed the new `email_templates` rows:
 *
 *   SPR-21-11-003 (preferences confirmed):
 *     1. `preferences-submitted.ejs`         type=customer
 *     2. `admin-preferences-confirmed.ejs`   type=admin
 *   SPR-21-11-004 (document accepted):
 *     3. `document-accepted-user.ejs`        type=customer
 *
 * CREATE-ONLY (findOrCreate by key): existing rows are never touched, and the
 * script refuses to run if ALL keys already exist (nothing to do).
 *
 * Usage:
 *   npx tsx src/scripts/seed-spr-21-11-003-004.ts          # dry-run (prints scope, writes nothing)
 *   npx tsx src/scripts/seed-spr-21-11-003-004.ts --apply  # insert missing rows in one transaction
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

const CUSTOMER_BE_EMAILS = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "c2c-iat-customer-backend",
  "src",
  "views",
  "emails",
);

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
    key: "preferences-submitted.ejs",
    name: "Preferences Submitted (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "email", "nextStep", "frontendUrl", "currentYear"],
    sourceDir: CUSTOMER_BE_EMAILS,
  },
  {
    key: "admin-preferences-confirmed.ejs",
    name: "Preferences Confirmed (Admin)",
    type: EmailTemplateType.ADMIN,
    variables: ["clientName", "clientEmail", "profileType", "currentYear"],
    sourceDir: CUSTOMER_BE_EMAILS,
  },
  {
    key: "document-accepted-user.ejs",
    name: "Document Accepted (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "documentType", "frontendUrl", "currentYear"],
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
