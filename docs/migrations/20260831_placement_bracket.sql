-- Add bracket column to tournament_placements for A/B pool support.
-- Girls tournaments can have two bracket pools at the same weight (e.g. 120A and 120B),
-- each with their own placements. The bracket column stores '' for single-pool weights
-- and 'A'/'B'/etc. for multi-pool weights, and is included in the unique key.

-- Step 1: find the existing unique constraint name, then substitute it below.
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.tournament_placements'::regclass AND contype = 'u';

-- 1. Add bracket column (default '' keeps existing rows valid)
ALTER TABLE public.tournament_placements
  ADD COLUMN IF NOT EXISTS bracket text NOT NULL DEFAULT '';

-- 2. Drop the old unique constraint — replace <CONSTRAINT_NAME> with the name from the SELECT above
ALTER TABLE public.tournament_placements
  DROP CONSTRAINT tournament_placements_in_season_tournament_id_weight_class__key;

-- 3. Add new unique constraint including bracket
ALTER TABLE public.tournament_placements
  ADD CONSTRAINT tournament_placements_unique
  UNIQUE (in_season_tournament_id, weight_class, place, bracket);
