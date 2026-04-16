-- MIGRATION: 20260413_consolidate_school_380_to_379.sql
-- DESCRIPTION: Consolidate school_id 380 (Lodi/Saddle Brook High School, boys)
--              into school_id 379 (Lodi/Saddle Brook, girls). Both are the same
--              Lodi+Saddle Brook co-op — split into two IDs only because the boys
--              and girls PDFs used slightly different name strings during import.
--              14 boys tournament_entries will be re-pointed from 380 → 379.
--              School 379 display_name is already correct ('Lodi/Saddle Brook').
-- APPLIED: NOT APPLIED
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT id, display_name FROM schools WHERE id IN (379, 380);
-- Expected:
--   379 | Lodi/Saddle Brook
--   380 | Lodi/Saddle Brook High School
--
-- SELECT school_id, COUNT(*) FROM tournament_entries
-- WHERE school_id IN (379, 380) GROUP BY school_id;
-- Expected:
--   379 | 11   (girls: districts 188, regions 181, state 185)
--   380 | 14   (boys:  districts 146, regions 173)
--
-- ── Tournaments being re-pointed (school 380 → 379) ──────────────────────────
--   146  Boy_s Districts District 7  (season 2, M)
--   173  Boy_s Regions r2            (season 2, M)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Re-point all 14 boys entries from 380 → 379
UPDATE tournament_entries
SET    school_id = 379
WHERE  school_id = 380;

-- Step 2: No display_name change needed — 379 is already 'Lodi/Saddle Brook'

-- Step 3: Delete the now-empty school 380
DELETE FROM schools WHERE id = 380;

-- Verify
SELECT COUNT(*) AS remaining_380     FROM tournament_entries WHERE school_id = 380;
SELECT COUNT(*) AS total_379_entries FROM tournament_entries WHERE school_id = 379;
SELECT id, display_name FROM schools WHERE id IN (379, 380);

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Restore school 380
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (380, 'Lodi/Saddle Brook High School', NULL, FALSE);
--
-- -- Re-point boys entries back to 380
-- UPDATE tournament_entries
-- SET    school_id = 380
-- WHERE  school_id = 379
--   AND  tournament_id IN (146, 173);
--
-- COMMIT;
