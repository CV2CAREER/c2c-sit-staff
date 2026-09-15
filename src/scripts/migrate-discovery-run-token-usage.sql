-- =====================================================================
-- Migration: Discovery Run — AI token/request usage metering
-- SPR-19-03-017 — meter token and request usage per AI Discovery Agent run
-- Run per environment: RAT → IAT → SIT → UAT → PROD
-- =====================================================================

ALTER TABLE "discovery_runs" ADD COLUMN IF NOT EXISTS "tokens_used" INTEGER DEFAULT 0;
ALTER TABLE "discovery_runs" ADD COLUMN IF NOT EXISTS "ai_request_count" INTEGER DEFAULT 0;
