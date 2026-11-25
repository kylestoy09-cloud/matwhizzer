-- docs/migrations/20261112_hub_division_ratings.sql
--
-- A champion rating per division (Kyle 2026-11-12, agreed): NHSCA runs Freshman / Sophomore / Junior / Senior
-- brackets, Fargo 16U and Junior, the Northeast Regional 14U / 16U / Junior. Each division takes the tournament's
-- champion rating unless it has its own here: {"Freshman": 75, "Sophomore": 75}. Same column on all three lists.
-- Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls', 'mixed'] LOOP
    EXECUTE format($f$
      ALTER TABLE %1$s_hub_tournaments ADD COLUMN IF NOT EXISTS division_ratings jsonb NOT NULL DEFAULT '{}'::jsonb;
    $f$, g);
  END LOOP;
END $$;

COMMIT;

-- Verify: 3 rows
SELECT table_name FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'division_ratings' AND table_name IN ('boys_hub_tournaments', 'girls_hub_tournaments', 'mixed_hub_tournaments');

-- ROLLBACK: ALTER TABLE {boys,girls,mixed}_hub_tournaments DROP COLUMN division_ratings;
