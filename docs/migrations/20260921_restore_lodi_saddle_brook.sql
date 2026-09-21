-- docs/migrations/20260921_restore_lodi_saddle_brook.sql
--
-- Lodi and Saddle Brook: two programs in 2024-25, one co-op (merged into Lodi)
-- from 2025-26. Modeled the current co-op way (same as Morris Hills 76 ←
-- Morris Knolls 77): the host school keeps its own identity, the member school
-- exists separately and is inactive for co-op seasons, school_coops links
-- host ← member per season and gender, and the co-op name lives in the gender
-- tables (boys_schools / girls_schools).
--
--   379  Lodi          host. Was "Lodi/Saddle Brook" (a combined entity from the
--                      old 3-school model). All co-op data already lives here.
--   59   Saddle Brook  recreated (deleted by 20260806_merge_lodi.sql). Active in
--                      2024-25; co-op member (inactive) 2025-26 boys + girls and
--                      2026-27 boys. Saddle Brook's page follows school_coops to
--                      Lodi's data for co-op seasons (SchoolProfileCore).
--
-- 20260806_merge_lodi.sql also deleted Lodi's standalone row (55); Lodi's
-- history is on 379, so 55 is not recreated.
--
-- Steps
--   1. 379 → display name "Lodi", Lodi's own mascot/colors/logo (original
--      values from the 55 row; logo file still in storage). Gender tables keep
--      the co-op name "Lodi/Saddle Brook", flagged combined.
--   2. Recreate 59 Saddle Brook (original id, colors, logo).
--   3. Program rows. 2024-25 boys: both District 6, Region 2, NJIC.
--      2025-26 boys for 379: District 7, Region 2, NJIC (+ NJIC 2026-27).
--      (379 was missing from the 2025-26 list, so the season-aware matcher
--      could not resolve it.)
--   4. Re-point the 8 Saddle Brook 2024-25 postseason entries (raw school
--      'Saddle Brook') from 379 to 59. Lodi's stay on 379.
--   5. Co-op: school_coops 379 ← 59 and inactive_school_seasons for 59
--      (2025-26 M/F, 2026-27 M).
--   6. Team-score cache (top_postseason_team_scores reads only the cache):
--      2024-25 District 6 / Region 2 rows for 379 and 59, and the missing
--      2025-26 boys District 7 / Region 2 rows for 379.
--   7. Aliases: co-op names → 379 (display name is now "Lodi");
--      "Saddle Brook" → 59, like "Morris Knolls" → 77.

-- ── DRY RUN (read-only) ─────────────────────────────────────────────────────
SELECT id, display_name, mascot, logo_url FROM schools WHERE id IN (55, 59, 379);
SELECT t.season_id, t.id AS tournament_id, t.name, te.school_context_raw, COUNT(*)
FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
WHERE te.school_id = 379
GROUP BY 1, 2, 3, 4 ORDER BY 1, 2;

DO $$
DECLARE
  n_sb integer;
  r    record;
  nc   text := 'North Jersey Interscholastic Conference';
