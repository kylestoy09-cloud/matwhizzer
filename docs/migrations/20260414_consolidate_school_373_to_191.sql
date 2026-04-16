-- MIGRATION: 20260414_consolidate_school_373_to_191.sql
-- DESCRIPTION: Consolidate school_id 373 ('Keansburg/Henry Hudson') into school_id 191
--              ('Keansburg'). School 373 has 17 tournament_entries and 3
--              precomputed_team_scores rows; no aliases, districts, regions, or names.
-- APPLIED: 2026-04-15
-- NOTE: safety DELETE steps for school_regions, school_districts and UPDATE for
--       school_aliases, school_names added at execution time (were no-ops)
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT id, display_name FROM schools WHERE id IN (191, 373);
-- Expected:
--   191 | Keansburg
--   373 | Keansburg/Henry Hudson
--
-- SELECT school_id, COUNT(*) FROM tournament_entries      WHERE school_id IN (191, 373) GROUP BY school_id;
-- SELECT school_id, COUNT(*) FROM precomputed_team_scores WHERE school_id IN (191, 373) GROUP BY school_id;
-- Expected: 373 | 17,  373 | 3
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Re-point 17 tournament_entries from 373 → 191
UPDATE tournament_entries
SET    school_id = 191
WHERE  school_id = 373;

-- Step 2: Re-point 3 precomputed_team_scores rows from 373 → 191
UPDATE precomputed_team_scores
SET    school_id = 191
WHERE  school_id = 373;

-- Step 3: Delete the now-empty school 373
DELETE FROM schools WHERE id = 373;

-- Verify
SELECT COUNT(*) AS remaining_373_entries     FROM tournament_entries      WHERE school_id = 373; -- expect 0
SELECT COUNT(*) AS remaining_373_precomputed FROM precomputed_team_scores WHERE school_id = 373; -- expect 0
SELECT COUNT(*) AS remaining_373_school      FROM schools                 WHERE id = 373;        -- expect 0

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Restore school 373
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (373, 'Keansburg/Henry Hudson', NULL, TRUE);
--
-- -- Re-point tournament_entries back to 373
-- -- NOTE: 373 entries are season 2, M only — scope by tournament if needed to
-- --       avoid touching any pre-existing 191 entries.
-- UPDATE tournament_entries
-- SET    school_id = 373
-- WHERE  school_id = 191
--   AND  tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2 AND gender = 'M');
--
-- -- Re-point precomputed_team_scores back to 373
-- UPDATE precomputed_team_scores
-- SET    school_id = 373
-- WHERE  school_id = 191
--   AND  season_id = 2;
--
-- COMMIT;
