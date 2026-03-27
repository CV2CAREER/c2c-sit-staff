import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";

const logger = getServiceLogger("in-flight-index-bootstrap-service");

let didEnsureInFlightIndexes = false;
let ensureInFlightIndexesPromise: Promise<void> | null = null;

const runSafeStatement = async (sql: string, label: string) => {
  try {
    const sequelize = getSequelize();
    await sequelize.query(sql);
    logger.info(`In-flight index ensured: ${label}`);
  } catch (error: any) {
    logger.warn(`In-flight index skipped (${label}): ${error.message}`);
  }
};

export const ensureInFlightIndexes = async () => {
  if (didEnsureInFlightIndexes) {
    return;
  }

  if (ensureInFlightIndexesPromise) {
    return ensureInFlightIndexesPromise;
  }

  ensureInFlightIndexesPromise = (async () => {
    await runSafeStatement(
      `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plans_inflight_active
        ON plans ("paymentStatus", "hasExpired", "expiresAt", "createdAt" DESC)
        WHERE "deletedAt" IS NULL;
      `,
      "plans active in-flight filter",
    );

    await runSafeStatement(
      `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_allocations_plan_active
        ON subscription_allocations ("planId", "isActive", "assignedAt" DESC)
        WHERE "deletedAt" IS NULL;
      `,
      "subscription_allocations(planId,isActive,assignedAt)",
    );

    await runSafeStatement(
      `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_allocations_staff_active
        ON subscription_allocations ("staffUserId", "isActive", "assignedAt" DESC)
        WHERE "deletedAt" IS NULL;
      `,
      "subscription_allocations(staffUserId,isActive,assignedAt)",
    );

    await runSafeStatement(
      `
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_subscription_allocations_active_plan
        ON subscription_allocations ("planId")
        WHERE "isActive" IS TRUE AND "deletedAt" IS NULL;
      `,
      "subscription_allocations unique active plan",
    );

    didEnsureInFlightIndexes = true;
  })()
    .catch((error: any) => {
      logger.warn(`In-flight index bootstrap encountered an error: ${error.message}`);
    })
    .finally(() => {
      ensureInFlightIndexesPromise = null;
    });

  return ensureInFlightIndexesPromise;
};

