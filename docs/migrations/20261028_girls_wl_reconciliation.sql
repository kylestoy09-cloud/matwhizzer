-- docs/migrations/20261028_girls_wl_reconciliation.sql
--
-- Girls 2025-26 (season 2026). Brings team W-L in line with the official
-- standings (power_points, 2026 final standings girls). Each change brings BOTH
-- schools closer to their official record; together they take exact matches from
-- 97 to 206 of 274 schools (docs/girls_2025_26_wl_reconciliation.md). The
-- official records mostly leave out thin meets (0-2 bouts wrestled) and meets
-- between two non-classified schools; there is no date cutoff.
--
-- 1. 180 meets the official records don't count: counts_toward_record = false.
--    Bouts stay on wrestler profiles. 44 are pending ties — they stay pending.
-- 2. 5 jamboree pairings the official records count: counts_toward_record = true.
-- 3. 3 pending ties won by team1 — the official record agrees with Track's
--    "Team Id" tiebreaker in each (lower Team Id wins): Sterling over West
--    Deptford (01-16), Mountain Lakes over Elmwood Park (01-10), Clayton/
--    Glassboro over Pennsville (02-04). Winner +1, criteria winner set, not
--    pending, microcheck task completed (same as 20261024_resolve_girls_ties).
-- Not applied (bouts contradict the official record): WW-P South vs Robbinsville
-- (01-21), Freehold Borough vs Colts Neck (01-03).
--
-- Approved 2026-10-28. Backup: docs/migrations/backups/20261028_girls_wl_reconciliation.json

