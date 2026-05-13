-- ============================================================================
-- Features Table Sync Queries
-- Extracted from: scripts/sync-pricing-from-mongo.ts
-- Purpose: MongoDB to PostgreSQL pricing/features migration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SELECT: Get all existing features with plan count
-- ----------------------------------------------------------------------------
-- This query retrieves all features and counts how many plans reference them
-- Used to determine which features can be safely deleted
SELECT
  f.id,
  f.title,
  f.tier,
  f.price,
  f."jobApplications",
  f."cvResumeRequests",
  f."validityPeriod",
  f."subscriptionBreak",
  f."profileLimit",
  f."pauseOptionMonths",
  f.description,
  f.extra,
  f."isTopUp",
  f."isActive",
  f."locationIds",
  COALESCE(COUNT(p.id), 0)::int AS "planCount"
FROM features f
LEFT JOIN plans p
  ON p."featureId" = f.id
  AND p."deletedAt" IS NULL
GROUP BY
  f.id,
  f.title,
  f.tier,
  f.price,
  f."jobApplications",
  f."cvResumeRequests",
  f."validityPeriod",
  f."subscriptionBreak",
  f."profileLimit",
  f."pauseOptionMonths",
  f.description,
  f.extra,
  f."isTopUp",
  f."isActive",
  f."locationIds";


-- ----------------------------------------------------------------------------
-- 2. UPDATE: Update existing feature
-- ----------------------------------------------------------------------------
-- Updates an existing feature with data from MongoDB
-- Parameters: $1=id, $2=title, $3=tier, $4=price, $5=jobApplications,
--             $6=cvResumeRequests, $7=screeningPrep, $8=interviewPrep,
--             $9=resumeDevelopment, $10=validityPeriod, $11=pauseOptionMonths,
--             $12=subscriptionBreak, $13=profileLimit, $14=isTopUp,
--             $15=description, $16=extra, $17=isActive, $18=locationIds[]
UPDATE features
SET
  title = $2,
  tier = $3,
  price = $4,
  "jobApplications" = $5,
  "cvResumeRequests" = $6,
  "screeningPrep" = $7,
  "interviewPrep" = $8,
  "resumeDevelopment" = $9,
  "validityPeriod" = $10,
  "pauseOptionMonths" = $11,
  "subscriptionBreak" = $12,
  "profileLimit" = $13,
  "isTopUp" = $14,
  description = $15,
  extra = $16,
  "isActive" = $17,
  "locationIds" = $18::uuid[],
  "updatedAt" = NOW()
WHERE id = $1;


-- ----------------------------------------------------------------------------
-- 3. INSERT: Create new feature
-- ----------------------------------------------------------------------------
-- Inserts a new feature from MongoDB data
-- Parameters: $1=id, $2=title, $3=tier, $4=price, $5=jobApplications,
--             $6=cvResumeRequests, $7=screeningPrep, $8=interviewPrep,
--             $9=resumeDevelopment, $10=validityPeriod, $11=pauseOptionMonths,
--             $12=subscriptionBreak, $13=profileLimit, $14=isTopUp,
--             $15=description, $16=extra, $17=isActive, $18=locationIds[]
INSERT INTO features (
  id,
  title,
  tier,
  price,
  "jobApplications",
  "cvResumeRequests",
  "screeningPrep",
  "interviewPrep",
  "resumeDevelopment",
  "validityPeriod",
  "pauseOptionMonths",
  "subscriptionBreak",
  "profileLimit",
  "isTopUp",
  description,
  extra,
  "isActive",
  "locationIds",
  "createdAt",
  "updatedAt"
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::uuid[], NOW(), NOW()
);


-- ----------------------------------------------------------------------------
-- 4. DELETE: Remove unreferenced feature
-- ----------------------------------------------------------------------------
-- Deletes a feature that is no longer in MongoDB and not referenced by plans
-- Parameter: $1=id
DELETE FROM features WHERE id = $1;


-- ----------------------------------------------------------------------------
-- 5. SUMMARY: Get post-sync statistics
-- ----------------------------------------------------------------------------
-- Returns counts of locations and features after sync
SELECT
  (SELECT COUNT(*)::int FROM locations) AS "locationCount",
  (SELECT COUNT(*)::int FROM features) AS "featureCount",
  (SELECT COUNT(*)::int FROM features WHERE COALESCE(ARRAY_LENGTH("locationIds", 1), 0) > 0) AS "mappedFeatureCount";


-- ============================================================================
-- Features Table Schema
-- ============================================================================
-- For reference, here's the expected features table structure:

/*
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL,  -- 'Emerald', 'Coral', 'Free', 'Copper', 'Bronze', 'Silver', 'Gold', 'Platinum'
  price DECIMAL(10,2) NOT NULL,
  "jobApplications" INTEGER NOT NULL DEFAULT 0,
  "cvResumeRequests" INTEGER NOT NULL DEFAULT 0,
  "screeningPrep" INTEGER NOT NULL DEFAULT 0,
  "interviewPrep" INTEGER NOT NULL DEFAULT 0,
  "resumeDevelopment" INTEGER NOT NULL DEFAULT 0,
  "validityPeriod" VARCHAR(50) NOT NULL DEFAULT '12 months',
  "pauseOptionMonths" INTEGER NOT NULL DEFAULT 0,
  "subscriptionBreak" VARCHAR(50) NOT NULL DEFAULT '0 months',
  "profileLimit" INTEGER NOT NULL DEFAULT 1,
  "isTopUp" BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  extra TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "locationIds" UUID[] NOT NULL DEFAULT '{}',  -- Array of location UUIDs
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster location-based queries
CREATE INDEX idx_features_location_ids ON features USING GIN("locationIds");

-- Index for tier-based queries
CREATE INDEX idx_features_tier ON features(tier);

-- Index for active features
CREATE INDEX idx_features_is_active ON features("isActive");
*/


-- ============================================================================
-- Example Usage
-- ============================================================================

-- Get all features for a specific location (e.g., AUD)
SELECT f.*
FROM features f
WHERE 'ef72a92f-5976-47b0-9e0f-bcaf9e8fc4fb' = ANY(f."locationIds")
  AND f."isActive" = TRUE
ORDER BY f.tier;

-- Get all features with their location details
SELECT 
  f.id,
  f.title,
  f.tier,
  f.price,
  f."locationIds",
  ARRAY_AGG(l."currencyCode") AS currencies,
  ARRAY_AGG(l.multiplier) AS multipliers
FROM features f
LEFT JOIN locations l ON l.id = ANY(f."locationIds")
WHERE f."isActive" = TRUE
GROUP BY f.id, f.title, f.tier, f.price, f."locationIds"
ORDER BY f.tier;

-- Count features by tier
SELECT 
  tier,
  COUNT(*) AS feature_count,
  COUNT(*) FILTER (WHERE "isActive" = TRUE) AS active_count
FROM features
GROUP BY tier
ORDER BY tier;

-- Find features without location associations
SELECT id, title, tier
FROM features
WHERE "locationIds" IS NULL 
   OR ARRAY_LENGTH("locationIds", 1) IS NULL
   OR ARRAY_LENGTH("locationIds", 1) = 0;
