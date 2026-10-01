import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Sequelize } from "sequelize-typescript";
import { EmailTemplate } from "../models/v1/email-template.model";

/**
 * SPR-21-11-006 — update the EXISTING `email_templates` body for
 * `welcome-call-scheduled-client.ejs` so the seeded row matches the file on
 * disk (the .ics paragraph added by this item). Sent mail renders from the DB
 * row, not from src/views, so the file edit alone is not enough.
 *
 * UPDATE against a single row keyed by `key`, guarded with an optimistic
 * WHERE on the old body; runs in one transaction; rows before/after verified.
 *
 * Usage:
 *   npx tsx src/scripts/update-spr-21-11-006-ics-body.ts          # dry-run (prints full before/after bodies, writes nothing)
 *   npx tsx src/scripts/update-spr-21-11-006-ics-body.ts --apply  # UPDATE in one transaction
 */

dotenv.config();

const APPLY = process.argv.includes("--apply");
const KEY = "welcome-call-scheduled-client.ejs";

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

const firstLastDiff = (before: string, after: string): void => {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  let lo = 0;
  while (lo < Math.min(a.length, b.length) && a[lo] === b[lo]) lo++;
  let hiA = a.length - 1;
  let hiB = b.length - 1;
  while (hiA >= lo && hiB >= lo && a[hiA] === b[hiB]) {
    hiA--;
    hiB--;
  }
  console.log(`Changed window: old lines ${lo + 1}-${hiA + 1} / new lines ${lo + 1}-${hiB + 1}`);
  console.log(`--- BEFORE (old lines ${lo + 1}-${hiA + 1}) ---`);
  console.log(a.slice(lo, hiA + 1).join("\n"));
  console.log(`+++ AFTER (new lines ${lo + 1}-${hiB + 1}) +++`);
  console.log(b.slice(lo, hiB + 1).join("\n"));
};

(async () => {
  try {
    console.log(
      `Environment: host=${process.env.DB_HOST} db=${process.env.DB_NAME} mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
    );

    const filePath = path.resolve(__dirname, "..", "views", "emails", KEY);
    const newBody = fs.readFileSync(filePath, "utf-8");

    const [rows] = await sequelize.query(
      `SELECT id, key, name, type, "updatedAt", length(body) AS body_len
         FROM email_templates WHERE key = :key`,
      { replacements: { key: KEY } },
    );
    const row = (rows as any[])[0];
    if (!row) {
      throw new Error(`Row not found for key=${KEY} — nothing to update.`);
    }

    console.log("");
    console.log("Exact scope — 1 row:");
    console.log(
      JSON.stringify(
        {
          table: "email_templates",
          id: row.id,
          key: row.key,
          name: row.name,
          type: row.type,
          updatedAt: row.updatedAt,
          body_len_db: Number(row.body_len),
          body_len_file: newBody.length,
        },
        null,
        2,
      ),
    );

    const [beforeRows] = await sequelize.query(
      `SELECT body FROM email_templates WHERE key = :key`,
      { replacements: { key: KEY } },
    );
    const oldBody = (beforeRows as any[])[0].body as string;

    if (oldBody === newBody) {
      console.log("DB body already matches the file — nothing to update.");
      process.exit(0);
    }

    console.log("");
    console.log("=== CHANGED LINES ===");
    firstLastDiff(oldBody, newBody);

    console.log("");
    const [etBefore] = await sequelize.query(
      `SELECT count(*)::int AS n FROM email_templates`,
    );
    console.log(`email_templates rows before: ${(etBefore as any)[0].n}`);

    if (!APPLY) {
      console.log("");
      console.log("=== FULL BEFORE BODY (recovery copy) ===");
      console.log(oldBody);
      console.log("=== END BEFORE BODY ===");
      console.log(
        `DRY-RUN only — nothing written. Re-run with --apply to UPDATE 1 row (id=${row.id}, key=${KEY}).`,
      );
      process.exit(0);
    }

    const updated = await sequelize.transaction(async (transaction) => {
      const [cnt] = await sequelize.query(
        `SELECT count(*)::int AS n FROM email_templates WHERE key = :key`,
        { replacements: { key: KEY }, transaction },
      );
      const n = Number((cnt as any[])[0].n);
      if (n !== 1) {
        throw new Error(`Expected exactly 1 row for key=${KEY}, found ${n} — rolled back.`);
      }
      await sequelize.query(
        `UPDATE email_templates
            SET body = :newBody, "updatedAt" = now()
          WHERE key = :key AND body = :oldBody`,
        {
          replacements: { newBody, key: KEY, oldBody },
          transaction,
        },
      );
      // Driver-independent assertion: the row must now hold the new body
      // (the optimistic WHERE guarantees nothing else was touched).
      const [check] = await sequelize.query(
        `SELECT body FROM email_templates WHERE key = :key`,
        { replacements: { key: KEY }, transaction },
      );
      const current = (check as any[])[0]?.body as string | undefined;
      if (current !== newBody) {
        throw new Error(
          `Post-update verification failed (body ${current?.length ?? "missing"} chars, expected ${newBody.length}) — rolled back.`,
        );
      }
      return current.length;
    });
    console.log(`verified body inside transaction: ${updated} chars`);

    const [etAfter] = await sequelize.query(
      `SELECT count(*)::int AS n FROM email_templates`,
    );
    console.log(`email_templates rows after: ${(etAfter as any)[0].n}`);
    console.log(
      `APPLY complete: 1 row updated (id=${row.id}, key=${KEY}, body ${oldBody.length} -> ${newBody.length} chars) in one transaction. ` +
        `Recovery: previous body printed by the dry-run; re-run dry-run against git history of src/views/emails/${KEY} for the file copy.`,
    );
  } finally {
    await sequelize.close();
  }
})();
