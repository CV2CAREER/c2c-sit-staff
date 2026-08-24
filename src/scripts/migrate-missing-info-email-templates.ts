import fs from "fs";
import path from "path";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("migrate-missing-info-email-templates");

const mailDirectory = path.resolve(__dirname, "../views/emails");

const TEMPLATE_KEYS = [
  "client-missing-info-v2.ejs",
  "admin-missing-info-v2.ejs",
  "missing-info-delivery-report.ejs",
];

if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");

      for (const key of TEMPLATE_KEYS) {
        const filePath = path.join(mailDirectory, key);
        if (!fs.existsSync(filePath)) {
          logger.warn(`File not found: ${filePath}`);
          continue;
        }
        const body = fs.readFileSync(filePath, "utf-8");
        const [affectedRows] = await sequelize.query(
          `UPDATE email_templates SET body = $1, "updatedAt" = NOW() WHERE key = $2`,
          { bind: [body, key] },
        );
        const count = Array.isArray(affectedRows) ? 0 : affectedRows;
        logger.info(`Updated "${key}" — rows affected: ${count}`);
      }

      await sequelize.close();
      logger.info("Migration complete");
      process.exit(0);
    } catch (error) {
      logger.error("Migration failed:", error);
      try { await sequelize.close(); } catch {}
      process.exit(1);
    }
  })();
}
