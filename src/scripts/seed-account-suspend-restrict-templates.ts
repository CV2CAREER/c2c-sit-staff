import fs from "fs";
import path from "path";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";
import { getServiceLogger } from "../utils/createLogger";
import { getSequelize } from "../utils/sequelize";

const logger = getServiceLogger("seed-account-suspend-restrict-templates");

// SPR-19-16-001 + 005: creates the EmailTemplate rows that back the
// suspend/restrict services and the new client-facing referrer-assigned
// email. Idempotent — findOrCreate keeps existing rows untouched so
// admin-edited copy is not clobbered (same safety concern as PR #235).
// Applied once per environment by the DB developer:
//   IAT   — applied by Kayode
//   SIT / UAT / PROD — DB dev to run after deploy
const TEMPLATE_META = [
  {
    key: "account-suspended-user.ejs",
    name: "Account Suspended (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "frontendUrl", "currentYear"],
  },
  {
    key: "account-suspended-admin.ejs",
    name: "Account Suspended (Delivery Team)",
    type: EmailTemplateType.ADMIN,
    variables: [
      "clientName",
      "clientEmail",
      "suspendedBy",
      "frontendUrl",
      "currentYear",
    ],
  },
  {
    key: "account-restricted-user.ejs",
    name: "Account Restricted (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: ["name", "frontendUrl", "currentYear"],
  },
  {
    key: "account-restricted-admin.ejs",
    name: "Account Restricted (Delivery Team)",
    type: EmailTemplateType.ADMIN,
    variables: [
      "clientName",
      "clientEmail",
      "restrictedBy",
      "frontendUrl",
      "currentYear",
    ],
  },
  {
    key: "referrer-assigned-user.ejs",
    name: "Referrer Assigned (User)",
    type: EmailTemplateType.CUSTOMER,
    variables: [
      "name",
      "humanMode",
      "referrerLabel",
      "referralNumber",
      "freeBeforeReferral",
      "frontendUrl",
      "currentYear",
    ],
  },
] as const;

const readTemplate = (key: string) =>
  fs.readFileSync(
    path.resolve(__dirname, "..", "views", "emails", key),
    "utf8",
  );

export const seedAccountSuspendRestrictTemplates = async (): Promise<void> => {
  let created = 0;
  let existing = 0;
  for (const meta of TEMPLATE_META) {
    const body = readTemplate(meta.key);
    const [, wasCreated] = await EmailTemplate.findOrCreate({
      where: { key: meta.key },
      defaults: {
        key: meta.key,
        name: meta.name,
        type: meta.type,
        body,
        variables: meta.variables as unknown as string[],
        updatedBy: "System (SPR-19-16-001 cutover)",
      },
    });
    if (wasCreated) {
      created += 1;
      logger.info(`CREATED ${meta.key}`);
    } else {
      existing += 1;
      logger.info(`EXISTS  ${meta.key} — not overwritten`);
    }
  }
  logger.info(`Seed done — ${created} created, ${existing} existing`);
};

if (require.main === module) {
  require("dotenv").config();
  (async () => {
    const s = getSequelize();
    try {
      await s.authenticate();
      logger.info("Connected to DB");
      await seedAccountSuspendRestrictTemplates();
      await s.close();
      process.exit(0);
    } catch (e) {
      logger.error("Seed failed:", e);
      try {
        await s.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
