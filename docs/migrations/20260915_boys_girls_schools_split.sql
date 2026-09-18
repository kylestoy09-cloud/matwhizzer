-- docs/migrations/20260915_boys_girls_schools_split.sql
--
-- Create boys_schools and girls_schools as gender-specific attribute tables.
--
-- Problem: The shared schools table has a single display_name that must serve
-- both boys and girls programs, but co-op configurations differ per gender.
-- School 76 (Morris Hills) is a solo boys program but the girls host of a
-- Morris Hills/Morris Knolls co-op — impossible to represent with one name.
--
-- Solution: boys_schools and girls_schools store gender-specific display_name
-- and is_combined per school. The schools table remains the FK target and the
-- source of shared attributes (id, logo_url, is_nj, section, classification,
-- colors, etc.). Only display-facing queries join the gender tables.
--
-- schools.id is unchanged — no existing FK needs to be altered.
-- ============================================================

-- ── 1. Create boys_schools ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS boys_schools (
  school_id    INTEGER PRIMARY KEY REFERENCES schools(id),
  display_name TEXT    NOT NULL,
  is_combined  BOOLEAN NOT NULL DEFAULT false
);

-- ── 2. Create girls_schools ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS girls_schools (
  school_id    INTEGER PRIMARY KEY REFERENCES schools(id),
  display_name TEXT    NOT NULL,
  is_combined  BOOLEAN NOT NULL DEFAULT false
);

-- ── 3. Populate boys_schools ──────────────────────────────────────────────────
-- Source: union of boys program enrollment tables + dual meet participants
-- + postseason tournament participants (season 2 = 2025-26)

INSERT INTO boys_schools (school_id, display_name, is_combined)
SELECT DISTINCT s.id, s.display_name, COALESCE(s.is_combined, false)
FROM schools s
WHERE s.is_nj = true
  AND s.id IN (
    SELECT school_id FROM boys_school_districts    WHERE season_id = 2
    UNION
    SELECT school_id FROM boys_school_regions      WHERE season_id = 2
    UNION
    SELECT school_id FROM boys_school_conferences  WHERE season_id = 2
    UNION
    SELECT team1_school_id FROM dual_meets WHERE gender = 'M' AND season_id = 2
    UNION
    SELECT team2_school_id FROM dual_meets WHERE gender = 'M' AND season_id = 2
    UNION
    SELECT te.school_id
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    WHERE t.gender = 'M' AND t.season_id = 2
      AND te.school_id IS NOT NULL
  )
ON CONFLICT (school_id) DO NOTHING;

-- ── 4. Populate girls_schools ─────────────────────────────────────────────────

INSERT INTO girls_schools (school_id, display_name, is_combined)
SELECT DISTINCT s.id, s.display_name, COALESCE(s.is_combined, false)
FROM schools s
WHERE s.is_nj = true
  AND s.id IN (
    SELECT school_id FROM girls_school_districts    WHERE season_id = 2
    UNION
    SELECT school_id FROM girls_school_regions      WHERE season_id = 2
    UNION
    SELECT school_id FROM girls_school_conferences  WHERE season_id = 2
    UNION
    SELECT team1_school_id FROM dual_meets WHERE gender = 'F' AND season_id = 2
    UNION
    SELECT team2_school_id FROM dual_meets WHERE gender = 'F' AND season_id = 2
    UNION
    SELECT te.school_id
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    WHERE t.gender = 'F' AND t.season_id = 2
      AND te.school_id IS NOT NULL
  )
ON CONFLICT (school_id) DO NOTHING;

-- ── 5. Fix Morris Hills (school 76) ──────────────────────────────────────────
-- Boys: solo program — display name is "Morris Hills", not a co-op
-- Girls: host of Morris Hills/Morris Knolls co-op

UPDATE boys_schools
  SET display_name = 'Morris Hills',
      is_combined  = false
  WHERE school_id = 76;

UPDATE girls_schools
  SET display_name = 'Morris Hills/Morris Knolls',
      is_combined  = true
  WHERE school_id = 76;

