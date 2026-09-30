import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Sequelize } from "sequelize-typescript";
import { ClientContent } from "../models/v1/client-content.model";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";
import { CLIENT_CONTENT_SEED } from "../constants/client-content.seed";

/**
 * SPR-21-11-001 — seed the two content rows that make the automated payment
 * receipt + onboarding pack admin-editable:
 *
 *   1. `client_contents`  key = "onboarding_pack"      (Content page, next to T&C)
 *   2. `email_templates`  key = "payment-receipt.ejs"  (Communication → Templates)
 *
 * CREATE-ONLY (findOrCreate by key): existing rows are never touched, and the
 * script refuses to run if either key already exists (nothing to do).
 *
 * Usage:
 *   npx tsx src/scripts/seed-spr-21-11-001.ts            # dry-run (prints scope, writes nothing)
 *   npx tsx src/scripts/seed-spr-21-11-001.ts --apply    # insert both rows in one transaction
 *
 * Emoji repair mode (the 2026-09-30 seed captured a mojibake "dY\"Z" that
 * should be the 📎 from the T&C template):
 *   npx tsx src/scripts/seed-spr-21-11-001.ts --fix-emoji          # dry-run (reports row state)
 *   npx tsx src/scripts/seed-spr-21-11-001.ts --fix-emoji --apply  # UPDATE body from disk (1 row)
 */

dotenv.config();

const APPLY = process.argv.includes("--apply");
const FIX_EMOJI = process.argv.includes("--fix-emoji");

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
  models: [ClientContent, EmailTemplate],
});

const RECEIPT_EJS_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "c2c-iat-customer-backend",
  "src",
  "views",
  "emails",
  "payment-receipt.ejs",
);

