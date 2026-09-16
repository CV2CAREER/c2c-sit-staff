-- SPR-19-16-001: add "isRestricted" column to users table.
--
-- The users table has columns referenced by DB views/rules, so we do not
-- rely on Sequelize sync({alter:true}) here — this SQL is applied manually,
-- once per environment, by the DB developer:
--
--   IAT   — applied 2026-09-15 by Kayode
--   SIT   — TODO (DB dev)
--   UAT   — TODO (DB dev)
--   PROD  — TODO (DB dev)
--
-- Postgres identifiers are quoted so the camelCase column name is preserved.
-- IF NOT EXISTS makes this idempotent — safe to re-run.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS "isRestricted" BOOLEAN DEFAULT FALSE;
