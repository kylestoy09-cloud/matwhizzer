-- Add tournament_types to rtf_import_drafts.
-- Stores per-tournament type decisions (inside / inside_outside / outside)
-- so they persist when a draft is saved and resumed.

ALTER TABLE rtf_import_drafts
  ADD COLUMN IF NOT EXISTS tournament_types JSONB NOT NULL DEFAULT '{}';
