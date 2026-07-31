import fs from "fs";
import path from "path";
import { getServiceLogger } from "../utils/createLogger";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";

const logger = getServiceLogger("seed-application-action-user-email");

export const APPLICATION_ACTION_USER_EMAIL_KEY = "application-action-user.ejs";

const TEMPLATE_PATH = path.resolve(
  __dirname,
  "../views/emails",
  APPLICATION_ACTION_USER_EMAIL_KEY,
);

/**
 * Pushes the on-disk application-action-user.ejs body (redesigned to match
 * client-missing-info.ejs's layout) into its `email_templates` row. Unlike
 * seed-email-templates.ts's bulk pass, this only ever touches this one key —
 * safe to run without disturbing other templates an admin may have edited
 * via the panel. Re-running always overwrites the row's body/variables from
 * disk, since this script exists specifically to push this redesign.
 */
export const seedApplicationActionUserEmail = async (): Promise<void> => {
  const body = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const variables = ["name", "email", "frontendUrl", "action", "currentYear"];

  const [row, wasCreated] = await EmailTemplate.findOrCreate({
    where: { key: APPLICATION_ACTION_USER_EMAIL_KEY },
    defaults: {
      key: APPLICATION_ACTION_USER_EMAIL_KEY,
      name: "Application Commenced/Ended",
      type: EmailTemplateType.CUSTOMER,
      body,
      variables,
      updatedBy: "System",
    },
  });

  if (wasCreated) {
    logger.info(`Created "${APPLICATION_ACTION_USER_EMAIL_KEY}" email template row`);
    return;
  }

  await row.update({
    name: "Application Commenced/Ended",
    type: EmailTemplateType.CUSTOMER,
    body,
    variables,
    updatedBy: "System",
  });
  logger.info(`Refreshed "${APPLICATION_ACTION_USER_EMAIL_KEY}" email template row from disk`);
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/seed-application-action-user-email.ts
// Guarded so `connectDB()` importing seedApplicationActionUserEmail() above
// doesn't also trigger this block and exit the running server process.
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await seedApplicationActionUserEmail();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Failed to seed application-action-user email template", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
