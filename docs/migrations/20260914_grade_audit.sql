-- ── Grade audit — compare rollover count to district entries ─────────────────
-- Run in Supabase SQL editor. Read-only.

-- 1. Boys wrestlers with grades, broken down by source
--    (what fed the rollover)
SELECT
  grade_confirmed_source,
  grade,
  COUNT(*) AS wrestlers
FROM wrestlers
WHERE gender = 'M'
  AND is_active = true
  AND is_oos    = false
  AND grade     IS NOT NULL
GROUP BY grade_confirmed_source, grade
ORDER BY grade_confirmed_source, grade;

-- 2. Total boys wrestlers with grades (should match rollover's advanced + graduated)
SELECT COUNT(*) AS total_with_grade
FROM wrestlers
WHERE gender  = 'M'
  AND is_active = true
  AND is_oos    = false
  AND grade     IS NOT NULL;

-- 3. Boys district tournament entries for the current season
--    (season_id from season_gender_state where gender='M' and is_public_default=true)
SELECT
  t.id           AS tournament_id,
  t.name         AS tournament_name,
  t.season_id,
  COUNT(te.id)   AS entries,
  COUNT(DISTINCT te.wrestler_id) AS distinct_wrestlers
FROM tournaments t
JOIN tournament_entries te ON te.tournament_id = t.id
WHERE t.gender          = 'M'
  AND t.tournament_type = 'districts'
  AND t.season_id = (
    SELECT season_id FROM season_gender_state
    WHERE gender = 'M' AND is_public_default = true
    LIMIT 1
  )
GROUP BY t.id, t.name, t.season_id
ORDER BY t.name;

-- 4. Grand total: distinct boys wrestlers entered in any district tournament this season
SELECT COUNT(DISTINCT te.wrestler_id) AS district_wrestlers
FROM tournament_entries te
JOIN tournaments t ON t.id = te.tournament_id
WHERE t.gender          = 'M'
  AND t.tournament_type = 'districts'
  AND t.season_id = (
    SELECT season_id FROM season_gender_state
    WHERE gender = 'M' AND is_public_default = true
    LIMIT 1
  );

-- 5. Cross-reference: boys wrestlers with grades who also have a district entry
--    (overlap between the two populations)
SELECT COUNT(DISTINCT w.id) AS graded_AND_in_districts
FROM wrestlers w
JOIN tournament_entries te ON te.wrestler_id = w.id
JOIN tournaments t ON t.id = te.tournament_id
WHERE w.gender          = 'M'
  AND w.is_active       = true
  AND w.is_oos          = false
  AND w.grade           IS NOT NULL
  AND t.gender          = 'M'
  AND t.tournament_type = 'districts'
  AND t.season_id = (
    SELECT season_id FROM season_gender_state
    WHERE gender = 'M' AND is_public_default = true
    LIMIT 1
  );

-- 6. Boys wrestlers with grades who have NO district entry
--    (graded some other way — roster upload, manual, etc.)
SELECT
  w.grade_confirmed_source,
  COUNT(*) AS wrestlers_without_district_entry
FROM wrestlers w
WHERE w.gender    = 'M'
  AND w.is_active = true
  AND w.is_oos    = false
  AND w.grade     IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    WHERE te.wrestler_id    = w.id
      AND t.gender          = 'M'
      AND t.tournament_type = 'districts'
      AND t.season_id = (
        SELECT season_id FROM season_gender_state
        WHERE gender = 'M' AND is_public_default = true
        LIMIT 1
      )
  )
GROUP BY w.grade_confirmed_source
ORDER BY w.grade_confirmed_source;
