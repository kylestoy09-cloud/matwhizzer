-- Phase 2 of 2: drop stage/is_public_default/finalized_at from seasons now
-- that all code has been updated to read from season_gender_state.
-- Also drops the old single-gender partial unique index.
--
-- Run this ONLY after the code changes have deployed successfully and you have
-- confirmed that seasons/preseason/postseason/season pages all work correctly
-- reading from season_gender_state.
--
-- NOT APPLIED — Paul reviews and runs manually in the Supabase SQL editor.

-- Drop the old partial unique index first (required before dropping the column)
DROP INDEX IF EXISTS seasons_one_public_default;

-- Drop the columns
ALTER TABLE seasons
  DROP COLUMN IF EXISTS stage,
  DROP COLUMN IF EXISTS is_public_default,
  DROP COLUMN IF EXISTS finalized_at;

-- Rollback (if needed before this runs):
-- These columns were added by 20260825_seasons_lifecycle.sql.
-- To restore: re-run that migration with the seeding UPDATEs; then rebuild
-- the unique index. All data lives in season_gender_state so nothing is lost.
