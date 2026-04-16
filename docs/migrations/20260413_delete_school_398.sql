-- MIGRATION: 20260413_delete_school_398.sql
-- DESCRIPTION: Delete school_id 398 (display_name = '-'), a data artifact.
--              Its 2 tournament_entries belong to a synthetic "I Forfeit" wrestler
--              and carry school_context_raw = '-'. Neither entry represents a real
--              athlete. Deleting both entries and the school record is safe.
-- APPLIED: NOT APPLIED
--
-- ── VERIFICATION (run first, expect 2 rows both showing 'I Forfeit') ──────────
--
-- SELECT te.id, w.first_name, w.last_name
-- FROM tournament_entries te
-- JOIN wrestlers w ON w.id = te.wrestler_id
-- WHERE te.school_id = 398;
--
-- Expected result:
--   067a31e2-e2ba-45ca-a1e6-08e871872493 | I | Forfeit
--   294ea214-deb1-4579-812c-5b198afb2f0c | I | Forfeit
--
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Delete the 2 forfeit placeholder entries
-- entry 1: tournament_id=192 (Girl_s Districts District 7), weight_class_id=72 (132lb F)
DELETE FROM tournament_entries
WHERE id = '067a31e2-e2ba-45ca-a1e6-08e871872493';

-- entry 2: tournament_id=192 (Girl_s Districts District 7), weight_class_id=78 (235lb F)
DELETE FROM tournament_entries
WHERE id = '294ea214-deb1-4579-812c-5b198afb2f0c';

-- Step 2: Delete the school record
DELETE FROM schools WHERE id = 398;

-- Verify: both should return 0 rows
SELECT COUNT(*) AS remaining_entries FROM tournament_entries WHERE school_id = 398;
SELECT COUNT(*) AS remaining_school  FROM schools WHERE id = 398;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Re-insert school record
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (398, '-', NULL, FALSE);
--
-- -- Re-insert entry 1 (wrestler_id = 'I Forfeit' placeholder)
-- INSERT INTO tournament_entries (id, wrestler_id, tournament_id, school_id, weight_class_id, school_context_raw)
-- VALUES (
--     '067a31e2-e2ba-45ca-a1e6-08e871872493',
--     '4f9f380b-27a0-4d69-992c-3b3dbed5e70e',
--     192, 398, 72, '-'
-- );
--
-- -- Re-insert entry 2
-- INSERT INTO tournament_entries (id, wrestler_id, tournament_id, school_id, weight_class_id, school_context_raw)
-- VALUES (
--     '294ea214-deb1-4579-812c-5b198afb2f0c',
--     '4f9f380b-27a0-4d69-992c-3b3dbed5e70e',
--     192, 398, 78, '-'
-- );
--
-- COMMIT;
