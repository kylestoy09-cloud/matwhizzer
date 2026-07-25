-- docs/migrations/20260723_sam_cali_wrestler_stub_fix2.sql
--
-- Fixes 3 wrestler records that still had stub first_names after
-- 20260723_sam_cali_stub_wrestler_records.sql was applied.
--
-- Root cause: that file used subqueries keyed on wrestler_name_raw values
-- (e.g. wrestler1_name_raw = 'C. O''Connor'). The two bout name_raw patches
-- (20260722_sam_cali_name_fix.sql and 20260723_sam_cali_stub_name_fix.sql) had
-- already run, so those name_raw values were already full-form ("Collin O'Connor").
-- The subqueries returned 0 rows → no-op for those 3 wrestlers.
--
-- Also: N. O'Sullivan was incorrectly excluded from the first file (wrongly
-- assumed CHAM = None in _TEAM_TO_SCHOOL; CHAM actually maps to school_id 397,
-- so get_or_create_wrestler was called and a stub record was created).
--
-- Fix: target each record by its primary key (ID). Already applied via REST API
-- PATCH on 2026-07-23 and confirmed 0 stub records remain.
--
-- ── CONFIRMED IDs ─────────────────────────────────────────────────────────────
--   bf9f6d2e-9736-44e3-88a6-6e27b6282687  C. O'Connor → Collin O'Connor  (126lb, DePaul)
--   9f684e87-f472-41fb-813e-60cdb55c8699  B. Washington → Navell Washington  (190lb, Demarest)
--   e2fdda6f-c718-47f6-bfe2-d7775a73808e  N. O'Sullivan → Nate O'Sullivan  (126lb, Chatham OOS)

BEGIN;

UPDATE wrestlers SET first_name = 'Collin'
WHERE id = 'bf9f6d2e-9736-44e3-88a6-6e27b6282687';
-- Expected: UPDATE 1

UPDATE wrestlers SET first_name = 'Navell'
WHERE id = '9f684e87-f472-41fb-813e-60cdb55c8699';
-- Expected: UPDATE 1

UPDATE wrestlers SET first_name = 'Nate'
WHERE id = 'e2fdda6f-c718-47f6-bfe2-d7775a73808e';
-- Expected: UPDATE 1

COMMIT;

-- ── POST-APPLY VERIFY ─────────────────────────────────────────────────────────
-- SELECT w.id, w.first_name, w.last_name, tb.weight_class
-- FROM tournament_bouts tb
-- JOIN wrestlers w ON w.id = tb.nj_wrestler1_id OR w.id = tb.nj_wrestler2_id
-- WHERE tb.in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
--   AND w.first_name ~ '^[A-Z]\.$'
-- ORDER BY tb.weight_class;
-- Expected: 0 rows