BEGIN
  IF EXISTS (SELECT 1 FROM schools WHERE id = 59) THEN
    RAISE EXCEPTION 'School id 59 already exists; migration already applied?';
  END IF;

  -- ── 1. 379 becomes Lodi ───────────────────────────────────────────────────
  UPDATE schools SET
    display_name      = 'Lodi',
    mascot            = 'Rams',
    color_primary     = '#034CB2',
    color_secondary   = '#CC4E10',
    color_tertiary    = '#FFFFFF',
    header_background = '#034CB2',
    logo_url          = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/55.png'
  WHERE id = 379;

  UPDATE boys_schools SET display_name = 'Lodi/Saddle Brook', is_combined = true WHERE school_id = 379;
  INSERT INTO girls_schools (school_id, display_name, is_combined) VALUES (379, 'Lodi/Saddle Brook', true)
    ON CONFLICT (school_id) DO UPDATE SET display_name = EXCLUDED.display_name, is_combined = true;

  -- ── 2. Recreate Saddle Brook ──────────────────────────────────────────────
  INSERT INTO schools (id, display_name, is_nj, is_combined, mascot,
                       color_primary, color_secondary, color_tertiary, header_background, logo_url)
  VALUES (59, 'Saddle Brook', true, false, 'Falcons', '#006400', '#FFFFFF', '#000000', '#006400',
          'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/59.png');
  INSERT INTO boys_schools  (school_id, display_name, is_combined) VALUES (59, 'Saddle Brook', false);
  INSERT INTO girls_schools (school_id, display_name, is_combined) VALUES (59, 'Saddle Brook', false);

  -- ── 3. Program rows ───────────────────────────────────────────────────────
  INSERT INTO boys_school_districts (school_id, season_id, district_id)
    SELECT s, 2025, 6 FROM unnest(ARRAY[379, 59]) AS s
    WHERE NOT EXISTS (SELECT 1 FROM boys_school_districts WHERE school_id = s AND season_id = 2025);
  INSERT INTO boys_school_regions (school_id, season_id, region_id)
    SELECT s, 2025, 2 FROM unnest(ARRAY[379, 59]) AS s
    WHERE NOT EXISTS (SELECT 1 FROM boys_school_regions WHERE school_id = s AND season_id = 2025);
  INSERT INTO boys_school_conferences (school_id, season_id, conference)
    SELECT s, 2025, nc FROM unnest(ARRAY[379, 59]) AS s
    WHERE NOT EXISTS (SELECT 1 FROM boys_school_conferences WHERE school_id = s AND season_id = 2025);

  INSERT INTO boys_school_districts (school_id, season_id, district_id)
    SELECT 379, 2026, 7 WHERE NOT EXISTS (SELECT 1 FROM boys_school_districts WHERE school_id = 379 AND season_id = 2026);
  INSERT INTO boys_school_regions (school_id, season_id, region_id)
    SELECT 379, 2026, 2 WHERE NOT EXISTS (SELECT 1 FROM boys_school_regions WHERE school_id = 379 AND season_id = 2026);
  INSERT INTO boys_school_conferences (school_id, season_id, conference)
    SELECT 379, s, nc FROM unnest(ARRAY[2026, 2027]) AS s
    WHERE NOT EXISTS (SELECT 1 FROM boys_school_conferences WHERE school_id = 379 AND season_id = s);

  -- ── 4. Saddle Brook's 2024-25 postseason entries ──────────────────────────
  UPDATE tournament_entries te SET school_id = 59
  FROM tournaments t
  WHERE t.id = te.tournament_id AND t.season_id = 2025
    AND te.school_id = 379 AND te.school_context_raw = 'Saddle Brook';
  GET DIAGNOSTICS n_sb = ROW_COUNT;
  IF n_sb <> 8 THEN
    RAISE EXCEPTION 'Expected 8 Saddle Brook 2024-25 entries, got %', n_sb;
  END IF;

  -- ── 5. Co-op ──────────────────────────────────────────────────────────────
  INSERT INTO school_coops (coop_school_id, member_school_id, season, gender, is_primary) VALUES
    (379, 59, 2026, 'M', false), (379, 59, 2026, 'F', false), (379, 59, 2027, 'M', false);
  INSERT INTO inactive_school_seasons (school_id, season_id, gender) VALUES
    (59, 2026, 'M'), (59, 2026, 'F'), (59, 2027, 'M');

  -- ── 6. Team-score cache ───────────────────────────────────────────────────
  FOR r IN SELECT * FROM district_team_score(6, 'M'::gender_type, 2025::smallint) WHERE school_id IN (379, 59) LOOP
    INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
    SELECT 98, r.school_id, r.school_name, r.total_points, 2025, 'boys_districts'
    WHERE NOT EXISTS (SELECT 1 FROM precomputed_team_scores WHERE tournament_id = 98 AND school_id = r.school_id);
  END LOOP;
  FOR r IN SELECT * FROM region_team_score(2, 'M'::gender_type, 2025::smallint) WHERE school_id IN (379, 59) LOOP
    INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
    SELECT 126, r.school_id, r.school_name, r.total_points, 2025, 'regions'
    WHERE NOT EXISTS (SELECT 1 FROM precomputed_team_scores WHERE tournament_id = 126 AND school_id = r.school_id);
  END LOOP;
  FOR r IN SELECT * FROM district_team_score(7, 'M'::gender_type, 2026::smallint) WHERE school_id = 379 LOOP
    INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
    SELECT 146, r.school_id, r.school_name, r.total_points, 2026, 'boys_districts'
    WHERE NOT EXISTS (SELECT 1 FROM precomputed_team_scores WHERE tournament_id = 146 AND school_id = 379);
  END LOOP;
  FOR r IN SELECT * FROM region_team_score(2, 'M'::gender_type, 2026::smallint) WHERE school_id = 379 LOOP
    INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
    SELECT 173, r.school_id, r.school_name, r.total_points, 2026, 'regions'
    WHERE NOT EXISTS (SELECT 1 FROM precomputed_team_scores WHERE tournament_id = 173 AND school_id = 379);
  END LOOP;

  -- ── 7. Aliases ────────────────────────────────────────────────────────────
  INSERT INTO school_aliases (school_id, alias, alias_type, notes)
  SELECT 379, a, 'abbreviation', 'Co-op name (Lodi host); display name is Lodi'
  FROM unnest(ARRAY['Lodi/Saddle Brook', 'Lodi/Saddle Brook High School']) AS a
  WHERE NOT EXISTS (SELECT 1 FROM school_aliases WHERE alias = a);

  UPDATE school_aliases SET school_id = 59
  WHERE alias = 'Saddle Brook' AND school_id = 379;

  RAISE NOTICE 'Lodi (379) / Saddle Brook (59) restored; % Saddle Brook entries re-pointed', n_sb;
