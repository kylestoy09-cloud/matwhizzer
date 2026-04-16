-- MIGRATION: 20260414_consolidate_school_326_to_259.sql
-- DESCRIPTION: Consolidate school_id 326 ('Gloucester') into school_id 259
--              ('Gloucester City JR/SR'). School 326 has 0 tournament_entries and
--              data in 4 dependent tables (conference_standings ×1, school_aliases ×1,
--              school_regions ×1, precomputed_team_scores ×1). School 259 has 72
--              tournament_entries. Re-point all 4 dependent rows to 259, update 259's
--              display_name to the canonical 'Gloucester', then delete 326.
-- APPLIED: 2026-04-14
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT id, display_name FROM schools WHERE id IN (259, 326);
-- Expected:
--   259 | Gloucester City JR/SR
--   326 | Gloucester
--
-- SELECT 'conference_standings',    COUNT(*) FROM conference_standings    WHERE school_id = 326
-- UNION ALL
-- SELECT 'school_aliases',          COUNT(*) FROM school_aliases          WHERE school_id = 326
-- UNION ALL
-- SELECT 'school_regions',          COUNT(*) FROM school_regions          WHERE school_id = 326
-- UNION ALL
-- SELECT 'precomputed_team_scores', COUNT(*) FROM precomputed_team_scores WHERE school_id = 326;
-- Expected: 1, 1, 1, 1
--
-- SELECT COUNT(*) FROM tournament_entries WHERE school_id = 259;
-- Expected: 72
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Re-point the 1 conference_standings row from 326 → 259
UPDATE conference_standings
SET    school_id = 259
WHERE  school_id = 326;

-- Step 2: Re-point the 1 school_aliases row from 326 → 259
UPDATE school_aliases
SET    school_id = 259
WHERE  school_id = 326;

-- Step 3: Re-point the 1 school_regions row from 326 → 259
INSERT INTO school_regions (school_id, region_id)
    SELECT 259, region_id FROM school_regions WHERE school_id = 326
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 326;

-- Step 4: Delete the 1 precomputed_team_scores row for 326 (will be recomputed)
DELETE FROM precomputed_team_scores WHERE school_id = 326;

-- Step 5: Update 259's display_name to the canonical short form
UPDATE schools
SET    display_name = 'Gloucester'
WHERE  id = 259;

-- Step 6: Delete the now-empty school 326
DELETE FROM schools WHERE id = 326;

-- Verify
SELECT COUNT(*) AS remaining_326_standings    FROM conference_standings    WHERE school_id = 326; -- expect 0
SELECT COUNT(*) AS remaining_326_aliases      FROM school_aliases          WHERE school_id = 326; -- expect 0
SELECT COUNT(*) AS remaining_326_regions      FROM school_regions          WHERE school_id = 326; -- expect 0
SELECT COUNT(*) AS remaining_326_precomputed  FROM precomputed_team_scores WHERE school_id = 326; -- expect 0
SELECT COUNT(*) AS remaining_326_school       FROM schools                 WHERE id = 326;        -- expect 0
SELECT id, display_name FROM schools WHERE id = 259;                                              -- expect 259, Gloucester

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Restore school 326
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (326, 'Gloucester', NULL, FALSE);
--
-- -- Restore 259's display_name
-- UPDATE schools
-- SET    display_name = 'Gloucester City JR/SR'
-- WHERE  id = 259;
--
-- -- Re-point conference_standings row back to 326
-- UPDATE conference_standings
-- SET    school_id = 326
-- WHERE  school_id = 259;
--
-- -- Re-point school_aliases row back to 326
-- UPDATE school_aliases
-- SET    school_id = 326
-- WHERE  school_id = 259
--   AND  alias = '<alias value — look up from school_aliases before running>';
--
-- -- Re-point school_regions row back to 326
-- -- (look up region_id from school_regions WHERE school_id = 259 before running)
-- INSERT INTO school_regions (school_id, region_id)
-- VALUES (326, <region_id>)
-- ON CONFLICT DO NOTHING;
-- DELETE FROM school_regions WHERE school_id = 259 AND region_id = <region_id>;
--
-- -- NOTE: precomputed_team_scores row for 326 is not recoverable.
-- --       Acceptable — scores can be recomputed.
--
-- COMMIT;
