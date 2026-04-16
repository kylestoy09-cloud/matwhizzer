-- MIGRATION: 20260414_consolidate_school_298_to_369.sql
-- DESCRIPTION: Consolidate school_id 298 ('Highland Regional/Triton') into school_id 369
--              ('Highland'). School 298 has 38 tournament_entries across both seasons (M only)
--              and data in all metadata tables. School 369 has 1 conference_standings row
--              but zero metadata rows — all of 298's aliases, districts, regions, and names
--              will be re-pointed to 369. precomputed_team_scores re-pointed (not deleted)
--              since 298 has real team data.
-- APPLIED: 2026-04-15
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT id, display_name FROM schools WHERE id IN (298, 369);
-- Expected:
--   298 | Highland Regional/Triton
--   369 | Highland
--
-- SELECT school_id, COUNT(*) FROM tournament_entries      WHERE school_id IN (298, 369) GROUP BY school_id;
-- Expected: 298 | 38
--
-- SELECT school_id, COUNT(*) FROM precomputed_team_scores WHERE school_id IN (298, 369) GROUP BY school_id;
-- Expected: 298 | 5,  369 | 1
--
-- SELECT school_id, COUNT(*) FROM school_aliases          WHERE school_id IN (298, 369) GROUP BY school_id;
-- Expected: 298 | 3
--
-- SELECT school_id, COUNT(*) FROM school_districts        WHERE school_id IN (298, 369) GROUP BY school_id;
-- Expected: 298 | 1
--
-- SELECT school_id, COUNT(*) FROM school_regions          WHERE school_id IN (298, 369) GROUP BY school_id;
-- Expected: 298 | 1
--
-- SELECT school_id, COUNT(*) FROM school_names            WHERE school_id IN (298, 369) GROUP BY school_id;
-- Expected: 298 | 1
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Re-point 38 tournament_entries from 298 → 369
UPDATE tournament_entries
SET    school_id = 369
WHERE  school_id = 298;

-- Step 2: Re-point 5 precomputed_team_scores rows from 298 → 369
UPDATE precomputed_team_scores
SET    school_id = 369
WHERE  school_id = 298;

-- Step 3: Re-point 3 school_aliases rows from 298 → 369
UPDATE school_aliases
SET    school_id = 369
WHERE  school_id = 298;

-- Step 4: Re-point 1 school_districts row from 298 → 369
-- Uses INSERT ON CONFLICT DO NOTHING + DELETE to avoid composite PK violation
-- if 369 already has the same district.
INSERT INTO school_districts (school_id, district_id)
    SELECT 369, district_id FROM school_districts WHERE school_id = 298
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 298;

-- Step 5: Re-point 1 school_regions row from 298 → 369
-- Uses INSERT ON CONFLICT DO NOTHING + DELETE to avoid composite PK violation
-- if 369 already has the same region.
INSERT INTO school_regions (school_id, region_id)
    SELECT 369, region_id FROM school_regions WHERE school_id = 298
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 298;

-- Step 6: Re-point 1 school_names row from 298 → 369
UPDATE school_names
SET    school_id = 369
WHERE  school_id = 298;

-- Step 7: Delete the now-empty school 298
DELETE FROM schools WHERE id = 298;

-- Verify: all should return 0
SELECT COUNT(*) AS remaining_298_entries     FROM tournament_entries      WHERE school_id = 298; -- expect 0
SELECT COUNT(*) AS remaining_298_precomputed FROM precomputed_team_scores WHERE school_id = 298; -- expect 0
SELECT COUNT(*) AS remaining_298_aliases     FROM school_aliases          WHERE school_id = 298; -- expect 0
SELECT COUNT(*) AS remaining_298_districts   FROM school_districts        WHERE school_id = 298; -- expect 0
SELECT COUNT(*) AS remaining_298_regions     FROM school_regions          WHERE school_id = 298; -- expect 0
SELECT COUNT(*) AS remaining_298_names       FROM school_names            WHERE school_id = 298; -- expect 0
SELECT COUNT(*) AS remaining_298_school      FROM schools                 WHERE id = 298;        -- expect 0

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Restore school 298
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (298, 'Highland Regional/Triton', NULL, TRUE);
--
-- -- Re-point tournament_entries back to 298
-- -- NOTE: Both seasons have M entries for this school; scope by tournament if needed.
-- UPDATE tournament_entries
-- SET    school_id = 298
-- WHERE  school_id = 369
--   AND  tournament_id IN (SELECT id FROM tournaments WHERE gender = 'M');
--
-- -- Re-point precomputed_team_scores back to 298
-- -- NOTE: 369 had 1 precomputed row before this migration; need to exclude that row.
-- --       Best approach: restore from backup or re-scope by season_id and tournament_type.
-- UPDATE precomputed_team_scores
-- SET    school_id = 298
-- WHERE  school_id = 369
--   AND  tournament_type IN ('boys_districts', 'regions', 'boys_state');
--
-- -- Re-point school_aliases back to 298
-- UPDATE school_aliases
-- SET    school_id = 298
-- WHERE  school_id = 369;
--
-- -- Re-point school_districts back to 298
-- -- (look up district_id from school_districts WHERE school_id = 369 before running)
-- INSERT INTO school_districts (school_id, district_id)
-- VALUES (298, <district_id>)
-- ON CONFLICT DO NOTHING;
-- DELETE FROM school_districts WHERE school_id = 369 AND district_id = <district_id>;
--
-- -- Re-point school_regions back to 298
-- -- (look up region_id from school_regions WHERE school_id = 369 before running)
-- INSERT INTO school_regions (school_id, region_id)
-- VALUES (298, <region_id>)
-- ON CONFLICT DO NOTHING;
-- DELETE FROM school_regions WHERE school_id = 369 AND region_id = <region_id>;
--
-- -- Re-point school_names back to 298
-- UPDATE school_names
-- SET    school_id = 298
-- WHERE  school_id = 369;
--
-- COMMIT;
