import { QueryTypes } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { getSequelize } from "../utils/sequelize";

const logger = getServiceLogger("count-applications-in-range");

// Inclusive start date, exclusive end date (i.e. rangeEnd is treated as "up to and including" that day).
const RANGE_START = "2026-07-15";
const RANGE_END_EXCLUSIVE = "2026-07-19"; // day after 2026-07-18 so the whole 18th is counted

interface RangeCounts {
  applications: number;
  manualApplicationsSubmitted: number;
}

export const countApplicationsInRange = async (
  rangeStart: string = RANGE_START,
  rangeEndExclusive: string = RANGE_END_EXCLUSIVE,
): Promise<RangeCounts> => {
  const sequelize = getSequelize();

  // "Timestamp" on applications is a free-text string column (default "N/A"), so it's
  // safely cast to a real timestamp only when it looks like a date, same guard used in
  // client-allocation.controller.ts.
  const [{ count: applicationsCount }] = await sequelize.query<{ count: string }>(
    `
      SELECT COUNT(*)::int AS count
      FROM applications
      WHERE "isDeleted" = false
        AND "Timestamp" ~ '^\\d{4}'
        AND "Timestamp"::timestamp >= $1
        AND "Timestamp"::timestamp < $2
    `,
    {
      bind: [rangeStart, rangeEndExclusive],
      type: QueryTypes.SELECT,
    },
  );

  const [{ count: manualSubmittedCount }] = await sequelize.query<{ count: string }>(
    `
      SELECT COUNT(*)::int AS count
      FROM manual_applications
      WHERE "isDeleted" = false
        AND "Status" ILIKE 'submitted'
        AND "ApplicationSubmissionDate" >= $1
        AND "ApplicationSubmissionDate" < $2
    `,
    {
      bind: [rangeStart, rangeEndExclusive],
      type: QueryTypes.SELECT,
    },
  );

  return {
    applications: Number(applicationsCount) || 0,
    manualApplicationsSubmitted: Number(manualSubmittedCount) || 0,
  };
};

if (require.main === module) {
  require("dotenv").config();

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");

      const { applications, manualApplicationsSubmitted } = await countApplicationsInRange();

      logger.info(
        `Range ${RANGE_START} to ${RANGE_END_EXCLUSIVE} (exclusive) — applications: ${applications}, manual_applications (submitted): ${manualApplicationsSubmitted}`,
      );
      console.log({
        range: { from: RANGE_START, toExclusive: RANGE_END_EXCLUSIVE },
        applications,
        manualApplicationsSubmitted,
      });

      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Count applications in range failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
