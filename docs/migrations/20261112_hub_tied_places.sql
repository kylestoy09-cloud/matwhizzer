-- docs/migrations/20261112_hub_tied_places.sql
--
-- Tied places on the tournament hubs (Kyle 2026-11-12: "go as high as you can and then for the tournament on
-- the admin page, just say how high you went"). In double elimination everyone eliminated in the same
-- consolation round shares a place: 9th–12th, 13th–16th, 17th–24th, 25th–32nd… A placement row now covers a
-- tied group (place = 9, place_to = 12) as well as a single place (place_to empty), so a tied group has
-- several rows with the same place. The unique key adds the prospect. How deep an event was placed is the
-- lowest place it holds, shown on the admin page.
-- Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls', 'mixed'] LOOP
    EXECUTE format($f$
      ALTER TABLE %1$s_hub_placements ADD COLUMN IF NOT EXISTS place_to integer;
      ALTER TABLE %1$s_hub_placements DROP CONSTRAINT IF EXISTS %1$s_hub_placements_place_to_check;
      ALTER TABLE %1$s_hub_placements ADD CONSTRAINT %1$s_hub_placements_place_to_check CHECK (place_to IS NULL OR place_to > place);
      DROP INDEX IF EXISTS %1$s_hub_placements_uniq;
      CREATE UNIQUE INDEX %1$s_hub_placements_uniq ON %1$s_hub_placements (event_id, style, coalesce(division, ''), weight, place, prospect_id);
    $f$, g);
  END LOOP;
END $$;

COMMIT;

-- Verify: the new column on all three (3 rows)
SELECT table_name FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'place_to' AND table_name IN ('boys_hub_placements', 'girls_hub_placements', 'mixed_hub_placements')
ORDER BY table_name;

-- ROLLBACK (only while no tied groups are loaded): drop place_to and recreate each
--   _uniq index on (event_id, style, coalesce(division, ''), weight, place)
