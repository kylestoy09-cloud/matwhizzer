-- docs/migrations/20261024_girls_playoffs_tag_and_brawl_reset.sql
--
-- Girls 2025-26 (season 2026).
--
-- 1. Team playoffs. The 14 NJSIAA team playoff duals ("Whizzer Upload/2025-26
--    Girls Data/2025-26 - NJSIAA Team Playoff.rtf", 2/17, 2/19, 2/22). Two were
--    already loaded from the February duals file in September:
--      Mount Olive/Randolph 22-48 Morris Hills-Morris Knolls (02-17, 712ad7bb)
--      High Point 30-35 Morris Hills-Morris Knolls (02-19, 6eb0690b)
--    The 2026-10-25 playoff import added the other 12, plus a second copy of
--    High Point / MHMK with the teams flipped (45592f11, bout-for-bout identical).
--    The importer's duplicate check filtered on a gender column that
--    dual_meets_girls does not have, so the lookup errored and every meet read
--    as new (fixed in src/app/api/admin/import-meets-girls/route.ts). Deletes the
--    flipped copy and sets is_playoff on all 14.
--
-- 2. Hillsborough Holiday Brawl (12-28) reset. The 2026-10-25 jamboree import
--    used a parser that skipped Track's pool weight labels ("114C"), kept round
--    prefixes in names ("Champ. Round 2 - Dhriti Patel") and missed bouts with
--    non-breaking spaces: 35 pseudo-duals, 49 of the event's 204 bouts. Deletes
--    those meets (bouts cascade) and the 23 wrestler_name_aliases rows whose
--    raw_name is a round-prefixed name. The 3 wrestlers created by that import
--    (Janilette Santiago Ramos, Paityn Freeman-Cromer, Folasade KuKu) are real
--    and are kept for the re-import. The event's tournament_registry link and
--    in_season_tournaments_girls row (1006f7a1, no bouts) are kept.
--
-- Full pre-change rows: docs/migrations/backups/20261024_girls_playoffs_tag_and_brawl_reset.json

DO $$
DECLARE n integer;
BEGIN
  -- ── 1. Playoffs ───────────────────────────────────────────────────────────
  DELETE FROM dual_meets_girls
  WHERE id = '45592f11-7882-4496-98a0-7d3164c981f5'
    AND EXISTS (SELECT 1 FROM dual_meets_girls WHERE id = '6eb0690b-2840-4206-b7d5-eb5ee5974744');
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate playoff meet', n;

  UPDATE dual_meets_girls SET is_playoff = true WHERE id IN (
    'c23666b7-e226-40fe-9104-039550ab69d2',  -- 02-17 Gloucester City JR/SR 36-33 Central Regional
    '03205c5b-a071-471f-8478-981193f34a82',  -- 02-17 East Brunswick H.S. 18-52 North Brunswick Township
    'ff5b89bd-9512-4d1b-a1b3-d9991a0de05f',  -- 02-17 Ramsey/Northern Highlands 39-30 Jefferson-Sparta
    '5c31bef7-d293-40d4-b5a6-93d4045a040f',  -- 02-17 Gloucester City JR/SR 48-21 Hillsborough
    '5b0c8a87-be94-46b0-91f7-3a608ac3b5a2',  -- 02-17 Newton/Kittatinny 48-23 Passaic Co Tech-Voc
    '4cc6f572-2e21-4a85-ba52-eb025ed34eff',  -- 02-17 Jackson Township H.S. 49-18 Old Bridge
    'bd4dea84-28a8-4882-8e80-b21c6c667249',  -- 02-17 High Point Regional 34-33 Newton/Kittatinny
    '42ff46ab-a6e0-4840-8603-38e063723863',  -- 02-17 Ramsey/Northern Highlands 24-46 Morris Hills-Morris Knolls
    'b80f8979-1c98-433b-8e8a-927e8001d8a7',  -- 02-17 Jackson Township H.S. 53-15 North Brunswick Township
    '0fc4edb5-071e-4652-9c08-ab9e3cc7dfc0',  -- 02-17 High Point Regional 42-24 Elizabeth
    '712ad7bb-5118-4936-8b06-bf26403d40c3',  -- 02-17 Mount Olive/Randolph 22-48 Morris Hills-Morris Knolls
    'efe122d6-36e8-4d87-9de8-308ef9b38040',  -- 02-19 Jackson Township H.S. 37-27 Gloucester City JR/SR
    '6eb0690b-2840-4206-b7d5-eb5ee5974744',  -- 02-19 High Point Regional 30-35 Morris Hills-Morris Knolls
    '930c0531-e732-4c2a-b2f5-d126a4c864c3'   -- 02-22 Jackson Township H.S. 47-15 Morris Hills-Morris Knolls
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Tagged % playoff meets', n;

  -- ── 2. Hillsborough Holiday Brawl reset ───────────────────────────────────
  DELETE FROM dual_meets_girls WHERE meet_kind = 'jamboree' AND id IN (
    '9e09c893-2e39-4d71-b185-2053e9b106ac',  -- Belvidere / Cliffside Park
    'ac87131d-9310-473b-a8ce-9e037fba38c4',  -- Belvidere / Neptune
    '9c96bf8f-741e-4d43-a0cf-4ac1001d0de5',  -- Belvidere / Carteret
    '8051cfb5-4a8a-4278-951d-f890afc40daa',  -- Carteret / Rancocas Valley Regional
    '683d778a-2c1e-4d14-81bd-d93ef4971437',  -- Carteret / Highland Park
    'caadc1a2-630d-43e2-9f84-0ce0a5481125',  -- Carteret / Delaware Valley Regional
    'aa5a9c0d-4600-433f-926c-ba9351e13ded',  -- Carteret / North Brunswick Township
    '0b4c330b-00f5-45cb-98ba-0c0f7b0aee0b',  -- Cliffside Park / Hillsborough
    '09127e0d-26c7-4249-affe-2225fc7de3d9',  -- Cliffside Park / Rancocas Valley Regional
    '4d217df0-fe15-448d-ab26-139906022aec',  -- Cliffside Park / Delaware Valley Regional
    'cdba2591-5177-4473-b5df-c87cfba1e400',  -- Cliffside Park / Manville Hs
    '90c29ece-efc1-472a-9c2f-0043ee02042c',  -- Delaware Valley Regional / Manville Hs
    '76c632eb-ec73-48b4-bbc6-0e71442e4070',  -- Delaware Valley Regional / Highland Park
    '6e5bc9c0-fcf5-43a8-b2a0-85b35bd2dae6',  -- Delaware Valley Regional / North Brunswick Township
    'ff51fec0-7126-41f2-9d1a-e86ca29a1a1f',  -- Delaware Valley Regional / Hillsborough
    'c1f8a55a-f0ae-4751-9b76-4f7c63aee284',  -- Delaware Valley Regional / Neptune
    'd86db156-fb42-48cb-8690-02d8e6088f5a',  -- Delaware Valley Regional / Parsippany Hills/Parsippany
    'ec862c98-daa6-4f16-89a2-c77a52c62537',  -- Delaware Valley Regional / Somerville
    '594eab51-7223-4121-8309-5b133a4bb418',  -- Highland Park / Rancocas Valley Regional
    'd3371017-8425-4f64-af06-c59e490b16d3',  -- Highland Park / Neptune
    '3d72d70e-4c16-4f00-bc94-b1cfcc37fab4',  -- Hillsborough / Neptune
    '3f2781ec-f8a2-4946-9e3e-45a1700f9908',  -- Hillsborough / Somerville
    '804fdacf-6aab-482a-9a18-ead914df55d6',  -- Hillsborough / John P. Stevens
    '919f1e2d-84a6-4b2c-84b7-f0ecbde12e48',  -- Hunterdon Central Reg / Robbinsville
    'b83ed24f-809f-45b6-aab1-daa6c0013a93',  -- John P. Stevens / Red Bank Regional
    'acc92257-bcc0-452b-ab42-5933ee06d757',  -- Montville / Rancocas Valley Regional
    'f27d232a-d6e1-42a6-9f3e-db13683d39d2',  -- Neptune / Rancocas Valley Regional
    '3cc0211c-2460-45f7-ad4d-15e893a46601',  -- Parsippany Hills/Parsippany / Rancocas Valley Regional
    '245cf37e-a4e9-4952-b71f-f6c4993ab588',  -- Parsippany Hills/Parsippany / Somerville
    '76e8bedc-0874-4598-9334-4bf6dafe5583',  -- Parsippany Hills/Parsippany / Robbinsville
    '5f3c975c-2562-46f4-9ce5-9d991e5d1f3f',  -- Parsippany Hills/Parsippany / Rutgers Prep School
    '18940e06-1ebd-40a3-a885-d01787a5e9f0',  -- Rancocas Valley Regional / Somerville
    'e0d4cb59-8062-4b4a-a819-e33e26b92086',  -- Rancocas Valley Regional / Rutgers Prep School
    'ce189240-aec8-4251-bab6-f9cf9973a2bd',  -- Rancocas Valley Regional / Robbinsville
    'bce945a5-cb52-4ff4-9a46-560cf1c0821f'   -- Rancocas Valley Regional / Red Bank Regional
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Deleted % Hillsborough pseudo-duals', n;

  DELETE FROM wrestler_name_aliases WHERE id IN (51545, 51547, 51549, 51551, 51557, 51559, 51565, 51566, 51568, 51572, 51577, 51579, 51583, 51587, 51589, 51590, 51591, 51595, 51597, 51599, 51601, 51603, 51604);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Deleted % round-prefixed aliases', n;
END $$;

-- Verify: expect 14 playoff meets; 0 rows for 12-28 jamborees
SELECT COUNT(*) AS playoff_meets FROM dual_meets_girls WHERE season_id = 2026 AND is_playoff;
SELECT COUNT(*) AS brawl_meets FROM dual_meets_girls WHERE season_id = 2026 AND meet_date = '2025-12-28' AND meet_kind = 'jamboree';

-- ROLLBACK: re-insert the meets, bouts and aliases saved in the backup file
-- and set is_playoff = false on the 14 meets listed above.
