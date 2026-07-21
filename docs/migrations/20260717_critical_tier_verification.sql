-- =============================================================================
-- VERIFICATION: 20260717_critical_tier_verification.sql
-- =============================================================================
-- Run AFTER applying 20260717_critical_tier_school_id_migration.sql.
-- Each block tests one function. What "pass" looks like is annotated inline.
--
-- Spot-check schools to watch (ones from past merge/consolidation migrations):
--   Schools merged INTO these IDs should now appear consolidated under one row:
--   school_id 379 (absorbed 380), 393 (absorbed 69),  369 (absorbed 298),
--   259 (absorbed 326), 237 (absorbed 362), 191 (absorbed 373),
--   167 (absorbed 395), 74  (absorbed 331, 402)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. district_team_score
-- Pass: rows returned, school_id NOT NULL, no two rows share the same school_id
-- ---------------------------------------------------------------------------

-- Sanity: top 5 from a populated district (district 7, boys, season 2)
SELECT school, school_name, school_id, total_points
FROM district_team_score(7, 'M', 2)
LIMIT 5;
-- Expected: school = school_name (both display_name), school_id IS NOT NULL, total_points > 0

-- Integrity: every returned row has school_id populated
SELECT COUNT(*) AS rows_missing_school_id
FROM district_team_score(7, 'M', 2)
WHERE school_id IS NULL;
-- Expected: 0

-- No duplicate school_ids in the same result set
SELECT school_id, COUNT(*) AS occurrences
FROM district_team_score(7, 'M', 2)
GROUP BY school_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows


-- ---------------------------------------------------------------------------
-- 2. region_team_score
-- Pass: school_id NOT NULL; school = school_name; no duplicate school_ids
-- ---------------------------------------------------------------------------

SELECT school, school_name, school_id, total_points
FROM region_team_score(1, 'M', 2)
LIMIT 5;

SELECT COUNT(*) AS rows_missing_school_id
FROM region_team_score(1, 'M', 2)
WHERE school_id IS NULL;
-- Expected: 0

SELECT school_id, COUNT(*) AS occurrences
FROM region_team_score(1, 'M', 2)
GROUP BY school_id HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Girls region check
SELECT school, school_name, school_id, total_points
FROM region_team_score(1, 'F', 2)
LIMIT 5;


-- ---------------------------------------------------------------------------
-- 3. state_team_score  (legacy overload — no season param)
-- Pass: LIMIT 8 rows, school_id NOT NULL, total_points > 0
-- ---------------------------------------------------------------------------

SELECT school, school_name, school_id, total_points
FROM state_team_score('M');
-- Expected: up to 8 rows, school_id populated for all

SELECT COUNT(*) AS rows_missing_school_id
FROM state_team_score('M')
WHERE school_id IS NULL;
-- Expected: 0

SELECT COUNT(*) AS rows_missing_school_id
FROM state_team_score('F')
WHERE school_id IS NULL;
-- Expected: 0


-- ---------------------------------------------------------------------------
-- 4. state_team_score  (season-aware overload)
-- Pass: school_id NOT NULL; no duplicate school_ids; total_points > 0 for all rows
-- ---------------------------------------------------------------------------

SELECT school, school_name, school_id, total_points
FROM state_team_score('M', 2)
LIMIT 10;

SELECT COUNT(*) AS rows_missing_school_id
FROM state_team_score('M', 2)
WHERE school_id IS NULL;
-- Expected: 0

SELECT school_id, COUNT(*) AS occurrences
FROM state_team_score('M', 2)
GROUP BY school_id HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Girls state
SELECT school, school_name, school_id, total_points
FROM state_team_score('F', 2)
LIMIT 10;


-- ---------------------------------------------------------------------------
-- 5. girls_region_team_score
-- Pass: school_id NOT NULL; no duplicate school_ids
-- (p_region is text, e.g. '1')
-- ---------------------------------------------------------------------------

SELECT school, school_name, school_id, total_points
FROM girls_region_team_score('1', 2)
LIMIT 5;

SELECT COUNT(*) AS rows_missing_school_id
FROM girls_region_team_score('1', 2)
WHERE school_id IS NULL;
-- Expected: 0

SELECT school_id, COUNT(*) AS occurrences
FROM girls_region_team_score('1', 2)
GROUP BY school_id HAVING COUNT(*) > 1;
-- Expected: 0 rows


-- ---------------------------------------------------------------------------
-- 6. lb_team_points
-- Pass: school_id NOT NULL for all 12 rows; no duplicate school_ids
-- ---------------------------------------------------------------------------

SELECT school, school_name, school_id, total_points, match_count
FROM lb_team_points('M', 2)
LIMIT 12;

SELECT COUNT(*) AS rows_missing_school_id
FROM lb_team_points('M', 2)
WHERE school_id IS NULL;
-- Expected: 0

SELECT school_id, COUNT(*) AS occurrences
FROM lb_team_points('M', 2)
GROUP BY school_id HAVING COUNT(*) > 1;
-- Expected: 0 rows

SELECT school, school_name, school_id, total_points
FROM lb_team_points('F', 2)
LIMIT 12;