DO $$
DECLARE r record; n integer;
BEGIN
  UPDATE dual_meets_girls SET counts_toward_record = false WHERE season_id = 2026 AND id IN (
    '00694249-b4a6-482b-b015-a0d161621413',
    '00748f8b-b903-4389-9f77-feef069ece44',
    '04259058-c486-412d-aa15-5ccca1fff48b',
    '046532f2-30d4-4ae6-b049-735254fe9a7a',
    '04b383da-6d73-4aa9-a8ed-22e93d26f352',
    '052345ed-9d34-4e1a-89ec-a277f86a53cd',
    '077b8d26-905e-4e6f-bb96-8fd8b0e2350a',
    '080d5037-9670-4dd8-9a9a-84609b96fd1f',
    '09881279-afd8-4305-88c0-e709c3399a5c',
    '0c48f8d9-8fc7-4d8e-93ca-122c31ae954c',
    '0c995f4b-ea17-4f8c-ae96-5e556db9e975',
    '0cea9394-fe7a-4d19-92db-f8f44ca0e0c7',
    '0d219166-5f46-4485-b55b-dd05b826fe66',
    '0e070f12-96dc-4e4a-bacb-c03402d21244',
    '0e20eadc-43f9-472b-9872-00095f3d0252',
    '0e555067-15c6-48a8-8b5d-779c4af3a304',
    '0e5fdd30-fe5a-4621-b29f-3b1cfec291d0',
    '0e952fa5-8892-4c73-91da-4b685fde778f',
    '0f26d19a-c522-41b7-9740-b256a1d856e1',
    '0fb3ccd2-9288-4194-b765-88c069f4ffd6',
    '108f6ae1-8542-4d19-94fd-7c1857614f14',
    '11169e84-d814-4990-944b-fafc59bb723d',
    '1205db60-1646-4d98-ac3f-4a6a06f0cc15',
    '14ead297-ec57-4c50-b8ef-51c26e3549ed',
    '1504b8c0-dd4c-41b8-9b91-ee8f37f44bb8',
    '15ac64ad-d71d-4be9-976a-b3d2190bd69a',
    '15cbd37c-8c86-410b-aef8-ad2c1075ae28',
    '175dc522-9c90-4bbd-ba37-8bfabf788342',
    '17aec085-8636-484d-9fe6-6f5065775175',
    '18f58e24-5e39-4442-9b2d-b58903678a2d',
    '1932ef63-7b7a-4333-a0d1-21ca8047e948',
    '1958cf0c-0cff-4d57-b28d-66abdf263015',
    '19835dce-aabb-41e2-b9eb-070e3364e7a2',
    '1e325994-1af2-4599-af19-0b47c48032a0',
    '1eaffcbd-7200-4972-855a-cb000aebfd62',
    '1eca7326-a43d-4234-8067-0eb7ff162c32',
    '1f5023f1-7296-44a2-bdd1-544cbe1a2dd7',
    '2032433d-e2cd-4340-b157-a07053f0ccaf',
    '204282a2-1e58-4dfc-aa4f-e911983aa5da',
    '2056db90-c9fd-43d9-877c-9ca0bc0f3391',
    '2060f4ac-e37b-4e01-8390-2d8503aa0402',
    '21a11ef6-3d37-4b69-aa1e-a18fb7ec36c9',
    '24676f7d-eb1b-43c3-9aaa-fb2c10f88935',
    '26e21299-6e41-4064-912b-1b850ec7f2cb',
    '27517451-54d8-4397-96f5-baacd14a5528',
    '29f84033-92ba-43d5-9d30-804ae7297731',
    '2a1255f9-baf6-4663-99a8-0181ad28d1c8',
    '2a8bc26b-a6c1-4690-b6c8-7c64c8337af0',
    '2b4b36ce-56fc-40a3-906c-c42db515e562',
    '2c9cae1a-8e6d-4395-bc89-021bd5e15eac',
    '2caaa817-5fa6-4946-831f-8fe7b5753bc4',
    '2d46b639-71ab-4d09-a35d-2bd4b805a100',
    '2fa1a568-e811-418f-a681-6500dcad1cf2',
    '304a993c-b716-45e1-acc2-6d7ee108701c',
    '322665c2-112d-4889-98b2-213d1cee2a04',
    '323d2b19-03d9-4299-99f8-14009a8b2291',
    '3331c581-6cfc-4b46-90ae-88160f6ab1cc',
    '3589d3df-a1e1-4891-b99b-d3217ebc9704',
    '375472d1-f8aa-4f1d-8018-dc982d704533',
    '3b3bf4cd-97ab-4716-82da-4660253c817f',
    '3bf282cd-f079-4f44-9590-fe548a4e61f8',
    '3c9adff5-8941-4091-a8bb-bf75fc8caae0',
    '3cfb48ff-60f0-48e9-ad40-023a2ced9fd6',
    '3d8526b1-ae0e-45d9-b6db-dffa062cc46d',
    '3ee683d5-686e-4dbb-b551-9ff8738d9340',
    '3fe1b369-9f3b-4755-8fd7-85595eede868',
    '4067a317-11b6-44df-86c0-00d24af22d3c',
    '41726b61-e4cb-4cfd-8343-9070c12e5055',
    '41a351b7-9c82-4f9d-a10c-d23509a6bc52',
    '41ce5c52-7ea3-4355-b9df-57d3a678ef23',
    '420c2623-aa45-4058-a94e-351b1412e922',
    '44e0a183-3afe-48d6-895f-2486d382c44d',
    '48e40fe4-0630-4dc9-8b16-94eece2256f8',
    '4a4b5cac-52f5-4098-9b93-c8dab150232d',
    '4af6c53f-bc97-4c30-b453-d98313952e92',
    '4bb20746-6a80-443d-819b-79c9ce1bd671',
    '4c08b28b-3289-4e6e-b419-e1e7127b0035',
    '4c79b4a5-e281-40b5-8418-d83d9a324b8f',
    '4d0f0951-92d5-41ef-bceb-4c29c4c214c7',
    '4d65378e-be22-48e1-8b47-796039368922',
    '4e3f72fc-2bc1-4a88-868f-530ff94e3dad',
    '4ed91f03-598c-402c-a027-fe95d3394835',
    '50e26d73-bf30-4157-8ed1-8eb93cb75299',
    '525196d6-97ce-4fcf-ad5a-1157fe02c270',
    '525dbd1e-5018-47ba-b704-8dbb8d3ff1d0',
    '5350ab19-5cf4-4c88-b0c3-c2cf0fa392fa',
    '569a270c-de37-474e-9f5e-001bfc4765f0',
    '57117d70-876d-486f-b4d4-2836d4dd5677',
    '584a5d97-6cf9-44e0-8c48-fa1041a5cb3f',
    '5a88d4ce-175d-4f52-b4b6-cf159806406f',
    '5ae3c5e8-0aa2-483e-9975-8069b0a42af6',
    '5c0adbb7-46e8-4e73-a954-83c01a880346',
    '5d3b9e14-ede1-4858-ab8d-6af936a17ea1',
    '5d74e777-75e0-4c51-99f7-1bbfd5695686',
    '5d89c884-710d-4f92-b4f7-31c704701761',
    '5e151f4d-2af8-4383-8373-7db1900644d9',
    '5e4f6406-a4ce-4544-b547-0fe004ad7e7b',
    '5e6d42ba-94f0-4ee5-9304-b219ff4d70e7',
    '5ec015e8-1762-439a-a798-0b9469b65574',
    '5ef033e6-4189-4923-b2aa-75c4c58a511f',
    '5f0358c3-68dc-4010-8e66-14285f754fb8',
    '60cbfd42-34cf-43fc-8189-579a9ff1dcb4',
    '62ba479b-d6af-4758-9528-5f28f650548a',
    '63030a45-0be4-4980-81c9-b845fab11ef7',
    '65423eb6-96bc-49cc-90a0-521a6ddacfba',
    '6703176f-592a-4c44-9cbb-5e8de4e1b792',
    '670680d0-4b86-4e85-8ba5-3abb9ce4ea5e',
    '68085ca9-c26a-4c5a-ac65-a378c5d49770',
    '689ce94c-1357-4998-8e6e-60b4ee050499',
    '6a7a765d-8a5c-4762-a477-2bcf89b9cbd3',
    '6b0ea095-7808-4c92-bdda-27a52ad8fd76',
    '6c61fc72-b333-417f-a064-68efd57f5f6e',
    '6ff431fc-cb7c-4c96-983c-57706d305b29',
    '702c89ce-239b-447b-bc69-ca629c67d04e',
    '7138eb04-daf6-4a28-83ac-45a2eaac1dca',
    '7153aa31-d2ae-4afe-96af-322a2c933a86',
    '71b6eebe-2e87-4772-a5af-9b3aa4f36db2',
    '72f1c279-087c-4f46-897a-af3a7b64312d',
    '7679be48-4264-4d8b-a538-2cf24a3db9da',
    '774e5cb4-c30f-48f9-919c-5cb39432050b',
    '7769b326-8f71-415f-9bd6-8d03cbdaeefd',
    '77b45ff0-7d0c-4331-96de-beb89fd366c4',
    '7d0e2033-596a-4391-bb68-d4ea69524ea4',
    '81619672-b5a3-4c14-9697-2414d8d2f066',
    '823cf6cd-b991-43fa-9d2c-3f434ec04725',
    '838dadfb-a795-4d57-903c-e14e6f0ce977',
    '851a49da-41bc-41a7-8569-de2428ed83e7',
    '884ce9e7-7844-40da-9d6e-e5c494f80276',
    '8d18ecf6-68a6-46ac-89d1-f19d5d6b30d5',
    '905701ab-0d5d-4da2-bad2-b75247a52534',
    '949cce28-2cdb-4206-99c5-8ed72efd07ab',
    '95e42abd-ddff-4b78-aa5e-d02378c5b2df',
    '97521526-20cb-48da-8aa7-827c11ea7fcc',
    '97a1fb39-9ec0-44f1-89f6-d2e3e960e24c',
    '97bc32c3-cd88-4dc6-ab14-16f2ea541313',
    '98f0e184-799a-4596-9222-6e9b2bcebd46',
    '9bc4871a-87da-4709-aa3a-6b17722434ca',
    '9f98a983-eca2-4cf5-a27f-525defa5724d',
    '9f9d49c2-15f0-4bdb-be12-d4dfeef2c9e8',
    'a23d9626-abb3-423c-bea0-20ac368418da',
    'a331e1bf-8c09-4642-9850-ae3e3f34c165',
    'a9a9ac17-8d70-4c80-b8a0-b6c8f901b26a',
    'aa31b06f-b75e-4867-b4e3-2bbd539ecbd7',
    'ab90d930-bde3-4851-9ef5-ca67d79c9bc1',
    'acc38b07-5c8e-42cf-9b30-785fa4d1fae8',
    'b2330eb0-da97-4dc4-a88d-a3c7bf4dab05',
    'b5db7bb5-9732-4f34-a55f-8fbe6b989c39',
    'bcc12189-bdba-44f1-b150-421963cb826e',
    'be25f218-50f0-45a2-9e06-b48c631051ff',
    'bfa8c04a-c972-447b-b38b-e649e13136dc',
    'c091ee41-90c9-40ca-b6a7-4eb2d88bf494',
    'c0d94b22-f50b-4144-9919-8bccf2edad6f',
    'c299a8f5-a5e8-4330-a99e-d9bcb0b7b8c2',
    'c4a65170-5fb5-4a26-9b45-7e5e467e2a05',
    'c614009c-8b09-4d1a-b7e0-fbb1e1a21cd1',
    'd070ccde-5c9e-4d70-a36a-774ead65b04a',
    'd3778852-0d83-42ab-b01f-ea1bc00a52bd',
    'd5bf1072-60d3-49a6-869b-db31c7f05fbf',
    'd666d57f-1ef3-47a4-a530-669ac8683a04',
    'd8ff8c5e-5f05-426a-8a0f-d181ace0a220',
    'dbbdda51-8bd9-4ffa-a626-73e7042f5e50',
    'e0be04e4-3bf4-40b5-b78d-23b686171507',
    'e1a3fdb5-6835-45c0-8b8e-5fa7a7a5bbcd',
    'e47f5a42-9579-4f5a-aa44-1cb07bf50b65',
    'e5ab9c44-6567-43e9-be51-bbde49123e9c',
    'e634ddc5-43e2-4c67-b965-162089b042ac',
    'e732c03e-2cc6-4fe7-a8c0-b5b625d7b6e4',
    'e781a979-a42b-4497-9eda-84b5d5b18db5',
    'e957773e-b3af-4e49-a551-52e3f145ffbc',
    'ea040555-a343-4996-a862-2a21c41987ea',
    'ec781888-4de3-4a41-92e5-2a40775af0a2',
    'ee515eac-ecb2-45ef-a298-760d83dd37f7',
    'ef0427bd-6eb3-4910-8fe1-80f0357dc1dd',
    'ef0627be-6564-4931-8417-f99d7e222dfe',
    'f2b53a07-91fc-44c5-a970-8aa2eccb5870',
    'f3236e23-131c-4e3d-840f-7d68344f1ba9',
    'f6806537-2b55-4374-a3b0-48f965b314b4',
    'f8d67155-52c3-44fd-bd96-4a7252eba309',
    'f8ed9e71-0d01-4a02-99ba-fc808e4e0de5',
    'fbbfa8cb-eb2e-4388-8932-7108da0b6c06'
  );
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'not counted: %', n;

  UPDATE dual_meets_girls SET counts_toward_record = true WHERE season_id = 2026 AND id IN (
    '03f25625-6cf0-4ee7-803c-0678934c0806',
    '4326f255-2ac3-4a65-b37c-68c6a10348ef',
    '462e59e4-163c-4331-bd14-725e0a9a6f47',
    '762cf04d-882b-437f-b7ed-3c8297889857',
    '7e3281f9-48d0-4340-98c2-86f13860f1c8'
  );
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'counted: %', n;

  FOR r IN SELECT * FROM (VALUES
      ('06459709-1955-421a-befc-9384b72926f5'::uuid, 244),
      ('359c4eac-6091-4c30-8dc3-d38ac521b4e5'::uuid, 63),
      ('f8c2d063-6013-4453-ad85-3eb878a4a84a'::uuid, 305)
  ) AS v(meet_id, winner_school_id)
  LOOP
    UPDATE dual_meets_girls dm SET
      team1_score = dm.team1_score + CASE WHEN r.winner_school_id = dm.team1_school_id THEN 1 ELSE 0 END,
      team2_score = dm.team2_score + CASE WHEN r.winner_school_id = dm.team2_school_id THEN 1 ELSE 0 END,
      criteria_winner_school_id = r.winner_school_id, tiebreaker_pending = false
    WHERE dm.id = r.meet_id AND dm.team1_score = dm.team2_score;
    IF FOUND THEN
      UPDATE microcheck_tasks SET status = 'completed', completed_at = now()
      WHERE task_type = 'tie_resolution' AND gender = 'F' AND entity_id = r.meet_id::text AND status = 'pending';
    END IF;
  END LOOP;
END $$;

-- Verify: expect 0 tied rows among the three, and 46 pending ties left
SELECT COUNT(*) FROM dual_meets_girls WHERE id IN ('06459709-1955-421a-befc-9384b72926f5', '359c4eac-6091-4c30-8dc3-d38ac521b4e5', 'f8c2d063-6013-4453-ad85-3eb878a4a84a') AND team1_score = team2_score;
SELECT COUNT(*) AS pending_ties FROM dual_meets_girls WHERE season_id = 2026 AND tiebreaker_pending;

-- ROLLBACK: restore counts_toward_record / scores / criteria / tiebreaker_pending
-- and microcheck task status from the backup file.
