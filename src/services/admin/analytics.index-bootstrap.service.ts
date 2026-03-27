import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";
import {
  ApplicationsTableShape,
  getApplicationsTableShape,
} from "./analytics.table-shape.service";

const logger = getServiceLogger("analytics-index-bootstrap-service");

const APPLICATIONS_TABLE = "applications";

let didEnsureAnalyticsIndexes = false;
let ensureAnalyticsIndexesPromise: Promise<void> | null = null;

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, "\"\"")}"`;

const buildApplicationsWhereClause = (shape: ApplicationsTableShape): string =>
  shape.deletedAtColumn
    ? ` WHERE ${quoteIdentifier(shape.deletedAtColumn)} IS NULL`
    : "";

const runSafeStatement = async (sql: string, label: string) => {
  try {
    const sequelize = getSequelize();
    await sequelize.query(sql);
    logger.info(`Analytics index ensured: ${label}`);
  } catch (error: any) {
    logger.warn(`Analytics index skipped (${label}): ${error.message}`);
  }
};

const ensureStaticIndexes = async () => {
  await runSafeStatement(
    `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plans_createdat_paymentstatus_active
      ON plans ("createdAt", "paymentStatus")
      WHERE "deletedAt" IS NULL;
    `,
    "plans(createdAt,paymentStatus) partial",
  );

  await runSafeStatement(
    `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_createdat_applicationstatus_active
      ON users ("createdAt", "applicationStatus")
      WHERE "deletedAt" IS NULL;
    `,
    "users(createdAt,applicationStatus) partial",
  );
};

const ensureApplicationsIndexes = async () => {
  const shape = await getApplicationsTableShape();
  if (!shape) {
    logger.info("Applications table shape unavailable; applications indexes skipped.");
    return;
  }

  const createdAtColumn = quoteIdentifier(shape.createdAtColumn);
  const statusColumn = quoteIdentifier(shape.statusColumn);
  const whereClause = buildApplicationsWhereClause(shape);

  await runSafeStatement(
    `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_createdat_status_active
      ON ${APPLICATIONS_TABLE} (${createdAtColumn}, ${statusColumn})
      ${whereClause};
    `,
    `applications(${shape.createdAtColumn},${shape.statusColumn})`,
  );

  await runSafeStatement(
    `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_createdat_status_lc_active
      ON ${APPLICATIONS_TABLE}
      (${createdAtColumn}, (LOWER(CAST(${statusColumn} AS TEXT))))
      ${whereClause};
    `,
    `applications(${shape.createdAtColumn},lower(${shape.statusColumn})) expression`,
  );
};

export const ensureAnalyticsIndexes = async () => {
  if (didEnsureAnalyticsIndexes) {
    return;
  }

  if (ensureAnalyticsIndexesPromise) {
    return ensureAnalyticsIndexesPromise;
  }

  ensureAnalyticsIndexesPromise = (async () => {
    await ensureStaticIndexes();
    await ensureApplicationsIndexes();
    didEnsureAnalyticsIndexes = true;
  })()
    .catch((error: any) => {
      logger.warn(`Analytics index bootstrap encountered an error: ${error.message}`);
    })
    .finally(() => {
      ensureAnalyticsIndexesPromise = null;
    });

  return ensureAnalyticsIndexesPromise;
};

