import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("sync-missing-info-request-columns");

async function syncColumns() {
  const { getSequelize } = require("../utils/sequelize");
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    logger.info("Connected to database");

    const query = sequelize.getQueryInterface();

    const tableInfo = await query.describeTable("missing_info_requests");
    const columns = Object.keys(tableInfo);

    const addColumn = async (col: string, def: string) => {
      if (!columns.includes(col)) {
        await query.addColumn("missing_info_requests", col, def);
        logger.info(`Added column: ${col}`);
      } else {
        logger.info(`Column already exists: ${col}`);
      }
    };

    await addColumn("token", "STRING");
    await addColumn("status", `ENUM('pending','viewed','in_progress','submitted','expired')`);
    await addColumn("channel", `ENUM('email','whatsapp')`);
    await addColumn("personalMessage", "TEXT");
    await addColumn("jobApplicationId", "STRING");
    await addColumn("fulfilledAt", "DATE");

    logger.info("Sync complete");
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error("Sync failed:", error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
}

syncColumns();
