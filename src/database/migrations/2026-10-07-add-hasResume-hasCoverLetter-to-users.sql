-- C/R + C/L: add "hasResume" and "hasCoverLetter" to the users table.
--
-- NULL means "not overridden": the staff users list derives the value from the
-- client's uploads (uploads.type = 'resume' / 'coverletter'). true/false is an
-- explicit Admin/PC override and wins over the uploads.
--
-- The users table has columns referenced by DB views/rules, so we do not rely
-- on Sequelize sync({alter:true}). Apply manually, once per environment
-- (config/database.ts also adds the columns on boot as a safety net):
--
--   IAT   — TODO (DB dev)
--   SIT   — TODO (DB dev)
--   UAT   — TODO (DB dev)
--   PROD  — TODO (DB dev)
--
-- Postgres identifiers are quoted so the camelCase column names are preserved.
-- IF NOT EXISTS makes this idempotent — safe to re-run.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS "hasResume" BOOLEAN DEFAULT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS "hasCoverLetter" BOOLEAN DEFAULT NULL;