END $$;

-- Verify
SELECT id, display_name, mascot, is_combined FROM schools WHERE id IN (59, 379) ORDER BY id;
SELECT t.season_id, t.name, te.school_id, COUNT(*)
FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
WHERE te.school_id IN (59, 379) GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
SELECT tournament_id, school_id, school_name, total_points, season_id, tournament_type
FROM precomputed_team_scores WHERE school_id IN (59, 379) ORDER BY season_id, tournament_id;
SELECT * FROM school_coops WHERE coop_school_id = 379;
SELECT * FROM inactive_school_seasons WHERE school_id = 59;

-- ROLLBACK (reverse order; previous 379 values shown):
-- UPDATE school_aliases SET school_id = 379 WHERE alias = 'Saddle Brook' AND school_id = 59;
-- DELETE FROM school_aliases WHERE alias IN ('Lodi/Saddle Brook', 'Lodi/Saddle Brook High School');
-- DELETE FROM precomputed_team_scores WHERE (tournament_id IN (98, 126) AND school_id IN (379, 59))
--   OR (tournament_id IN (146, 173) AND school_id = 379);
-- DELETE FROM inactive_school_seasons WHERE school_id = 59;
-- DELETE FROM school_coops WHERE coop_school_id = 379 AND member_school_id = 59;
-- UPDATE tournament_entries SET school_id = 379 WHERE school_id = 59;
-- DELETE FROM boys_school_conferences WHERE (school_id IN (379, 59) AND season_id = 2025) OR (school_id = 379 AND season_id IN (2026, 2027));
-- DELETE FROM boys_school_regions   WHERE (school_id IN (379, 59) AND season_id = 2025) OR (school_id = 379 AND season_id = 2026);
-- DELETE FROM boys_school_districts WHERE (school_id IN (379, 59) AND season_id = 2025) OR (school_id = 379 AND season_id = 2026);
-- DELETE FROM girls_schools WHERE school_id = 59;
-- DELETE FROM boys_schools  WHERE school_id = 59;
-- DELETE FROM schools WHERE id = 59;
-- UPDATE boys_schools SET is_combined = false WHERE school_id = 379;
-- UPDATE schools SET display_name = 'Lodi/Saddle Brook', mascot = 'Ram Falcons',
--   color_primary = '#1a1a2e', color_secondary = '#006400', color_tertiary = '#FFFFFF', header_background = '#006400',
--   logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/379.png'
-- WHERE id = 379;
