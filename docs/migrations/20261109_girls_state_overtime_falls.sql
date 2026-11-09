-- docs/migrations/20261109_girls_state_overtime_falls.sql
--
-- Girls 2025-26 State: two overtime bouts that ended by a fall are stored as overtime decisions, so the fall
-- bonus (2) is missing. These are the only overtime-by-fall results in any TrackWrestling export (boys or
-- girls). Found by the girls scoring check: Morristown and Rancocas Valley were each 2 below their official
-- totals; with these, every 2025-26 girls state school matches.
--   Cons. Round 2 - Gyssell Andrade (Morristown) won in SV-1 by fall over Emmy Rea Hotz (Delaware Valley)
--                   (SV-1 (Fall) 6:11)                         stored SV-1, no time
--   Champ. Round 1 - Jeveah Turner (Rancocas Valley) won in TB-1 by fall over Denise Valencia (Maple Shade)
--                   (TB-1 (Fall) 7:41)                         stored UTB, no time
-- Stored as falls with the time from the export (6:11 = 371 s, 7:41 = 461 s).
-- ROLLBACK: UPDATE matches SET win_type = 'SV-1', fall_time_seconds = NULL WHERE id = 'e3da2e6a-ee9e-4481-962c-245b6c797327';
--           UPDATE matches SET win_type = 'UTB',  fall_time_seconds = NULL WHERE id = '60fbe7bb-65e3-451f-99d0-a52ab05c4396';
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  UPDATE matches SET win_type = 'FALL', fall_time_seconds = 371
  WHERE id = 'e3da2e6a-ee9e-4481-962c-245b6c797327' AND tournament_id = 185 AND round = 'C2' AND win_type = 'SV-1';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Andrade bout: expected 1 row, updated %', n; END IF;

  UPDATE matches SET win_type = 'FALL', fall_time_seconds = 461
  WHERE id = '60fbe7bb-65e3-451f-99d0-a52ab05c4396' AND tournament_id = 185 AND round = 'R1' AND win_type = 'UTB';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Turner bout: expected 1 row, updated %', n; END IF;
END $$;

-- Verify: both FALL, 371 and 461
SELECT id, round, win_type, fall_time_seconds FROM matches
WHERE id IN ('e3da2e6a-ee9e-4481-962c-245b6c797327', '60fbe7bb-65e3-451f-99d0-a52ab05c4396') ORDER BY round;
