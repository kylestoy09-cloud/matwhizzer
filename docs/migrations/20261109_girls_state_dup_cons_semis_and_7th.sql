-- Girls 2025-26 State (tournament 185): remove 24 duplicate consolation semifinals; add the 107 7th place bout (2026-11-09)
--
-- 1. The 24 cons. semifinals (round C4) are each stored twice, identical (same wrestlers, result, score, time):
--    48 rows where the TrackWrestling export has 24. Each wrestler's record counts the bout twice. Deletes one
--    copy of each (the larger id); the other stays. Delete approval: pending (Kyle). Backup of every deleted
--    row and its kept twin: docs/migrations/backups/20261109_girls_state_duplicate_cons_semis_before.json. Nothing references a match row by id.
-- 2. The 107 7th place bout: Olivia Mitchell (East Brunswick) won by tech fall over Kayla Coletta (Mary Help of
--    Christians Academy), TF-1.5 2:10 (18-3), from the export. The 2026-10-26 Coletta restore
--    (20261026_restore_mary_help_kayla_coletta.sql) missed it; their 7th and 8th placement rows are stored.
-- Built by scripts/build_girls_state_fix_20261109.mts.
-- ROLLBACK: re-insert the deleted rows from the backup; DELETE the 7th place bout (round 7th_Place, weight class 68).
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM matches WHERE tournament_id = 185 AND round = 'C4';
  IF n <> 48 THEN RAISE EXCEPTION 'expected 48 cons. semifinals before, found %', n; END IF;

  DELETE FROM matches WHERE tournament_id = 185 AND round = 'C4' AND id IN (
    '50dec9f1-fb9a-4e1e-9c69-c6c38fa08bb3',
    'c7f825f0-d40b-472c-97ee-99ea1ee2f337',
    'f652c676-d82b-4fd0-aea8-0d776c40cdff',
    'eab52abc-e7f8-4521-b738-e3c662d5887d',
    '52f16e7a-f27c-42b8-a3b1-fbc76860c9a4',
    'b7b5d3f1-1312-4573-9dca-ba29b3361ce0',
    '34fe42dc-40fa-4a7f-a856-a483e3a7204f',
    'ff153f2f-81fb-40e6-9f34-5217f67c87bf',
    'a0093f35-5c26-469e-8159-04ddc9755923',
    'a244279c-44e3-412a-9005-d1950e619864',
    '301c92bc-2d13-4287-8737-795d475d8c8c',
    '9182dc78-8f6c-44da-997e-2650d5d7f8b9',
    '384e02c1-9d24-4301-a616-274bfdbde126',
    '96936641-774b-40e5-957d-addb8fd9ee56',
    'a1aba00c-03db-40f1-a1ef-80d51317a8cd',
    'a9a95fb2-7306-4ddb-a50e-bb879eb25fde',
    'f3aecea7-9529-4180-8709-c6a598b5cb81',
    'e6d8016a-1613-470a-b38e-b9e0acb124c0',
    '815055a6-7670-4c9f-8317-fb3f2e6158f8',
    'cd557da2-8085-4663-ae9d-806a4f5f6583',
    'cd72f002-a30c-495e-9c57-cbf22d19e332',
    '63712569-e651-4a3e-8651-c7f0e9a0ad5f',
    'b80a2094-8bdd-4fb1-ba8e-7b73da7cc60f',
    'd5e8075b-f671-4b66-90c5-e097b719cc59'
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 24 THEN RAISE EXCEPTION 'expected to delete 24 duplicates, deleted %', n; END IF;

  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id = 185 AND round = '7th_Place' AND weight_class_id = 68) THEN
    RAISE EXCEPTION '107 already has a 7th place bout';
  END IF;
  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES (185, 68, 'consolation', '7th_Place', '0d569475-1b84-445f-90ec-5f4e06f4633d', 'd4470f4a-0eab-4c3f-aa4c-4aac80bab9c5', 'TF-1.5', 18, 3, 130, true);
END $$;

-- Verify: 24 cons. semifinals, 12 7th place bouts
SELECT round, count(*) FROM matches WHERE tournament_id = 185 AND round IN ('C4', '7th_Place') GROUP BY round ORDER BY round;
