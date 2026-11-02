-- Remove bracket filler entries (not wrestlers) from the postseason (2026-11-02, approved by Kyle)
--
-- 19 tournament_entries with no school whose only bouts are forfeit losses: "Forefit A" x5 (boys
-- D13 2024-25), Anthony Ashnault / Scott Goodale / Sebastian Rivera / Michael Tomaino (boys D21
-- 2024-25), Brian Grainer (boys D23 2024-25), 8 girls D9 2025-26 names (on the Track review
-- list as "girls with no school"), and one girls D5 2025-26 entry whose wrestler_id points at no
-- profile. 0 placements, 0 dual or in-season bouts, 0 ratings.
--   * 22 forfeit wins over filler become byes (loser NULL, win_type BYE): an empty slot
--   * 9 bouts deleted: 8 duplicate copies + 1 filler-vs-filler
--   * the 19 entries, then the 14 filler profiles: Anthony Ashnault, Brian Grainer, Briana Grainer, Forefit A, Jade Graham, Josephine Lemke, Josephine Panfilli, Justina Barowsky, Michael Tomaino, Patricia Brady, Scott Goodale, Sebastian Rivera, Tie Willis, WIlma Bayne
-- Backup (every row, plus team scores before): docs/migrations/backups/20261102_placeholder_entries_before.json
-- The service role can only read matches (20260811_grant_postseason_tables.sql), so this runs here.
-- ROLLBACK: re-insert the backed-up rows (profiles, entries, matches) and restore the 22 matches' loser/win_type.

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM tournament_entries WHERE id IN (
    '3245c7b3-1ee5-4aaf-aa26-347f1912b7cc',
    '45104dfb-0999-4b88-b9c6-b57de158a551',
    '111926c0-8fbd-4ee4-89ed-bb58b1d5c09a',
    '81377799-ed64-4871-a0d8-d697e1f4c54e',
    '7a480fdf-95e3-4117-a4a3-cf20c0c17ba2',
    '9ba17cb5-7655-4116-91ae-691fce992dae',
    '066fc3d4-4f08-4c1e-8109-00efe77d1fdc',
    '426d93ab-0576-4634-a4bc-713c248e2e81',
    'cffd982c-8b69-4109-8d42-fc2e5e491b3e',
    'a81faeee-7fb4-4e88-8d11-c184bf9eb767',
    '206ed599-1f1d-41e6-a966-13acb238589e',
    'fb8f8d18-eed1-41ae-b42d-46483788eb81',
    'f55ed78e-dd1e-483e-a8ec-251cf7375c5f',
    '582fd422-fbdf-4fcd-93f6-d442ea19acee',
    'b521e6bd-2489-4c5c-babe-11feea433037',
    '0ee744e3-e470-4ddb-9d05-2e22922b1bfe',
    '0276c35d-4ff6-41fb-815a-7ecb0e8f2418',
    'bb4ebf82-9972-4272-9959-247510657473',
    'ec4aa6c8-fdac-4e6a-a6f8-0eaf43d02f89') AND school_id IS NULL;
  IF n <> 19 THEN RAISE EXCEPTION 'expected 19 filler entries, found %', n; END IF;

  UPDATE matches SET loser_entry_id = NULL, win_type = 'BYE' WHERE id IN (
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
    '467bf8d0-420a-4783-abd7-63642070fe9a') AND win_type = 'FORF';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 22 THEN RAISE EXCEPTION 'expected 22 byes, got %', n; END IF;

  DELETE FROM matches WHERE id IN (
    '72713494-1872-4f23-aaed-adb5f2f4ea71',
    'ad27f9fe-4500-4f8f-8b61-635fe9cc3f32',
    'b6912e24-3197-471f-8ca7-dc939876e03b',
    '44cc2f49-7665-4e15-98db-7b12434147c9',
    '33e189c9-8d78-4c34-b5c8-b706b966bd47',
    'ecb086c4-f960-427c-a496-dd761c705f9e',
    '3a9b18be-d1f0-4ab6-ba8c-4f4dff623d45',
    '07c037cc-4e41-4d4f-b0d7-14992fd8051e',
    'dbce6577-fd54-40e1-b82c-3eeb1e97536c') AND win_type = 'FORF';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 9 THEN RAISE EXCEPTION 'expected 9 bouts deleted, got %', n; END IF;

  DELETE FROM tournament_entries WHERE id IN (
    '3245c7b3-1ee5-4aaf-aa26-347f1912b7cc',
    '45104dfb-0999-4b88-b9c6-b57de158a551',
    '111926c0-8fbd-4ee4-89ed-bb58b1d5c09a',
    '81377799-ed64-4871-a0d8-d697e1f4c54e',
    '7a480fdf-95e3-4117-a4a3-cf20c0c17ba2',
    '9ba17cb5-7655-4116-91ae-691fce992dae',
    '066fc3d4-4f08-4c1e-8109-00efe77d1fdc',
    '426d93ab-0576-4634-a4bc-713c248e2e81',
    'cffd982c-8b69-4109-8d42-fc2e5e491b3e',
    'a81faeee-7fb4-4e88-8d11-c184bf9eb767',
    '206ed599-1f1d-41e6-a966-13acb238589e',
    'fb8f8d18-eed1-41ae-b42d-46483788eb81',
    'f55ed78e-dd1e-483e-a8ec-251cf7375c5f',
    '582fd422-fbdf-4fcd-93f6-d442ea19acee',
    'b521e6bd-2489-4c5c-babe-11feea433037',
    '0ee744e3-e470-4ddb-9d05-2e22922b1bfe',
    '0276c35d-4ff6-41fb-815a-7ecb0e8f2418',
    'bb4ebf82-9972-4272-9959-247510657473',
    'ec4aa6c8-fdac-4e6a-a6f8-0eaf43d02f89');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 19 THEN RAISE EXCEPTION 'expected 19 entries deleted, got %', n; END IF;

  -- a foreign-key error here means a profile still has data: the whole block rolls back
  DELETE FROM wrestlers WHERE id IN (
    '07029b54-aab4-449b-b6a8-4b46c6de2197',
    '3f2911d5-95bb-46bd-967e-a2e52151e38f',
    '4bdc8efe-fca7-4a97-8d30-c2cfc06a4d11',
    '5ce2cfdd-5fa4-43a7-b6ce-ab7dcd424e2c',
    '6636fbe1-41d7-4e1f-b823-433af0ec11cd',
    '6a94ff3c-dbef-4394-a4ee-3c05602647ea',
    '6fb0626d-ff0a-439d-94c8-5c473bf28d22',
    'a9a7f286-3dcf-4b31-a088-5f48087bdcfd',
    'ad2748d1-0a41-494b-9d32-96ef81a2f7b0',
    'b3cee6e4-812d-471e-9013-96178fe8da0c',
    'b654bcc9-c166-48a6-802d-053eb07fb0ca',
    'c18f4659-7f7c-44df-ab3c-19b93479d0ff',
    'e70c015a-209f-4fe6-bd2f-425947634966',
    'e9c45483-5464-4f7c-a96f-9ca117d9666e');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 14 THEN RAISE EXCEPTION 'expected 14 profiles deleted, got %', n; END IF;
END $$;
