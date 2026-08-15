import { getServiceLogger } from "../utils/createLogger";
import { QueryTypes } from "sequelize";
import { getSequelize } from "../utils/sequelize";
import { ApplicationStatus } from "../utils/enum";

const logger = getServiceLogger("backfill-application-status-not-started");

/**
 * SPR-17-049 backfill. Historically the users.applicationStatus column had a
 * DB-level DEFAULT of 'Commenced', so every signup landed as Commenced even
 * before any application was triggered. Only rows that (a) still hold that
 * default value AND (b) never had an application started are considered
 * "untriggered" and are safe to flip to Not Started. Anything explicitly set
 * to Commenced by an application flow — signalled by isApplicationStarted=true
 * — is left alone.
 */
export const backfillApplicationStatusNotStarted = async (): Promise<void> => {
  const sequelize = getSequelize();

  const [affectedRows] = await sequelize.query(
    `
      UPDATE users
         SET "applicationStatus" = :notStarted
       WHERE "applicationStatus" = :commenced
         AND "isApplicationStarted" = false
         AND "deletedAt" IS NULL
    `,
    {
      type: QueryTypes.UPDATE,
      replacements: {
        notStarted: ApplicationStatus.NOT_STARTED,
        commenced: ApplicationStatus.COMMENCED,
      },
    },
  );

  logger.info(
    `Application status backfill complete — ${affectedRows ?? 0} rows flipped from Commenced -> Not Started`,
  );
};

if (require.main === module) {
  require("dotenv").config();

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await backfillApplicationStatusNotStarted();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Application status backfill failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
