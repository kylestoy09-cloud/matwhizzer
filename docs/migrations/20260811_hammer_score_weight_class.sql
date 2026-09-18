-- Add weight_class to wrestler_hammer_scores
-- Populated during recalculation from dual_meet_matches and tournament_bouts.

ALTER TABLE wrestler_hammer_scores
  ADD COLUMN IF NOT EXISTS weight_class text;
