-- MIGRATION: 20260413_consolidate_school_69_to_393.sql
-- DESCRIPTION: Consolidate school_id 69 (Bogota/Ridgefield Park, season 1) into
--              school_id 393 (Ridgefield Park/ Bogota, season 2). These are the
--              same co-op under two IDs and two slightly different name strings.
--              Also fixes the trailing space in 393's display_name.
--              18 tournament_entries (season 1) will be re-pointed to 393.
-- APPLIED: NOT APPLIED
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT id, display_name FROM schools WHERE id IN (69, 393);
-- Expected:
--   69  | Bogota/Ridgefield Park
--   393 | Ridgefield Park/ Bogota
--
-- SELECT COUNT(*) FROM tournament_entries WHERE school_id = 69;
-- Expected: 18
--
-- ── Season-1 tournaments being re-pointed ────────────────────────────────────
--   100  Boy_s Districts District 8  (season 1)
--   126  Boy_s Regions r2            (season 1)
--   133  Boy_s States                (season 1)
--   135  Girl_s Regions North 1      (season 1)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Re-point all 18 season-1 entries from 69 → 393
UPDATE tournament_entries
SET    school_id = 393
WHERE  school_id = 69;

-- Step 2: Fix the trailing space and name order in 393's display_name
UPDATE schools
SET    display_name = 'Ridgefield Park/Bogota'
WHERE  id = 393;

-- Step 3: Delete the now-empty school 69
DELETE FROM schools WHERE id = 69;

-- Verify
SELECT COUNT(*) AS remaining_69      FROM tournament_entries WHERE school_id = 69;
SELECT COUNT(*) AS total_393_entries FROM tournament_entries WHERE school_id = 393;
SELECT id, display_name FROM schools WHERE id IN (69, 393);

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Restore school 69
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (69, 'Bogota/Ridgefield Park', NULL, FALSE);
--
-- -- Re-point season-1 entries back to 69
-- UPDATE tournament_entries
-- SET    school_id = 69
-- WHERE  school_id = 393
--   AND  tournament_id IN (100, 126, 133, 135);
--
-- -- Restore 393 display_name to original (with trailing space)
-- UPDATE schools
-- SET    display_name = 'Ridgefield Park/ Bogota'
-- WHERE  id = 393;
--
-- COMMIT;
