import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";

const logger = getServiceLogger("campaign-index-bootstrap-service");

let didEnsureCampaignIndexes = false;
let ensureCampaignIndexesPromise: Promise<void> | null = null;

const runSafeStatement = async (sql: string, label: string) => {
  try {
    const sequelize = getSequelize();
    await sequelize.query(sql);
    logger.info(`Campaign index ensured: ${label}`);
  } catch (error: any) {
    logger.warn(`Campaign index skipped (${label}): ${error.message}`);
  }
};

// The campaign management list (GET /clients) filters credentials by
// deletedAt/isDeleted and sorts by createdAt with no LIMIT, so a large
// table forces a full seq scan + sort — slow enough to hit Postgres's
// statement_timeout. These partial indexes match the two real filter
// shapes (active clients / recycle bin) the query actually runs with.
export const ensureCampaignIndexes = async () => {
  if (didEnsureCampaignIndexes) {
    return;
  }

  if (ensureCampaignIndexesPromise) {
    return ensureCampaignIndexesPromise;
  }

  ensureCampaignIndexesPromise = (async () => {
    await runSafeStatement(
      `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credentials_active_created
        ON credentials ("createdAt" DESC)
        WHERE "deletedAt" IS NULL AND "isDeleted" = false;
      `,
      "credentials active clients (createdAt)",
    );

    await runSafeStatement(
      `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credentials_recycle_created
        ON credentials ("createdAt" DESC)
        WHERE "deletedAt" IS NULL AND "isDeleted" = true;
      `,
      "credentials recycle bin (createdAt)",
    );

    await runSafeStatement(
      `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aggregator_throttle_configs_user_active
        ON aggregator_throttle_configs ("userId")
        WHERE "isDeleted" = false;
      `,
      "aggregator_throttle_configs active by userId",
    );

    didEnsureCampaignIndexes = true;
  })()
    .catch((error: any) => {
      logger.warn(`Campaign index bootstrap encountered an error: ${error.message}`);
    })
    .finally(() => {
      ensureCampaignIndexesPromise = null;
    });

  return ensureCampaignIndexesPromise;
};