(async () => {
  try {
    console.log(
      `Environment: host=${process.env.DB_HOST} db=${process.env.DB_NAME} mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
    );

    if (FIX_EMOJI) {
      const CLIP = String.fromCodePoint(0x1f4ce);
      const JUNK = 'dY"Z';
      const row = await EmailTemplate.findOne({ where: { key: "payment-receipt.ejs" } });
      if (!row) throw new Error("payment-receipt.ejs row not found — nothing to fix");
      const diskBody = fs.readFileSync(RECEIPT_EJS_PATH, "utf-8");

      console.log(
        `row id=${row.id} bytes=${Buffer.byteLength(row.body)} hasJunk=${row.body.includes(JUNK)} hasClip=${row.body.includes(CLIP)}`,
      );
      console.log(
        `disk bytes=${Buffer.byteLength(diskBody)} hasJunk=${diskBody.includes(JUNK)} hasClip=${diskBody.includes(CLIP)}`,
      );

      if (!row.body.includes(JUNK)) {
        console.log("Row already clean — nothing to do.");
        process.exit(0);
      }
      if (!APPLY) {
        console.log(
          'DRY-RUN only — would UPDATE email_templates.body (1 row, key="payment-receipt.ejs") to the disk file content.',
        );
        console.log("Re-run with --fix-emoji --apply to write.");
        process.exit(0);
      }

      const updated = await sequelize.transaction(async (transaction) => {
        const [count] = await EmailTemplate.update(
          { body: diskBody },
          { where: { key: "payment-receipt.ejs" }, transaction },
        );
        return count;
      });
      const after = await EmailTemplate.findOne({ where: { key: "payment-receipt.ejs" } });
      const ok =
        updated === 1 &&
        !!after &&
        !after.body.includes(JUNK) &&
        after.body.includes(CLIP);
      console.log(
        `rows updated=${updated}; after: hasJunk=${after?.body.includes(JUNK)} hasClip=${after?.body.includes(CLIP)}`,
      );
      if (!ok) throw new Error("fix verification failed — see counts above");
      console.log("APPLY complete: body replaced (1 row, single transaction).");
      process.exit(0);
    }

    const packSeed = CLIENT_CONTENT_SEED.find((s) => s.key === "onboarding_pack");
    if (!packSeed) throw new Error("onboarding_pack missing from CLIENT_CONTENT_SEED");

    if (!fs.existsSync(RECEIPT_EJS_PATH)) {
      throw new Error(`payment-receipt.ejs not found at ${RECEIPT_EJS_PATH}`);
    }
    const receiptBody = fs.readFileSync(RECEIPT_EJS_PATH, "utf-8");

    const [ccBefore] = await sequelize.query(
      `SELECT count(*)::int AS n FROM client_contents`,
    );
    const [etBefore] = await sequelize.query(
      `SELECT count(*)::int AS n FROM email_templates`,
    );

    const existingPack = await ClientContent.findOne({ where: { key: "onboarding_pack" } });
    const existingReceipt = await EmailTemplate.findOne({ where: { key: "payment-receipt.ejs" } });

    console.log(`client_contents rows before: ${(ccBefore as any)[0].n}`);
    console.log(`email_templates  rows before: ${(etBefore as any)[0].n}`);
    console.log(`onboarding_pack exists: ${existingPack ? "YES" : "NO"}`);
    console.log(`payment-receipt.ejs exists: ${existingReceipt ? "YES" : "NO"}`);
    console.log("");
    console.log("Exact rows that would be INSERTed:");
    console.log(
      JSON.stringify(
        {
          client_contents: {
            key: packSeed.key,
            name: packSeed.name,
            description: packSeed.description,
            placement: packSeed.placement,
            groupName: packSeed.group,
            status: packSeed.status,
            version: 1,
            updatedBy: "System",
            body: `<${packSeed.body.length} chars, starts: ${packSeed.body.slice(0, 60).replace(/\n/g, " ")}...>`,
          },
          email_templates: {
            key: "payment-receipt.ejs",
            name: "Payment Receipt",
            type: "customer",
            variables: [
              "name",
              "planName",
              "amount",
              "orderId",
              "validityPeriod",
              "receiptDate",
              "frontendUrl",
              "currentYear",
            ],
            updatedBy: "System",
            body: `<${receiptBody.length} chars read from ${RECEIPT_EJS_PATH}>`,
          },
        },
        null,
        2,
      ),
    );

    if (existingPack || existingReceipt) {
      console.log("At least one key already exists — nothing to insert.");
      process.exit(0);
    }

    if (!APPLY) {
      console.log("");
      console.log("DRY-RUN only — nothing written. Re-run with --apply to insert.");
      process.exit(0);
    }

    await sequelize.transaction(async (transaction) => {
      await ClientContent.create(
        {
          key: packSeed.key,
          name: packSeed.name,
          description: packSeed.description,
          placement: packSeed.placement,
          group: packSeed.group,
          status: packSeed.status,
          body: packSeed.body,
          version: 1,
          updatedBy: "System",
        },
        { transaction },
      );

      await EmailTemplate.create(
        {
          key: "payment-receipt.ejs",
          name: "Payment Receipt",
          type: EmailTemplateType.CUSTOMER,
          body: receiptBody,
          variables: [
            "name",
            "planName",
            "amount",
            "orderId",
            "validityPeriod",
            "receiptDate",
            "frontendUrl",
            "currentYear",
          ],
          updatedBy: "System",
        },
        { transaction },
      );
    });

    const [ccAfter] = await sequelize.query(
      `SELECT count(*)::int AS n FROM client_contents`,
    );
    const [etAfter] = await sequelize.query(
      `SELECT count(*)::int AS n FROM email_templates`,
    );
    console.log(`client_contents rows after: ${(ccAfter as any)[0].n}`);
    console.log(`email_templates  rows after: ${(etAfter as any)[0].n}`);
    console.log("APPLY complete: 2 rows inserted in one transaction.");
  } finally {
    await sequelize.close();
  }
})();
