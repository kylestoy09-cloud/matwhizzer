-- docs/migrations/20261028_girls_close_remaining_ties.sql
--
-- Girls 2025-26 (season 2026). Closes 45 of the 46 remaining pending ties as
-- final ties: tiebreaker_pending = false, scores and criteria unchanged,
-- microcheck tie_resolution task completed.
--   - 44 are meets the official standings don't count (counts_toward_record =
--     false since 20261028_girls_wl_reconciliation.sql); their Track tiebreaker
--     is "Team Id" or missing — arbitrary (boys check 2026-10-28: the lower id
--     won 1 of 3 officially settled ties) — so no winner can be supported.
--   - South Brunswick 6-6 WW-P South (02-20) counts and is an official tie:
--     both official records carry one tie (2-7-1, 2-8-1).
-- Left pending: Northern Valley-Demarest 6-6 Dwight Morrow (12-23), only one
-- school has an official record.
--
-- Approved 2026-10-28. Backup: docs/migrations/backups/20261028_girls_close_remaining_ties.json

DO $$
DECLARE n integer;
BEGIN
  UPDATE dual_meets_girls SET tiebreaker_pending = false
  WHERE season_id = 2026 AND tiebreaker_pending AND team1_score = team2_score AND id IN (
    '7769b326-8f71-415f-9bd6-8d03cbdaeefd',  -- 12-10 Holmdel 12-12 Colts Neck
    'd8ff8c5e-5f05-426a-8a0f-d181ace0a220',  -- 12-13 Carteret 6-6 Rutgers Prep School
    '525196d6-97ce-4fcf-ad5a-1157fe02c270',  -- 12-13 Elmwood Park 18-18 Pascack Valley School
    '11169e84-d814-4990-944b-fafc59bb723d',  -- 12-17 Highland Regional 12-12 Washington Township
    'ee515eac-ecb2-45ef-a298-760d83dd37f7',  -- 12-17 Woodbridge 6-6 Perth Amboy
    '0c48f8d9-8fc7-4d8e-93ca-122c31ae954c',  -- 12-18 Elmwood Park 6-6 Boonton
    '1504b8c0-dd4c-41b8-9b91-ee8f37f44bb8',  -- 12-19 West Windsor-Plainsboro North 6-6 Manville Hs
    '4ed91f03-598c-402c-a027-fe95d3394835',  -- 12-20 Pascack Hills 6-6 West Orange
    '09881279-afd8-4305-88c0-e709c3399a5c',  -- 01-07 Orange 18-18 Millburn
    '9f98a983-eca2-4cf5-a27f-525defa5724d',  -- 01-12 Bridgewater-Raritan 6-6 Madison
    '5350ab19-5cf4-4c88-b0c3-c2cf0fa392fa',  -- 01-14 Teaneck 6-6 Bergenfield HS
    '5d89c884-710d-4f92-b4f7-31c704701761',  -- 01-16 Verona 6-6 Orange
    '17aec085-8636-484d-9fe6-6f5065775175',  -- 01-17 Manalapan 6-6 Pinelands Regional
    '97bc32c3-cd88-4dc6-ab14-16f2ea541313',  -- 01-17 Lindenwold 6-6 Riverside
    '5c0adbb7-46e8-4e73-a954-83c01a880346',  -- 01-17 Ramsey/Northern Highlands 36-36 Fair Lawn
    '8d18ecf6-68a6-46ac-89d1-f19d5d6b30d5',  -- 01-17 Sterling 12-12 Collingswood
    'ef0627be-6564-4931-8417-f99d7e222dfe',  -- 01-17 Maple Shade 6-6 Audubon
    'f6806537-2b55-4374-a3b0-48f965b314b4',  -- 01-17 Carteret 12-12 Holmdel
    '3331c581-6cfc-4b46-90ae-88160f6ab1cc',  -- 01-17 South River 6-6 South Brunswick Hs
    '18f58e24-5e39-4442-9b2d-b58903678a2d',  -- 01-21 Maple Shade 12-12 Willingboro
    '0e070f12-96dc-4e4a-bacb-c03402d21244',  -- 01-21 Scotch Plains-Fanwood 0-0 Summit
    '823cf6cd-b991-43fa-9d2c-3f434ec04725',  -- 01-24 Glen Ridge 6-6 Montclair
    '0c995f4b-ea17-4f8c-ae96-5e556db9e975',  -- 01-28 Newark Collegiate Charter 6-6 John F. Kennedy
    '5ae3c5e8-0aa2-483e-9975-8069b0a42af6',  -- 01-28 Mountain Lakes 6-6 Madison
    'e0be04e4-3bf4-40b5-b78d-23b686171507',  -- 01-30 College Achieve Paterson Charter 0-0 Tenafly
    '4c08b28b-3289-4e6e-b419-e1e7127b0035',  -- 01-30 Wall Hs 6-6 Manasquan
    'd666d57f-1ef3-47a4-a530-669ac8683a04',  -- 01-31 Colts Neck 12-12 Middletown North
    '9f9d49c2-15f0-4bdb-be12-d4dfeef2c9e8',  -- 01-31 Manchester Regional 6-6 Garfield
    'a331e1bf-8c09-4642-9850-ae3e3f34c165',  -- 02-03 Wall Hs 6-6 Manalapan
    'c299a8f5-a5e8-4330-a99e-d9bcb0b7b8c2',  -- 02-03 Cedar Creek 12-12 Egg Harbor
    'be25f218-50f0-45a2-9e06-b48c631051ff',  -- 02-04 Rutgers Prep School 6-6 Pingry School
    '71b6eebe-2e87-4772-a5af-9b3aa4f36db2',  -- 02-06 Orange 12-12 East Side
    '4af6c53f-bc97-4c30-b453-d98313952e92',  -- 02-06 Plainfield 6-6 Westfield
    '175dc522-9c90-4bbd-ba37-8bfabf788342',  -- 02-07 North Plainfield 12-12 Princeton
    '3fe1b369-9f3b-4755-8fd7-85595eede868',  -- 02-07 Pemberton Township 6-6 Highland Park
    'c0d94b22-f50b-4144-9919-8bccf2edad6f',  -- 02-11 Belvidere 12-12 Somerville
    'e5ab9c44-6567-43e9-be51-bbde49123e9c',  -- 02-11 Madison 6-6 Glen Rock
    '00694249-b4a6-482b-b015-a0d161621413',  -- 02-14 Westfield 6-6 Montgomery
    '50e26d73-bf30-4157-8ed1-8eb93cb75299',  -- 02-18 Clifton 12-12 Mahwah
    '7d0e2033-596a-4391-bb68-d4ea69524ea4',  -- 02-18 Middletown North 6-6 South River
    '15cbd37c-8c86-410b-aef8-ad2c1075ae28',  -- 02-18 Cumberland Regional 6-6 Mainland Regional
    '569a270c-de37-474e-9f5e-001bfc4765f0',  -- 02-19 Fair Lawn 6-6 Elmwood Park
    'd3778852-0d83-42ab-b01f-ea1bc00a52bd',  -- 02-20 Bergenfield HS 6-6 Fort Lee
    'a8ad0db5-95ed-4db1-b0d2-9922fb8d73c8',  -- 02-20 South Brunswick Hs 6-6 West Windsor-Plainsboro South (counts)
    '949cce28-2cdb-4206-99c5-8ed72efd07ab'   -- 02-21 Bergenfield HS 12-12 West Windsor-Plainsboro South
  );
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'closed % ties', n;

  UPDATE microcheck_tasks SET status = 'completed', completed_at = now()
  WHERE task_type = 'tie_resolution' AND gender = 'F' AND status = 'pending'
    AND entity_id IN (SELECT id::text FROM dual_meets_girls WHERE season_id = 2026 AND NOT tiebreaker_pending AND team1_score = team2_score);
END $$;

-- Verify: expect 1 pending tie (Northern Valley-Demarest / Dwight Morrow) and 1 pending girls tie task
SELECT COUNT(*) FROM dual_meets_girls WHERE season_id = 2026 AND tiebreaker_pending;
SELECT COUNT(*) FROM microcheck_tasks WHERE task_type = 'tie_resolution' AND gender = 'F' AND status = 'pending';

-- ROLLBACK: set tiebreaker_pending = true on the ids above and the tasks back to
-- 'pending' (backup file).
