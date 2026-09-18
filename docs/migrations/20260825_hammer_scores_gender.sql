-- Add gender column to wrestler_hammer_scores so rows can be filtered and
-- deleted per-gender during gender-specific recalculation runs.
--
-- wrestler_id is already gender-specific (a wrestler is M or F), so the
-- existing PRIMARY KEY (wrestler_id, season) remains the unique constraint.
-- The gender column here is redundant with wrestlers.gender but avoids a
-- join every time the admin page filters scores.

ALTER TABLE wrestler_hammer_scores
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'M';

CREATE INDEX IF NOT EXISTS idx_whs_season_gender
  ON wrestler_hammer_scores (season, gender);
