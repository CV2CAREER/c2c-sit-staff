-- ============================================================================
-- Locations Table Sync Queries
-- Extracted from: scripts/sync-pricing-from-mongo.ts
-- Purpose: MongoDB to PostgreSQL location/currency migration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SELECT: Get all existing locations
-- ----------------------------------------------------------------------------
-- Retrieves all locations with their currency codes
SELECT id, "currencyCode" 
FROM locations;


-- ----------------------------------------------------------------------------
-- 2. UPDATE: Update existing location
-- ----------------------------------------------------------------------------
-- Updates an existing location with data from MongoDB
-- Parameters: $1=id, $2=multiplier, $3=currencyCode
UPDATE locations
SET 
  "multiplier" = $2, 
  "currencyCode" = $3, 
  "updatedAt" = NOW()
WHERE id = $1;


-- ----------------------------------------------------------------------------
-- 3. INSERT: Create new location
-- ----------------------------------------------------------------------------
-- Inserts a new location from MongoDB data
-- Parameters: $1=id (UUID), $2=currencyCode, $3=multiplier
INSERT INTO locations (
  "id",
  "currencyCode",
  "multiplier",
  "createdAt",
  "updatedAt"
) VALUES (
  $1, $2, $3, NOW(), NOW()
);


-- ----------------------------------------------------------------------------
-- 4. DELETE: Remove unreferenced location
-- ----------------------------------------------------------------------------
-- Deletes a location that is no longer in MongoDB and not referenced by users
-- Parameter: $1=id
DELETE FROM locations WHERE id = $1;


-- ----------------------------------------------------------------------------
-- 5. CHECK: Count users referencing a location
-- ----------------------------------------------------------------------------
-- Checks how many users reference a specific location
-- Used to determine if a location can be safely deleted
-- Parameter: $1=locationId
SELECT COUNT(*)::int AS total 
FROM users 
WHERE "locationId" = $1;


-- ============================================================================
-- Locations Table Schema
-- ============================================================================
-- For reference, here's the expected locations table structure:

/*
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "currencyCode" VARCHAR(3) NOT NULL UNIQUE,  -- 'AUD', 'GBP', 'EUR', 'NGN', 'CAD', 'USD'
  multiplier VARCHAR(10) NOT NULL DEFAULT '1',  -- Price multiplier as string
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster currency code lookups
CREATE INDEX idx_locations_currency_code ON locations("currencyCode");
*/


-- ============================================================================
-- Current Location Mappings (as of 2026-05-12)
-- ============================================================================

/*
INSERT INTO locations (id, "currencyCode", multiplier, "createdAt", "updatedAt") VALUES
('ef72a92f-5976-47b0-9e0f-bcaf9e8fc4fb', 'AUD', '1', NOW(), NOW()),
('d4632ccc-17cf-4524-9f0d-5fad7378b3d6', 'GBP', '1', NOW(), NOW()),
('a904c1a5-0722-41f4-ba19-e6e3768d0618', 'EUR', '1', NOW(), NOW()),
('fa84e3f5-6f01-4529-b060-63223cd059e1', 'NGN', '1', NOW(), NOW()),
('b49783e6-eb56-4fe7-acca-ae4876a8ceff', 'CAD', '1', NOW(), NOW()),
('585d2a04-12e7-47d8-91bc-a6f0e1cb8cdf', 'USD', '1', NOW(), NOW());
*/


-- ============================================================================
-- Example Usage
-- ============================================================================

-- Get location by currency code
SELECT * FROM locations WHERE "currencyCode" = 'AUD';

-- Get all locations ordered by currency
SELECT * FROM locations ORDER BY "currencyCode";

-- Find features for a specific location
SELECT f.*
FROM features f
WHERE 'ef72a92f-5976-47b0-9e0f-bcaf9e8fc4fb' = ANY(f."locationIds");

-- Get location usage statistics
SELECT 
  l.id,
  l."currencyCode",
  l.multiplier,
  COUNT(DISTINCT u.id) AS user_count,
  COUNT(DISTINCT f.id) AS feature_count
FROM locations l
LEFT JOIN users u ON u."locationId" = l.id
LEFT JOIN features f ON l.id = ANY(f."locationIds")
GROUP BY l.id, l."currencyCode", l.multiplier
ORDER BY l."currencyCode";

-- Find locations not used by any features
SELECT l.*
FROM locations l
WHERE NOT EXISTS (
  SELECT 1 FROM features f WHERE l.id = ANY(f."locationIds")
);

-- Find locations not used by any users
SELECT l.*
FROM locations l
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u."locationId" = l.id
);
