-- =====================================================================
-- Migration: Missing Info Requests — new lifecycle statuses + reuse link
-- Phase 2 (SPR-18-056 → 076)
-- Adds: cancelled, declined, failed to the status enum
-- Adds: reusedFromRequestId (nullable link to the source submission)
-- Run per environment: SIT → UAT → PROD
-- =====================================================================

-- 1. Extend the status enum (IF NOT EXISTS is safe to re-run)
ALTER TYPE "enum_missing_info_requests_status" ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE "enum_missing_info_requests_status" ADD VALUE IF NOT EXISTS 'declined';
ALTER TYPE "enum_missing_info_requests_status" ADD VALUE IF NOT EXISTS 'failed';

-- 2. Reuse traceability link — nullable; only set when a request reuses a prior submission
ALTER TABLE "missing_info_requests" ADD COLUMN IF NOT EXISTS "reusedFromRequestId" VARCHAR(255);

-- 3. Index for the per-client tab query (newest-first by creation)
CREATE INDEX IF NOT EXISTS "idx_missing_info_requests_target_user" ON "missing_info_requests" ("targetUserId", "createdAt" DESC);
