-- docs/migrations/20261109_girls_2025_regions_numbered_and_merges.sql
--
-- Kyle (2026-11-09). Backup of every row touched: docs/migrations/backups/20261109_girls_2025_regions_rename_merges_before.json
--
-- 1. The 2024-25 girls regions take numbers, like every other season: North 1 = Region 1, North 2 = 2, Central = 3,
--    South = 4. The region pages and their functions find a region by the name 'Girl_s Regions r' || number, so with
--    the old names a 2024-25 girls region page showed nothing. Only the four tournament names change (their ids,
--    entries, bouts, placements and team totals stay). Nothing in the site's code uses the old names.
-- 2. Savanah Valliere: one girl (Kyle). Lindenwold 2024-25, Paulsboro 2025-26. The profile made for her 2024-25 region
--    entry today (b6292eb7) is merged into her profile (ee6626b7): its 1 entry and 1 name link ("Savanah Valliere" at
--    Lindenwold) move over, then the emptied profile is deleted. It had no duals, ratings or school history.
-- 3. Keyra Huastitlan Reyes: the duplicate profile made by mistake today (4b9a9152) is deleted. 0 entries, name links,
--    duals, ratings. Her real profile is 00e0295e.
-- Deletes counted, backed up and approved by Kyle (2026-11-09).
-- ROLLBACK: rename back (ids 134 Central, 135 North 1, 136 North 2, 137 South); re-insert the two profiles from the
--           backup; point Valliere's entry and link back to b6292eb7.
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  -- 1. region names
  IF EXISTS (SELECT 1 FROM tournaments WHERE season_id = 2025 AND name IN ('Girl_s Regions r1', 'Girl_s Regions r2', 'Girl_s Regions r3', 'Girl_s Regions r4')) THEN
    RAISE EXCEPTION '2024-25 numbered region names already exist';
  END IF;
  UPDATE tournaments SET name = CASE id WHEN 135 THEN 'Girl_s Regions r1' WHEN 136 THEN 'Girl_s Regions r2'
                                        WHEN 134 THEN 'Girl_s Regions r3' WHEN 137 THEN 'Girl_s Regions r4' END
  WHERE id IN (134, 135, 136, 137) AND season_id = 2025 AND gender = 'F'
    AND name IN ('Girl_s Regions Central', 'Girl_s Regions North 1', 'Girl_s Regions North 2', 'Girl_s Regions South');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'expected to rename 4 regions, renamed %', n; END IF;

  -- 2. Valliere: move, then delete the emptied profile
  UPDATE tournament_entries SET wrestler_id = 'ee6626b7-f673-437b-a365-817675604456' WHERE wrestler_id = 'b6292eb7-3ac3-474c-90e6-333abccd63b5';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Valliere: expected 1 entry, moved %', n; END IF;
  UPDATE wrestler_name_aliases SET wrestler_id = 'ee6626b7-f673-437b-a365-817675604456' WHERE wrestler_id = 'b6292eb7-3ac3-474c-90e6-333abccd63b5';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Valliere: expected 1 name link, moved %', n; END IF;

  PERFORM set_config('matwhizzer.allow_protected_delete', 'on', true);
  DELETE FROM wrestlers WHERE id = 'b6292eb7-3ac3-474c-90e6-333abccd63b5'
    AND NOT EXISTS (SELECT 1 FROM tournament_entries WHERE wrestler_id = 'b6292eb7-3ac3-474c-90e6-333abccd63b5');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Valliere: expected to delete 1 profile, deleted %', n; END IF;

  -- 3. Keyra's duplicate
  DELETE FROM wrestlers WHERE id = '4b9a9152-7e89-4db6-8cbd-570e73697ac5'
    AND NOT EXISTS (SELECT 1 FROM tournament_entries WHERE wrestler_id = '4b9a9152-7e89-4db6-8cbd-570e73697ac5')
    AND NOT EXISTS (SELECT 1 FROM wrestler_name_aliases WHERE wrestler_id = '4b9a9152-7e89-4db6-8cbd-570e73697ac5');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Keyra duplicate: expected to delete 1 profile, deleted %', n; END IF;
END $$;

-- Verify: the four names; Valliere's profile with both seasons; the two deleted profiles gone
SELECT 'region' AS what, id::text || ' ' || name AS value FROM tournaments WHERE id IN (134, 135, 136, 137)
UNION ALL SELECT 'Valliere entries', count(*)::text FROM tournament_entries WHERE wrestler_id = 'ee6626b7-f673-437b-a365-817675604456'
UNION ALL SELECT 'deleted profiles left', count(*)::text FROM wrestlers WHERE id IN ('b6292eb7-3ac3-474c-90e6-333abccd63b5', '4b9a9152-7e89-4db6-8cbd-570e73697ac5');
