-- Add "interviewIntelligencePack" to enum_client_support_documents_category enum type.
--
-- Required for uploading Interview Intelligence Pack documents in the client documents modal.
-- IF NOT EXISTS makes this idempotent — safe to re-run.

ALTER TYPE "enum_client_support_documents_category" ADD VALUE IF NOT EXISTS 'interviewIntelligencePack';
