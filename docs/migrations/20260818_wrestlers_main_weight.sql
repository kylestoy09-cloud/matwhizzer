-- Add main_weight to wrestlers table.
-- Populated by the recalculate-hammer-scores route after each full-season replay.
-- Can be manually overridden for wrestlers who compete at multiple weights.

ALTER TABLE wrestlers ADD COLUMN IF NOT EXISTS main_weight text;
