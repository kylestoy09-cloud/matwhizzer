-- Filler slots score as forfeits again (2026-11-02)
--
-- 20261102_remove_placeholder_entries.sql turned 22 forfeit wins over bracket filler into byes.
-- The official TrackWrestling team scores counted them as forfeits (2 points each): boys 2024-25
-- totals in source_of_truth_team_scores.csv equal the site's BEFORE values (Seton Hall Prep
-- 244.5, Columbia 140.5, Bayonne 108.5 in D13; Christian Brothers 309.5 in D21), and the byes
-- dropped each by 2 per slot. So the 22 bouts go back to win_type FORF. The filler entries stay
-- removed (loser_entry_id stays NULL): team scoring counts a bout with a win type and no loser
-- as a real win, and the bracket shows the empty side as "—". The 8 duplicate copies stay deleted.
-- ROLLBACK: set win_type = 'BYE' on the same 22 ids.

DO $$
DECLARE n integer;
BEGIN
  UPDATE matches SET win_type = 'FORF' WHERE id IN (
    'eb48078a-91b6-41e3-b1c8-d6f4bd90accb',
    '9e2dc757-2b59-41ee-b633-05fefe440353',
    '105bfa83-055e-4cd2-8a64-6721fcb0d41d',
    '4b5ec98e-4701-4809-865e-3f59f194a666',
    '651eca6e-8352-41c6-9b2d-268f862ecd81',
    'bc90909f-7e9d-42cd-833f-e7a1fc3d953f',
    '66343d97-db26-43f3-8dc9-582e932692a4',
    '56cb668b-e222-4218-a695-c2c12c143fa3',
    '6131492a-fbe5-4071-a086-cfdbabfb341c',
    'bc6e09e2-4100-4170-83b9-093827ed9082',
    'ccbe6358-182c-4edd-be47-00be0486b6ad',
    'e5f8c395-a1b4-409e-9219-efc2e4743893',
    '7102b3d2-5411-4801-b99f-b1bfc9c5343a',
    '85815f1d-aa33-4b1e-96d3-43a855ad187c',
    '0444f851-c0ac-4a21-a8ec-8a4494b13289',
    '52182483-0f45-4daf-beec-2b0deebf4bba',
    'df5fc339-d084-4383-a277-8b5df9ee29df',
    'f359c8df-7762-4601-b346-e96fb29db509',
    '6bc817a3-6fb0-4219-a3a7-a2b631c1212c',
    'c6d1b87b-5184-41fc-a1d8-4c3dd88eca5b',
    '7f64170f-eeaf-4ecc-9d6f-c9a23b5279b6',
    '467bf8d0-420a-4783-abd7-63642070fe9a') AND win_type = 'BYE' AND loser_entry_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 22 THEN RAISE EXCEPTION 'expected 22 bouts, got %', n; END IF;
END $$;
