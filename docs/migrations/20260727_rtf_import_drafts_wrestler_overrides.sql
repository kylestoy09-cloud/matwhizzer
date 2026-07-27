-- Add wrestler_overrides column to rtf_import_drafts.
-- Stores per-wrestler decisions made during the review step (create/existing/accept).

ALTER TABLE rtf_import_drafts
  ADD COLUMN IF NOT EXISTS wrestler_overrides JSONB NOT NULL DEFAULT '{}';
