-- docs/migrations/20260921_restore_lodi_saddle_brook.sql
--
-- BOYS ONLY. Lodi and Saddle Brook were two programs in 2024-25 and merged into
-- a Lodi-hosted co-op, "Lodi/Saddle Brook", from 2025-26.
--
-- School names follow the season: schools.display_name is the name NOW, and
-- the new school_season_names table records any season where a school's name
-- was different. school_display_name(school, season, gender) resolves it.
--
--   379  "Lodi/Saddle Brook" now (2025-26 on); "Lodi" for 2024-25 boys.
--        Lodi's history and all co-op data already live on 379.
--   59   Saddle Brook, recreated (deleted by 20260806_merge_lodi.sql). Its own
--        program in 2024-25; co-op member (inactive) 2025-26 and 2026-27 boys,
--        where its page follows school_coops to 379's data.
--
-- Steps
--   1. school_season_names table + school_display_name() function.
--   2. 379 is "Lodi" for 2024-25 boys.
--   3. Recreate 59 Saddle Brook (original id, colors, logo still in storage).
--   4. Boys program rows. 2024-25: both District 6, Region 2, NJIC.
--      2025-26: 379 District 7, Region 2, NJIC (missing, so the season-aware
--      matcher could not resolve it); NJIC for 2026-27.
--   5. Re-point the 8 Saddle Brook 2024-25 boys postseason entries (raw school
--      'Saddle Brook') from 379 to 59. Lodi's stay on 379.
--   6. Co-op: school_coops 379 ← 59 and 59 inactive, 2025-26 and 2026-27 boys.
--   7. Team-score cache: 2024-25 District 6 / Region 2 rows for 379 (as
--      "Lodi") and 59; missing 2025-26 boys District 7 / Region 2 rows for 379.
--   8. Alias for the raw bracket name "Lodi/Saddle Brook High School".
--
-- Aliases "Lodi" and "Saddle Brook" stay on 379 (the co-op) for current
-- seasons; for 2024-25 the season-aware matcher finds "Saddle Brook" (59) by
-- exact name first because 59 is in that season's program list.
--
-- Replaces an earlier version of this file that failed (and rolled back) on
-- inactive_school_seasons: its primary key is still (school_id, season_id), so
-- one school can't be inactive for boys and girls in the same season. Girls
-- are out of scope here.

-- ── DRY RUN (read-only) ─────────────────────────────────────────────────────
SELECT id, display_name FROM schools WHERE id IN (59, 379);
SELECT t.season_id, t.id AS tournament_id, t.name, te.school_context_raw, COUNT(*)
FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
WHERE te.school_id = 379
GROUP BY 1, 2, 3, 4 ORDER BY 1, 2;

-- ── 1. Season names ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_season_names (
  school_id    integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id    integer NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  gender       text    NOT NULL CHECK (gender IN ('M', 'F')),
  display_name text    NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, season_id, gender)
);
COMMENT ON TABLE school_season_names IS
  'A school''s display name for a season/gender when it differs from schools.display_name (the current name).';

ALTER TABLE school_season_names ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read school_season_names" ON school_season_names;
CREATE POLICY "Public read school_season_names" ON school_season_names FOR SELECT USING (true);
GRANT SELECT ON school_season_names TO anon, authenticated;
GRANT ALL    ON school_season_names TO postgres, service_role;

CREATE OR REPLACE FUNCTION school_display_name(p_school_id integer, p_season_id integer, p_gender text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT n.display_name FROM school_season_names n
      WHERE n.school_id = p_school_id AND n.season_id = p_season_id AND n.gender = p_gender),
    (SELECT s.display_name FROM schools s WHERE s.id = p_school_id)
  )
$$;
GRANT EXECUTE ON FUNCTION school_display_name(integer, integer, text) TO anon, authenticated, service_role;

DO $$
DECLARE
  n_sb integer;
  r    record;
  nc   text := 'North Jersey Interscholastic Conference';
