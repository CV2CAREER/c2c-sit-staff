import { getServiceLogger } from "../utils/createLogger";
import { EmailTemplate } from "../models/v1/email-template.model";
import { TEMPLATE_META } from "./seed-email-templates";

const logger = getServiceLogger("backfill-email-template-variables");

/**
 * Backfills only the `variables` column on existing email_templates rows from
 * TEMPLATE_META, for rows created before that metadata existed. Unlike
 * seedEmailTemplates()'s force-update path, this never touches `body`, `name`,
 * or `type` — safe to run even if templates have since been edited via the
 * admin UI.
 */
export const backfillEmailTemplateVariables = async (): Promise<void> => {
  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const [key, meta] of Object.entries(TEMPLATE_META)) {
    const row = await EmailTemplate.findOne({ where: { key } });
    if (!row) {
      missing += 1;
      continue;
    }

    const current = JSON.stringify(row.variables ?? []);
    const next = JSON.stringify(meta.variables);
    if (current === next) {
      skipped += 1;
      continue;
    }

    await row.update({ variables: meta.variables });
    updated += 1;
    logger.info(`Updated variables for ${key}: ${JSON.stringify(meta.variables)}`);
  }

  logger.info(
    `Variables backfill complete — ${updated} updated, ${skipped} already current, ${missing} not found in DB`,
  );
};

if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await backfillEmailTemplateVariables();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Variables backfill failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
