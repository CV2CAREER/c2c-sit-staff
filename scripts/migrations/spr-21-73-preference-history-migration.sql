-- ============================================================================
-- Migration: SPR-21-73-003: Preference history data model
-- Purpose: Add field-level tracking columns and indexes to user_preference_history
-- Reversible: Yes (see Down / Rollback section below)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- UP Migration
-- ----------------------------------------------------------------------------
ALTER TABLE "user_preference_history" 
  ADD COLUMN IF NOT EXISTS "fieldChanged" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "previousValue" JSONB,
  ADD COLUMN IF NOT EXISTS "newValue" JSONB;

-- Performance indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_history_user_id" ON "user_preference_history" ("userId");
CREATE INDEX IF NOT EXISTS "idx_history_profile_id" ON "user_preference_history" ("profileId");
CREATE INDEX IF NOT EXISTS "idx_history_created_at" ON "user_preference_history" ("createdAt");

-- ----------------------------------------------------------------------------
-- DOWN / ROLLBACK Migration
-- ----------------------------------------------------------------------------
-- DROP INDEX IF EXISTS "idx_history_user_id";
-- DROP INDEX IF EXISTS "idx_history_profile_id";
-- DROP INDEX IF EXISTS "idx_history_created_at";
-- ALTER TABLE "user_preference_history" 
--   DROP COLUMN IF EXISTS "fieldChanged",
--   DROP COLUMN IF EXISTS "previousValue",
--   DROP COLUMN IF EXISTS "newValue";