BEGIN
  IF EXISTS (SELECT 1 FROM schools WHERE id = 59) THEN
    RAISE EXCEPTION 'School id 59 already exists; migration already applied?';
  END IF;

  -- ── 2. 379 was "Lodi" in 2024-25 ──────────────────────────────────────────
  INSERT INTO school_season_names (school_id, season_id, gender, display_name)
  VALUES (379, 2025, 'M', 'Lodi')
  ON CONFLICT (school_id, season_id, gender) DO UPDATE SET display_name = EXCLUDED.display_name;

  -- ── 3. Recreate Saddle Brook ──────────────────────────────────────────────
  INSERT INTO schools (id, display_name, is_nj, is_combined, mascot,
                       color_primary, color_secondary, color_tertiary, header_background, logo_url)
  VALUES (59, 'Saddle Brook', true, false, 'Falcons', '#006400', '#FFFFFF', '#000000', '#006400',
          'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/59.png');
  INSERT INTO boys_schools (school_id, display_name, is_combined) VALUES (59, 'Saddle Brook', false);

  -- ── 4. Boys program rows ──────────────────────────────────────────────────
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

  -- ── 5. Saddle Brook's 2024-25 boys postseason entries ─────────────────────
  UPDATE tournament_entries te SET school_id = 59
  FROM tournaments t
  WHERE t.id = te.tournament_id AND t.season_id = 2025
    AND t.tournament_type IN ('districts', 'regions', 'boys_state')
    AND te.school_id = 379 AND te.school_context_raw = 'Saddle Brook';
  GET DIAGNOSTICS n_sb = ROW_COUNT;
  IF n_sb <> 8 THEN
    RAISE EXCEPTION 'Expected 8 Saddle Brook 2024-25 boys entries, got %', n_sb;
  END IF;

  -- ── 6. Co-op (boys) ───────────────────────────────────────────────────────
  INSERT INTO school_coops (coop_school_id, member_school_id, season, gender, is_primary) VALUES
    (379, 59, 2026, 'M', false), (379, 59, 2027, 'M', false);
  INSERT INTO inactive_school_seasons (school_id, season_id, gender) VALUES
    (59, 2026, 'M'), (59, 2027, 'M');

  -- ── 7. Team-score cache (names as of that season) ─────────────────────────
  FOR r IN SELECT * FROM district_team_score(6, 'M'::gender_type, 2025::smallint) WHERE school_id IN (379, 59) LOOP
    INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
    SELECT 98, r.school_id, school_display_name(r.school_id, 2025, 'M'), r.total_points, 2025, 'boys_districts'
    WHERE NOT EXISTS (SELECT 1 FROM precomputed_team_scores WHERE tournament_id = 98 AND school_id = r.school_id);
  END LOOP;
  FOR r IN SELECT * FROM region_team_score(2, 'M'::gender_type, 2025::smallint) WHERE school_id IN (379, 59) LOOP
    INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
    SELECT 126, r.school_id, school_display_name(r.school_id, 2025, 'M'), r.total_points, 2025, 'regions'
    WHERE NOT EXISTS (SELECT 1 FROM precomputed_team_scores WHERE tournament_id = 126 AND school_id = r.school_id);
  END LOOP;
  FOR r IN SELECT * FROM district_team_score(7, 'M'::gender_type, 2026::smallint) WHERE school_id = 379 LOOP
    INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
    SELECT 146, r.school_id, school_display_name(r.school_id, 2026, 'M'), r.total_points, 2026, 'boys_districts'
    WHERE NOT EXISTS (SELECT 1 FROM precomputed_team_scores WHERE tournament_id = 146 AND school_id = 379);
  END LOOP;
  FOR r IN SELECT * FROM region_team_score(2, 'M'::gender_type, 2026::smallint) WHERE school_id = 379 LOOP
    INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
    SELECT 173, r.school_id, school_display_name(r.school_id, 2026, 'M'), r.total_points, 2026, 'regions'
    WHERE NOT EXISTS (SELECT 1 FROM precomputed_team_scores WHERE tournament_id = 173 AND school_id = 379);
  END LOOP;

  -- ── 8. Alias for the boys bracket name ────────────────────────────────────
  INSERT INTO school_aliases (school_id, alias, alias_type, notes)
  SELECT 379, 'Lodi/Saddle Brook High School', 'abbreviation', 'Raw name in 2025-26 boys district/region brackets'
  WHERE NOT EXISTS (SELECT 1 FROM school_aliases WHERE alias = 'Lodi/Saddle Brook High School');

  RAISE NOTICE 'Lodi (379) / Saddle Brook (59): % Saddle Brook entries re-pointed', n_sb;
END $$;

-- Verify
SELECT school_display_name(379, 2025, 'M') AS lodi_2025, school_display_name(379, 2026, 'M') AS lodi_2026;
SELECT t.season_id, t.name, te.school_id, COUNT(*)
FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
WHERE te.school_id IN (59, 379) GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
SELECT tournament_id, school_id, school_name, total_points, season_id, tournament_type
FROM precomputed_team_scores WHERE school_id IN (59, 379) ORDER BY season_id, tournament_id;

-- ROLLBACK (reverse order):
-- DELETE FROM school_aliases WHERE alias = 'Lodi/Saddle Brook High School';
-- DELETE FROM precomputed_team_scores WHERE (tournament_id IN (98, 126) AND school_id IN (379, 59))
--   OR (tournament_id IN (146, 173) AND school_id = 379);
-- DELETE FROM inactive_school_seasons WHERE school_id = 59;
-- DELETE FROM school_coops WHERE coop_school_id = 379 AND member_school_id = 59;
-- UPDATE tournament_entries SET school_id = 379 WHERE school_id = 59;
-- DELETE FROM boys_school_conferences WHERE (school_id IN (379, 59) AND season_id = 2025) OR (school_id = 379 AND season_id IN (2026, 2027));
-- DELETE FROM boys_school_regions   WHERE (school_id IN (379, 59) AND season_id = 2025) OR (school_id = 379 AND season_id = 2026);
-- DELETE FROM boys_school_districts WHERE (school_id IN (379, 59) AND season_id = 2025) OR (school_id = 379 AND season_id = 2026);
-- DELETE FROM boys_schools WHERE school_id = 59;
-- DELETE FROM schools WHERE id = 59;
-- DELETE FROM school_season_names WHERE school_id = 379;
-- (keep school_season_names / school_display_name for other schools, or DROP them if unused)
