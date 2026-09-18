-- Add gender column to in_season_tournaments.
-- All existing rows are boys tournaments; default 'M' backfills them instantly.
-- Girls imports going forward will set gender='F' on insert.

ALTER TABLE in_season_tournaments
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'M';

CREATE INDEX IF NOT EXISTS idx_in_season_tournaments_gender
  ON in_season_tournaments (gender);
