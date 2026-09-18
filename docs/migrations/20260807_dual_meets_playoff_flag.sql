-- Add is_playoff flag to dual_meets for identifying postseason team bracket matches
ALTER TABLE dual_meets ADD COLUMN IF NOT EXISTS is_playoff boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_dual_meets_is_playoff ON dual_meets(season_id, gender, is_playoff) WHERE is_playoff = true;