-- ── 6. Revert schools.display_name for school 76 ─────────────────────────────
-- The August 2026 co-op consolidation migration wrongly renamed school 76 to
-- the girls co-op name. "Morris Hills" is the correct base identity for this
-- school and the correct name for the boys program.

UPDATE schools
  SET display_name = 'Morris Hills',
      is_combined  = false
  WHERE id = 76;

-- ── 7. Remove Morris Knolls (77) from girls_schools ──────────────────────────
-- School 77 is a solo boys program only. Morris Knolls wrestlers who participate
-- in girls wrestling do so under the Morris Hills/Morris Knolls co-op (school 76).

DELETE FROM girls_schools WHERE school_id = 77;

-- ── 8. Fix inactive_school_seasons for school 77 ─────────────────────────────
-- The August 2026 migration incorrectly marked school 77 as inactive for boys
-- ('M') in both seasons. School 77 has 21 boys dual meets — it is active for boys.
-- It should be inactive for girls only (wrestlers go to the co-op, school 76).

DELETE FROM inactive_school_seasons
  WHERE school_id = 77 AND gender = 'M';

INSERT INTO inactive_school_seasons (school_id, season_id, gender)
  VALUES (77, 1, 'F'), (77, 2, 'F')
  ON CONFLICT (school_id, season_id, gender) DO NOTHING;

-- ── 9. Update school_directory RPC ───────────────────────────────────────────
-- Join the gender-specific table (boys_schools or girls_schools) to resolve
-- the display name, falling back to schools.display_name when no gender row
-- exists. Remove the is_combined filter — artifact schools are excluded by
-- having no tournament entries; we no longer need a filter workaround.

CREATE OR REPLACE FUNCTION public.school_directory(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  school        text,
  school_name   text,
  school_id     integer,
  total_points  numeric,
  wrestler_count bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH competitors AS (
    SELECT DISTINCT te.school_id, te.wrestler_id
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id AND t.season_id = p_season AND t.gender = p_gender
    JOIN wrestlers w ON w.id = te.wrestler_id AND w.first_name <> ''
    WHERE te.school_id IS NOT NULL
  ),
  pts AS (
    SELECT te.school_id,
      SUM(CASE m.bracket_side
        WHEN 'championship' THEN CASE m.win_type WHEN 'FALL' THEN 3.0 WHEN 'TF-1.5' THEN 2.5 WHEN 'TF' THEN 2.5 WHEN 'MD' THEN 2.0 WHEN 'DEC' THEN 1.0 ELSE 0 END
        WHEN 'consolation'  THEN CASE m.win_type WHEN 'FALL' THEN 2.5 WHEN 'TF-1.5' THEN 2.0 WHEN 'TF' THEN 2.0 WHEN 'MD' THEN 1.5 WHEN 'DEC' THEN 0.5 ELSE 0 END
        ELSE 0 END) AS total_pts
    FROM matches m
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season AND t.gender = p_gender
    WHERE m.validated = true AND te.school_id IS NOT NULL
    GROUP BY te.school_id
  )
  SELECT
    COALESCE(
      CASE WHEN p_gender = 'M' THEN bs.display_name ELSE gs.display_name END,
      s.display_name
    ) AS school,
    COALESCE(
      CASE WHEN p_gender = 'M' THEN bs.display_name ELSE gs.display_name END,
      s.display_name
    ) AS school_name,
    s.id          AS school_id,
    COALESCE(ROUND(p.total_pts, 1), 0) AS total_points,
    COUNT(DISTINCT c.wrestler_id)::bigint AS wrestler_count
  FROM competitors c
  JOIN schools s         ON s.id         = c.school_id
  LEFT JOIN boys_schools  bs ON bs.school_id = c.school_id AND p_gender = 'M'
  LEFT JOIN girls_schools gs ON gs.school_id = c.school_id AND p_gender = 'F'
  LEFT JOIN pts p            ON p.school_id  = c.school_id
  GROUP BY s.id, s.display_name, bs.display_name, gs.display_name, p.total_pts
  ORDER BY COALESCE(
    CASE WHEN p_gender = 'M' THEN bs.display_name ELSE gs.display_name END,
    s.display_name
  );
$function$;
