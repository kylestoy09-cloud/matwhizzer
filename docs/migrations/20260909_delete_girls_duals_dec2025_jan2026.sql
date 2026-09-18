-- ─────────────────────────────────────────────────────────────────────────────
-- 20260909_delete_girls_duals_dec2025_jan2026.sql
--
-- Removes all girls dual meet data for December 2025 and January 2026
-- so the correct data can be reimported with fixed weight-class parsing.
--
-- Affected tables:
--   dual_meets_girls        — parent rows deleted directly
--   dual_meet_matches_girls — deleted via ON DELETE CASCADE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_meet_count   integer;
  v_match_count  integer;
BEGIN
  -- Count what will be removed
  SELECT COUNT(*)
  INTO v_meet_count
  FROM dual_meets_girls
  WHERE meet_date >= '2025-12-01'
    AND meet_date <= '2026-01-31';

  SELECT COUNT(*)
  INTO v_match_count
  FROM dual_meet_matches_girls dmm
  JOIN dual_meets_girls dm ON dm.id = dmm.dual_meet_id
  WHERE dm.meet_date >= '2025-12-01'
    AND dm.meet_date <= '2026-01-31';

  RAISE NOTICE 'About to delete % girls dual meets and % match rows (Dec 2025 – Jan 2026)',
    v_meet_count, v_match_count;

  -- Delete parent rows; matches cascade automatically
  DELETE FROM dual_meets_girls
  WHERE meet_date >= '2025-12-01'
    AND meet_date <= '2026-01-31';

  RAISE NOTICE 'Done. % meets deleted (matches cascaded).', v_meet_count;
END $$;
