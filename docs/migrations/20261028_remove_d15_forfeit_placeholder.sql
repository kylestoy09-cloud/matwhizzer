-- docs/migrations/20261028_remove_d15_forfeit_placeholder.sql
--
-- Boys 2024-25 District 15 (tournament 107). One "Forfeit" placeholder wrestler
-- (695a60e5, record already deleted, no school) is entered at 7 weights, each a
-- QF forfeit to the top seed — byes stored as matches:
--   113 Jacob Richardson   138 Michael Hasson   144 Max Ventura   157 Luke Sinkewicz
--   165 Kwabena Morgan     175 Jack Griffin     190 Sean O'Neill
-- The other placeholders were removed the same way in 20260413_delete_schools_367_399
-- and 20260413_delete_school_398. Deletes the 7 matches, then the 7 entries.
-- No placements; team_points 0. The boys team-score cache refreshes itself.
--
-- Counts and approval: 7 entries / 7 matches / 0 placements, approved 2026-10-28.
-- Backup: docs/migrations/backups/20261028_remove_d15_forfeit_placeholder.json
-- Protected tables: this script unlocks guard_protected_delete for its own
-- transaction only (20261026_guard_protected_deletes.sql).

DO $$
DECLARE n integer;
BEGIN
  PERFORM set_config('matwhizzer.allow_protected_delete', 'on', true);

  DELETE FROM matches WHERE id IN (
    '68d3e371-d574-4b11-96d1-ebc2593e035b', '204cd37e-1710-460b-9637-a2364ccbdace',
    '7989f6cc-8861-43fe-8e48-31419fc65c63', 'e04d087f-c640-4010-909b-066fab5d4c2e',
    '8ca59a39-a57b-4338-b735-50a4c00e7ebe', 'b75de168-f23b-41b7-8a9d-91dd481e4212',
    '4b5048d0-43d7-4ad8-a428-3c6ea0a8d02a')
  AND (winner_entry_id IN (SELECT id FROM tournament_entries WHERE wrestler_id = '695a60e5-9a01-42b0-9c0d-a8bcac35cc37')
    OR loser_entry_id  IN (SELECT id FROM tournament_entries WHERE wrestler_id = '695a60e5-9a01-42b0-9c0d-a8bcac35cc37'));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN RAISE EXCEPTION 'expected 7 matches, got %', n; END IF;

  DELETE FROM tournament_entries
  WHERE wrestler_id = '695a60e5-9a01-42b0-9c0d-a8bcac35cc37' AND tournament_id = 107;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN RAISE EXCEPTION 'expected 7 entries, got %', n; END IF;

  RAISE NOTICE 'Removed District 15 Forfeit placeholder: 7 matches, 7 entries';
END $$;

-- Verify: expect 0
SELECT COUNT(*) FROM tournament_entries WHERE wrestler_id = '695a60e5-9a01-42b0-9c0d-a8bcac35cc37';

-- ROLLBACK: re-insert entries, then matches, from the backup file (with the
-- guard unlocked is not needed for inserts).
