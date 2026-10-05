/**
 * Migration Script: SPR-21-73-003: Preference history data model
 * 
 * Usage:
 *   npx tsx scripts/migrate-preference-history.ts up      # Apply migration
 *   npx tsx scripts/migrate-preference-history.ts down    # Revert migration
 */

import { getSequelize } from "../src/utils/sequelize";
import { getServiceLogger } from "../src/utils/createLogger";

const logger = getServiceLogger("preference-history-migration");

export const up = async () => {
  const sequelize = getSequelize();
  try {
    logger.info("Starting migration UP: SPR-21-73-003...");

    await sequelize.query(`
      ALTER TABLE "user_preference_history" 
        ADD COLUMN IF NOT EXISTS "fieldChanged" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "previousValue" JSONB,
        ADD COLUMN IF NOT EXISTS "newValue" JSONB;
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_history_user_id" ON "user_preference_history" ("userId");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_history_profile_id" ON "user_preference_history" ("profileId");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_history_created_at" ON "user_preference_history" ("createdAt");
    `);

    logger.info("✅ Migration UP completed successfully: fieldChanged, previousValue, newValue added with indexes.");
  } catch (error: any) {
    logger.error(`❌ Migration UP failed: ${error.message}`);
    throw error;
  }
};

export const down = async () => {
  const sequelize = getSequelize();
  try {
    logger.info("Starting migration DOWN: SPR-21-73-003...");

    await sequelize.query(`DROP INDEX IF EXISTS "idx_history_user_id";`);
    await sequelize.query(`DROP INDEX IF EXISTS "idx_history_profile_id";`);
    await sequelize.query(`DROP INDEX IF EXISTS "idx_history_created_at";`);

    await sequelize.query(`
      ALTER TABLE "user_preference_history" 
        DROP COLUMN IF EXISTS "fieldChanged",
        DROP COLUMN IF EXISTS "previousValue",
        DROP COLUMN IF EXISTS "newValue";
    `);

    logger.info("✅ Migration DOWN completed successfully: columns and indexes rolled back cleanly.");
  } catch (error: any) {
    logger.error(`❌ Migration DOWN failed: ${error.message}`);
    throw error;
  }
};

// Direct script execution
const action = process.argv[2]?.toLowerCase();
if (action === "up") {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (action === "down") {
  down()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