-- ---------------------------------------------------------------------------
-- 7. lb_gp_team_points(text, smallint)  — girls grand prix
-- Pass: school_id NOT NULL; no duplicate school_ids; all pool modes return rows
-- ---------------------------------------------------------------------------

-- district pool only
SELECT school, school_name, school_id, total_points, match_count
FROM lb_gp_team_points('districts', 2)
LIMIT 10;

SELECT COUNT(*) AS rows_missing_school_id
FROM lb_gp_team_points('districts', 2)
WHERE school_id IS NULL;
-- Expected: 0

-- district + region pool
SELECT school, school_name, school_id, total_points, match_count
FROM lb_gp_team_points('region', 2)
LIMIT 10;

-- all pools (district + region + state)
SELECT school, school_name, school_id, total_points, match_count
FROM lb_gp_team_points('all', 2)
LIMIT 10;

SELECT school_id, COUNT(*) AS occurrences
FROM lb_gp_team_points('all', 2)
GROUP BY school_id HAVING COUNT(*) > 1;
-- Expected: 0 rows


-- ---------------------------------------------------------------------------
-- 8. lb_gp_team_points(text, integer)  — all-time / unfiltered overload
-- Pass: school_id NOT NULL; cleaner result than before (no display_name string-match gap)
-- ---------------------------------------------------------------------------

SELECT school, school_name, school_id, total_points, match_count
FROM lb_gp_team_points('region', NULL::integer)
LIMIT 10;

SELECT COUNT(*) AS rows_missing_school_id
FROM lb_gp_team_points('region', NULL::integer)
WHERE school_id IS NULL;
-- Expected: 0

-- Confirm school_id is now non-null for top school (was fragile before due to display_name join)
SELECT school_id IS NOT NULL AS school_id_populated, school, total_points
FROM lb_gp_team_points('region', NULL::integer)
LIMIT 3;


-- ---------------------------------------------------------------------------
-- 9. lb_p_team_points
-- Pass: school_id NOT NULL (now from schools.id directly, not sn.school_id);
--       no duplicate school_ids per gender+pool combination
-- ---------------------------------------------------------------------------

-- Boys district pool
SELECT school, school_name, school_id, total_points, match_count
FROM lb_p_team_points('M', 'district', 2)
LIMIT 10;

SELECT COUNT(*) AS rows_missing_school_id
FROM lb_p_team_points('M', 'district', 2)
WHERE school_id IS NULL;
-- Expected: 0

-- Boys all pools
SELECT school_id, COUNT(*) AS occurrences
FROM lb_p_team_points('M', 'all', 2)
GROUP BY school_id HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Girls all pools
SELECT school, school_name, school_id, total_points
FROM lb_p_team_points('F', 'all', 2)
LIMIT 10;

SELECT COUNT(*) AS rows_missing_school_id
FROM lb_p_team_points('F', 'all', 2)
WHERE school_id IS NULL;
-- Expected: 0


-- ---------------------------------------------------------------------------
-- 10. top_district_team_scores
-- Pass: school_id NOT NULL; school = school_name; no duplicate school_ids
--       (each school appears at most once even if they entered multiple districts)
-- ---------------------------------------------------------------------------

SELECT school, school_name, school_id, total_points, district
FROM top_district_team_scores('M', 2, 24)
LIMIT 10;

SELECT COUNT(*) AS rows_missing_school_id
FROM top_district_team_scores('M', 2, 24)
WHERE school_id IS NULL;
-- Expected: 0

-- Note: a school CAN appear multiple times here with different district values —
-- that is correct behaviour (one row per school-per-district, not one row per school).
-- The check below ensures no school appears twice IN THE SAME DISTRICT.
SELECT school_id, district, COUNT(*) AS occurrences
FROM top_district_team_scores('M', 2, 24)
GROUP BY school_id, district
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Girls
SELECT school, school_name, school_id, total_points, district
FROM top_district_team_scores('F', 2, 24)
LIMIT 10;

SELECT COUNT(*) AS rows_missing_school_id
FROM top_district_team_scores('F', 2, 24)
WHERE school_id IS NULL;
-- Expected: 0


-- ---------------------------------------------------------------------------
-- Cross-function spot-check: consolidated schools appear once, not twice
-- Run after applying migration to verify merged schools are not split across rows.
-- Replace the school_ids below with specific schools you know were merged
-- and should now have a single unified score.
-- ---------------------------------------------------------------------------

-- Example: check school_id 379 (absorbed 380) appears once, not twice, in district scores
SELECT school_id, school, total_points, district
FROM top_district_team_scores('M', 2, 200)
WHERE school_id IN (379, 369, 259, 237, 191, 167, 74)
ORDER BY school_id, district;

-- Same check for region scores
SELECT school_id, school, total_points
FROM region_team_score(1, 'M', 2)
WHERE school_id IN (379, 369, 259, 237, 191, 167, 74);

-- State scores
SELECT school_id, school, total_points
FROM state_team_score('M', 2)
WHERE school_id IN (379, 369, 259, 237, 191, 167, 74);
