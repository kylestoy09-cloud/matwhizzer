-- MIGRATION: 20260414_consolidate_school_362_to_237.sql
-- DESCRIPTION: Consolidate school_id 362 ('Camden/Camden Eastside') into school_id 237
--              ('Camden'). School 362 has 5 tournament_entries (season 2, M) and 1
--              precomputed_team_scores row; no aliases, districts, regions, or names.
-- APPLIED: 2026-04-15
-- NOTE: safety DELETE steps for school_regions, school_districts and UPDATE for
--       school_aliases, school_names added at execution time (were no-ops)
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT id, display_name FROM schools WHERE id IN (237, 362);
-- Expected:
--   237 | Camden
--   362 | Camden/Camden Eastside
--
-- SELECT school_id, COUNT(*) FROM tournament_entries     WHERE school_id IN (237, 362) GROUP BY school_id;
-- SELECT school_id, COUNT(*) FROM precomputed_team_scores WHERE school_id IN (237, 362) GROUP BY school_id;
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Re-point 5 tournament_entries from 362 → 237
UPDATE tournament_entries
SET    school_id = 237
WHERE  school_id = 362;

-- Step 2: Re-point 1 precomputed_team_scores row from 362 → 237
UPDATE precomputed_team_scores
SET    school_id = 237
WHERE  school_id = 362;

-- Step 3: Delete the now-empty school 362
DELETE FROM schools WHERE id = 362;

-- Verify
SELECT COUNT(*) AS remaining_362_entries     FROM tournament_entries      WHERE school_id = 362; -- expect 0
SELECT COUNT(*) AS remaining_362_precomputed FROM precomputed_team_scores WHERE school_id = 362; -- expect 0
SELECT COUNT(*) AS remaining_362_school      FROM schools                 WHERE id = 362;        -- expect 0

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Restore school 362
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (362, 'Camden/Camden Eastside', NULL, TRUE);
--
-- -- Re-point tournament_entries back to 362
-- -- (season 2, M entries only — use tournament_id to scope if needed)
-- UPDATE tournament_entries
-- SET    school_id = 362
-- WHERE  school_id = 237
--   AND  tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2 AND gender = 'M');
--
-- -- Re-point precomputed_team_scores back to 362
-- UPDATE precomputed_team_scores
-- SET    school_id = 362
-- WHERE  school_id = 237
--   AND  season_id = 2;
--
-- COMMIT;
