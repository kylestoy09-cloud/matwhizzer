-- docs/migrations/20261110_delete_magee_self_bout.sql
--
-- Pinned list item 2: 2026 SJWHOF Girls Varsity (2026-01-04), 107, placement round, NC — the source listed
-- Ella Magee (Schalick) on both sides, so one bout row has her against herself. Not rated (NC; no score-log
-- row). Kyle 2026-11-10: delete it. Backup: docs/migrations/backups/20261110_magee_self_bout.json
-- Run in the Supabase SQL editor.

DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('matwhizzer.allow_protected_delete', 'on', true);  -- approved by Kyle 2026-11-10
  DELETE FROM tournament_bouts_girls
  WHERE id = '9d96ee7a-7da6-468b-851a-6d0742e29daf'
    AND wrestler1_id = '544400d7-31f9-4d68-950e-2f10d4f03324'
    AND wrestler2_id = '544400d7-31f9-4d68-950e-2f10d4f03324'
    AND result_type = 'NC';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'expected 1 row, got %', n; END IF;
END $$;

-- Verify: 0
SELECT count(*) AS self_bouts_left FROM tournament_bouts_girls WHERE wrestler1_id = wrestler2_id;
