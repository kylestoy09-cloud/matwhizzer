-- ── Season 1 orphan diagnostic ───────────────────────────────────────────────
-- "Orphans" = active boys wrestlers in season 1 districts who have NO activity
-- in season 2. These were never cleaned up when season 2 was built fresh.
-- Run each block individually in Supabase SQL editor.

-- 1. Grade breakdown of season 1 orphans
--    (these are the ones the rollover should NOT touch)
WITH s1 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 1
),
s2 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 2
)
SELECT w.grade, COUNT(*) AS wrestlers
FROM wrestlers w
JOIN s1 ON s1.wrestler_id = w.id
LEFT JOIN s2 ON s2.wrestler_id = w.id
WHERE s2.wrestler_id IS NULL
  AND w.is_active = true
  AND w.gender    = 'M'
GROUP BY w.grade
ORDER BY w.grade;

-- 2. Total season 1 orphan count
WITH s1 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 1
),
s2 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 2
)
SELECT COUNT(*) AS total_s1_orphans
FROM wrestlers w
JOIN s1 ON s1.wrestler_id = w.id
LEFT JOIN s2 ON s2.wrestler_id = w.id
WHERE s2.wrestler_id IS NULL
  AND w.is_active = true
  AND w.gender    = 'M';

-- 3. For underclassmen orphans (Fr/So/Jr): do matching wrestlers exist in season 2
--    at the expected next grade from the same school?
--    Checks by school_id + next grade — gives confidence that "fresh" season 2
--    data correctly carries those wrestlers forward.
WITH s1 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 1
),
s2 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 2
),
orphans AS (
  SELECT w.id, w.school_id, w.grade
  FROM wrestlers w
  JOIN s1 ON s1.wrestler_id = w.id
  LEFT JOIN s2 ON s2.wrestler_id = w.id
  WHERE s2.wrestler_id IS NULL
    AND w.is_active = true
    AND w.gender    = 'M'
    AND w.grade    IN ('Fr','So','Jr')   -- underclassmen only
),
expected_next AS (
  SELECT
    o.id        AS orphan_id,
    o.school_id,
    o.grade     AS s1_grade,
    CASE o.grade WHEN 'Fr' THEN 'So' WHEN 'So' THEN 'Jr' WHEN 'Jr' THEN 'Sr' END AS expected_s2_grade
  FROM orphans o
)
SELECT
  en.s1_grade,
  en.expected_s2_grade,
  COUNT(*)                                              AS s1_orphan_count,
  COUNT(w2.id)                                          AS school_grade_match_in_s2,
  ROUND(COUNT(w2.id)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS pct_covered
FROM expected_next en
LEFT JOIN wrestlers w2
  ON  w2.school_id  = en.school_id
  AND w2.grade      = en.expected_s2_grade
  AND w2.gender     = 'M'
  AND w2.is_active  = true
  JOIN s2 ON s2.wrestler_id = w2.id
GROUP BY en.s1_grade, en.expected_s2_grade
ORDER BY en.s1_grade;

-- 4. Sample of season 1 senior orphans (to spot-check before graduating them)
WITH s1 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 1
),
s2 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 2
)
SELECT w.id, w.first_name, w.last_name, w.grade, w.grade_confirmed_source
FROM wrestlers w
JOIN s1 ON s1.wrestler_id = w.id
LEFT JOIN s2 ON s2.wrestler_id = w.id
WHERE s2.wrestler_id IS NULL
  AND w.is_active = true
  AND w.gender    = 'M'
  AND w.grade     = 'Sr'
ORDER BY w.last_name, w.first_name
LIMIT 20;
