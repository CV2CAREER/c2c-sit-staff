import fs from "fs";
import path from "path";
import { getServiceLogger } from "../utils/createLogger";
import { EmailTemplate } from "../models/v1/email-template.model";

const logger = getServiceLogger("fix-client-revised-documents-template-body");

const TEMPLATE_KEY = "client-revised-documents.ejs";
const isExecute = process.argv.includes("--execute");

/**
 * One-off, surgical companion to the "Go to Profile" link fix in
 * client-revised-documents.ejs — updates ONLY this row's `body` column from
 * the on-disk file. Deliberately narrower than seedEmailTemplates()'s
 * SEED_EMAIL_TEMPLATES_FORCE path, which re-syncs every template's body and
 * would risk clobbering unrelated admin edits made via the panel.
 */
export const fixClientRevisedDocumentsTemplateBody = async (): Promise<void> => {
  const mailDirectory = path.resolve(__dirname, "../views/emails");
  const diskBody = fs.readFileSync(path.join(mailDirectory, TEMPLATE_KEY), "utf-8");

  const row = await EmailTemplate.findOne({ where: { key: TEMPLATE_KEY } });
  if (!row) {
    logger.error(`No email_templates row found for key "${TEMPLATE_KEY}" — nothing to update`);
    return;
  }

  const alreadyCurrent = row.body === diskBody;
  logger.info(
    `Row found (id: ${row.id}). DB body length: ${row.body.length}, disk body length: ${diskBody.length}. ${
      alreadyCurrent ? "Already matches disk — no change needed." : "Differs from disk."
    }`,
  );

  if (alreadyCurrent) return;

  if (!isExecute) {
    logger.info("DRY RUN — pass --execute to apply. No changes made.");
    return;
  }

  await row.update({ body: diskBody, updatedBy: "System (fix-client-revised-documents-template-body script)" });
  logger.info(`Updated body for "${TEMPLATE_KEY}" (row ${row.id}).`);
};

if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info(`Connected to database. Mode: ${isExecute ? "EXECUTE" : "DRY RUN (pass --execute to apply)"}`);
      await fixClientRevisedDocumentsTemplateBody();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Fix script failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
