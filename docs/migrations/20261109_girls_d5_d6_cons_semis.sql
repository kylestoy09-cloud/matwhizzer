-- Girls 2025-26 Districts 5 and 6: add the consolation semifinals (2026-11-09)
--
-- The TrackWrestling text export has no "Cons Semis" section for these two districts, so these bouts
-- were never loaded (the other ten districts have theirs, stored as round C3). Read from the final
-- bracket PDFs by scripts/build_girls_district_cons_semis.mts (the two bouts below the 5TH label) and
-- checked against the stored bouts: each pairs a semifinal loser with a cons. round 1 winner, the winners
-- are the 3rd place bout's wrestlers and the losers the 5th place bout's.
-- Expected: 46 bouts (2 districts x 12 weights x 2, less District 6 235, a one-wrestler bracket).
-- Forfeit wins over an empty bracket slot are stored like the other districts' (FORF, no loser).
-- ROLLBACK: DELETE FROM matches WHERE tournament_id IN (190, 191) AND round = 'C3';

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id IN (190, 191) AND round = 'C3') THEN
    RAISE EXCEPTION 'Districts 5 / 6 already have cons. semifinals; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
  -- D5 100 bout 33: Vera, PLAI over Meneses, ELIZ (Fall 3:31)
  (190, 67, 'consolation', 'C3', '4ad2f54f-73bf-4f5b-a2ee-6b7f62877d8e', 'f1f20ba9-4cee-48b4-98de-24ba0d6ac52a', 'FALL', NULL, NULL, 211, true),
  -- D5 100 bout 34: Nisenbaum, RAHW over Maloy, NOHU (Fall 2:54)
  (190, 67, 'consolation', 'C3', '3e5a03f3-d74d-4bf0-abb6-38d0eee0fb7d', 'b4ff655d-5d02-4bdb-85e8-166f2cbfc1d3', 'FALL', NULL, NULL, 174, true),
  -- D5 107 bout 33: Battles-Co, PISC over White, NOHU (Fall 4:42)
  (190, 68, 'consolation', 'C3', '36826e5f-9a57-43d1-8cfb-61f7abcccc01', 'c0592b44-66b6-4a8c-a4a0-7b2e22fa3044', 'FALL', NULL, NULL, 282, true),
  -- D5 107 bout 34: Mejia, ELIZ over Lopez, PLAI (Fall 2:41)
  (190, 68, 'consolation', 'C3', '85e7f165-55dd-4062-90da-6531b96acde9', '0e0e45e7-7783-430a-bca9-213a551d40dc', 'FALL', NULL, NULL, 161, true),
  -- D5 114 bout 33: Garcia, ELIZ over Valdivia, WHR (Fall 0:29)
  (190, 69, 'consolation', 'C3', 'c35ae123-205c-4c4c-97d1-11afacf28500', 'c513fc1b-39e6-4a73-bd25-39685c9f6f07', 'FALL', NULL, NULL, 29, true),
  -- D5 114 bout 34: Carire Cru, LIND over Puchuelo S, NOPL (Fall 1:16)
  (190, 69, 'consolation', 'C3', '688803c5-a8d7-4733-8158-b19c7a4bfe90', '2da2b39f-a49b-428b-a788-899caa1f3d91', 'FALL', NULL, NULL, 76, true),
  -- D5 120 bout 33: Fernandez, LIND over Rodriguez, ROPA (Fall 2:45)
  (190, 70, 'consolation', 'C3', '464bb2c4-ee4c-4a46-982c-b1368f66f0ac', 'a0f19ed5-a325-4744-9fc3-52ce8b167aff', 'FALL', NULL, NULL, 165, true),
  -- D5 120 bout 34: Hayes, BAYO over Perry, NOHU (Dec 8-2)
  (190, 70, 'consolation', 'C3', '621c9f7e-ed18-4927-a882-ba823f318860', 'a7efcc09-ae33-4df3-91ee-04593c6e3f5f', 'DEC', 8, 2, NULL, true),
  -- D5 126 bout 33: Hansen, BAYO over Lustal, NCC (Fall 0:31)
  (190, 71, 'consolation', 'C3', '98a2db66-293a-47bb-a18d-5c383c834c91', '4cd83229-2cc4-4264-840f-54540eaa310a', 'FALL', NULL, NULL, 31, true),
  -- D5 126 bout 34: Cumakova, UNIO over MacArthur, VGG (Fall 2:42)
  (190, 71, 'consolation', 'C3', '2a866ec1-5212-41f3-bef1-8a4164c337d9', 'a126ca1c-7ad5-48a8-8195-c1d87fc473ca', 'FALL', NULL, NULL, 162, true),
  -- D5 132 bout 33: Perez Mart, NOPL over Canar, ROPA (Fall 4:45)
  (190, 72, 'consolation', 'C3', 'c32dfc11-aad9-4810-a990-ce8e5360306f', '0f289d2a-80be-412f-b629-af9674a09ad9', 'FALL', NULL, NULL, 285, true),
  -- D5 132 bout 34: Gonzalez, PLAI over Garcia- Xo, RAHW (Fall 3:36)
  (190, 72, 'consolation', 'C3', '07b787c4-399e-4c7c-8db2-702a05db518e', '4fcac206-fe94-46fd-a02e-9d6c398b700e', 'FALL', NULL, NULL, 216, true),
  -- D5 138 bout 33: Costello, SPF over Nova, UNIO (Fall 0:38)
  (190, 73, 'consolation', 'C3', '4fec4b6b-7780-47fe-b7cd-f9e9dd7dcfdd', 'd36eb5e1-d971-4d28-8798-8f112ba8fde5', 'FALL', NULL, NULL, 38, true),
  -- D5 138 bout 34: Stacy, NOHU over Devizio, ROPA (Fall 4:48)
  (190, 73, 'consolation', 'C3', '9d18cf80-2e67-43bc-b474-e36b01b76aa9', 'c0e37883-4d12-4d13-999e-11c09a78db77', 'FALL', NULL, NULL, 288, true),
  -- D5 145 bout 33: Reymundo I, NOPL over Fasca-Mora, BAYO (Fall 0:34)
  (190, 74, 'consolation', 'C3', '4cf1b4b6-2de9-4ebb-8cf3-abd9d5d8f7cd', '0daf1f53-4d8c-40a1-b78b-c13dd9de57b9', 'FALL', NULL, NULL, 34, true),
  -- D5 145 bout 34: Moore, ELIZ over Jackson, PLAI (Fall 1:11)
  (190, 74, 'consolation', 'C3', '083d80c4-a9a1-4ae5-ac49-a21db6e347c8', 'f15732a8-d749-4eb2-8e9c-25e5a1a30d65', 'FALL', NULL, NULL, 71, true),
  -- D5 152 bout 33: Wright, NCC over Liz, ELIZ (Fall 1:12)
  (190, 75, 'consolation', 'C3', 'a7506167-0453-4e53-b292-80b7c277d30a', 'a282c398-27cf-4a79-bb2c-ac7de48ddd1a', 'FALL', NULL, NULL, 72, true),
  -- D5 152 bout 34: Avent, RAHW over Vidarte Es, NOPL (Fall 0:57)
  (190, 75, 'consolation', 'C3', 'b4908652-4c46-4736-b320-79e949e597e5', '8cefa2df-e2fd-40fc-a5da-c2f60d23abac', 'FALL', NULL, NULL, 57, true),
  -- D5 165 bout 33: Zamor, SPF over Garcia, LIND (Fall 5:06)
  (190, 76, 'consolation', 'C3', 'ce014746-4b2b-4629-82c4-cb29eb61b90c', '79e62878-56d7-49c5-a3a4-7470e2e27947', 'FALL', NULL, NULL, 306, true),
  -- D5 165 bout 34: Coleman, NCC over Darisme, RAHW (Fall 4:49)
  (190, 76, 'consolation', 'C3', '55cd35bd-5a8b-48ac-87c3-f3eb1aa158f3', '8360669d-7a7b-48d3-b6ae-6ead395c7c64', 'FALL', NULL, NULL, 289, true),
  -- D5 185 bout 33: Gonzalez, RAHW over Snyder , NOHU (Fall 2:58)
  (190, 77, 'consolation', 'C3', '799f5f4e-6388-41a1-bb76-ff1d81d516cb', '5f70911c-d75c-4f7b-9f8c-f03d39b26d32', 'FALL', NULL, NULL, 178, true),
  -- D5 185 bout 34: Luna, SPF over Rodriguez, ELIZ (Fall 4:34)
  (190, 77, 'consolation', 'C3', 'd8638ee7-cd2a-4613-9e5c-f781ccd3f7e4', 'b92c6ed8-2efe-4ed4-9f53-6f64d83a1a19', 'FALL', NULL, NULL, 274, true),
  -- D5 235 bout 33: Walker, LIND over Quezada, ELIZ (Fall 5:26)
  (190, 78, 'consolation', 'C3', '9ac8d2f4-6600-4b1d-8bfe-e1eca90e0895', 'c6d86192-3858-4193-aa1d-746459f75d53', 'FALL', NULL, NULL, 326, true),
  -- D5 235 bout 34: Adjogble, NCC over Forfeit, &nbs (For.) [forfeit over an empty slot]
  (190, 78, 'consolation', 'C3', '56e3568d-1bea-4f8c-b673-dd7bb508c41e', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D6 100 bout 110: Bagley, DVR over Kelly, BRRA (Fall 1:02)
  (191, 67, 'consolation', 'C3', '4996619a-8d40-4310-bd06-da36d0cfd7aa', '9d3f6155-5ab7-40bf-a891-bd81c93d3a3a', 'FALL', NULL, NULL, 62, true),
  -- D6 100 bout 111: Rodriguez, PEAM over Muni, RPS (Fall 0:20)
  (191, 67, 'consolation', 'C3', '23316eca-3f8a-43a1-8697-6fe847979bbe', '1403853a-190c-4866-b3f5-5b3c09ea0edf', 'FALL', NULL, NULL, 20, true),
  -- D6 107 bout 112: Chac, BBH over Reist, STA (Fall 1:22)
  (191, 68, 'consolation', 'C3', 'f32ba168-85e6-4f67-8af7-da96223e206b', '0081d32e-cf3d-4122-877a-1788edaf5a14', 'FALL', NULL, NULL, 82, true),
  -- D6 107 bout 113: Armenti, COLO over Monge, MAHS (Dec 10-4)
  (191, 68, 'consolation', 'C3', 'd1fe20fd-625c-43af-b5c8-32fd333b7db2', 'afd69c96-a87b-415f-becb-594bbb2c6d2d', 'DEC', 10, 4, NULL, true),
  -- D6 114 bout 114: Lamptey, SOME over Castillo, MIDD (Fall 0:54)
  (191, 69, 'consolation', 'C3', 'b92d1151-0de3-47e0-80da-63cd175590d1', '2a223abd-96c9-45ea-9d50-0d0da98c7bcf', 'FALL', NULL, NULL, 54, true),
  -- D6 114 bout 115: Butler, PISC over Patil, JPS (Fall 3:57)
  (191, 69, 'consolation', 'C3', 'f6efddf5-c440-4688-98d4-3ef8f5c73185', 'e53a7e97-ae63-4d03-a4f4-eb6e0f0b94d8', 'FALL', NULL, NULL, 237, true),
  -- D6 120 bout 116: Karp, BRRA over Duda, SOME (Fall 0:40)
  (191, 70, 'consolation', 'C3', 'bc5d6aae-07fa-428d-87ee-31b3dea00ddc', 'f25574c5-a55d-4fdb-bde9-ba53566d449a', 'FALL', NULL, NULL, 40, true),
  -- D6 120 bout 117: Karpew, DVR over Gomez, PEAM (TF-1.5 4:00 (15-0))
  (191, 70, 'consolation', 'C3', '29acc63b-4387-4289-a3c4-c8724b3337c5', '4958b96a-aaf2-4131-a4d4-40a2f9e42c24', 'TF-1.5', 15, 0, 240, true),
  -- D6 126 bout 118: Poggio, HCR over Mejia-Arti, MIDD (Fall 1:11)
  (191, 71, 'consolation', 'C3', '712db70e-c2f8-4f93-b893-f5420c9d1c64', 'ac7ecb9a-9678-46a3-833c-838e1b1da4e4', 'FALL', NULL, NULL, 71, true),
  -- D6 126 bout 119: Falkovich, METU over Strauss, MAHS (Fall 1:20)
  (191, 71, 'consolation', 'C3', '1ecf27c4-ea37-4ef7-bc17-e9ff355bd3d9', 'f01888f7-4fbd-4550-81bf-9367ccd29021', 'FALL', NULL, NULL, 80, true),
  -- D6 132 bout 120: Leka, HCR over Henriquez, CART (Fall 0:40)
  (191, 72, 'consolation', 'C3', 'd101e463-6638-41fe-a087-90f8db4c11b5', 'aa6d996e-a86c-40ab-ad18-4ace8cfbc609', 'FALL', NULL, NULL, 40, true),
  -- D6 132 bout 121: Moronta, PEAM over Carvajal, MAHS (Fall 3:26)
  (191, 72, 'consolation', 'C3', '3b81cd48-0d53-48a9-8975-b2187618034d', 'f687768e-df00-4192-9ddc-3a16df9dcb84', 'FALL', NULL, NULL, 206, true),
  -- D6 138 bout 122: Castro-Par, MAHS over Lugo, CART (Fall 1:20)
  (191, 73, 'consolation', 'C3', '33482907-657c-493e-b9de-ee8ffd9ff4b5', '6981d23b-c88e-4984-ae20-2805b6a322fc', 'FALL', NULL, NULL, 80, true),
  -- D6 138 bout 123: Djaba, RPS over Cojon Maur, PISC (Fall 0:48)
  (191, 73, 'consolation', 'C3', 'b615674d-f907-43b7-9c95-64b32275fb5e', '475a6650-3ccd-4b7a-81e9-67e738bbdef5', 'FALL', NULL, NULL, 48, true),
  -- D6 145 bout 124: Laguna-Can, MIDD over Quesada, MAHS (Fall 0:16)
  (191, 74, 'consolation', 'C3', '9ce3e7e5-db0f-4cd2-87fe-31fbaa2fce74', 'fc07dfb3-1cc8-45c7-b8b8-c25f072fb735', 'FALL', NULL, NULL, 16, true),
  -- D6 145 bout 125: Gallagher, FRAN over Howarth, STA (Fall 0:37)
  (191, 74, 'consolation', 'C3', '5cede9fa-ce3f-431d-a107-a941a51834fd', 'd7535c47-a7e3-427c-b873-4539dcdc577b', 'FALL', NULL, NULL, 37, true),
  -- D6 152 bout 126: Favereaux, DVR over Castro, PEAM (Fall 3:20)
  (191, 75, 'consolation', 'C3', '6bfe68a2-982e-48d6-803a-37b8b9fae706', 'ba6f358a-abce-4144-af41-1c866655385b', 'FALL', NULL, NULL, 200, true),
  -- D6 152 bout 127: Falkovich, METU over Moran, SOME (Fall 1:02)
  (191, 75, 'consolation', 'C3', '7903abe6-d1f3-4185-9844-ba2f084b8a17', '293e3170-0513-4b8f-b98c-848d0917cf6a', 'FALL', NULL, NULL, 62, true),
  -- D6 165 bout 128: Richardson, JPS over Cruz-Saldi, WOOD (Fall 0:51)
  (191, 76, 'consolation', 'C3', 'fc79fc29-b32c-4a76-8fe7-9646dd5884e0', '77af93eb-ca5f-4880-879e-949613f88f1a', 'FALL', NULL, NULL, 51, true),
  -- D6 165 bout 129: Cole-Stuck, PISC over Avalos, SOME (M. For.)
  (191, 76, 'consolation', 'C3', '9ef023b7-7147-44d3-8be2-d582ab2bedc7', '4f1ec056-0baa-435b-98e1-569f79d69f7e', 'FORF', NULL, NULL, NULL, true),
  -- D6 185 bout 130: Rios, HCR over Forfeit, &nbs (For.) [forfeit over an empty slot]
  (191, 77, 'consolation', 'C3', '9a27e819-2f14-4495-8aa0-c9c8da2c06d8', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D6 185 bout 131: Alvardo-Ma, MIDD over Forfeit, &nbs (For.) [forfeit over an empty slot]
  (191, 77, 'consolation', 'C3', 'df565c90-2f23-4317-ac4a-8b638bf4f4ad', NULL, 'FORF', NULL, NULL, NULL, true);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 46 THEN RAISE EXCEPTION 'expected 46 bouts, got %', n; END IF;
END $$;

-- Verify: District 5 24, District 6 22 (its 235 bracket has one wrestler)
SELECT t.name, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE m.tournament_id IN (190, 191) AND m.round = 'C3' GROUP BY t.name ORDER BY t.name;
