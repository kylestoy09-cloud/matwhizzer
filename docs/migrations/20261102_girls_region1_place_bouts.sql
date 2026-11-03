-- Girls 2025-26 Region 1: add the final, consolation semifinals and 3rd / 5th place bouts (2026-11-02)
--
-- Region 1 had no bout after the semifinals and cons. round 2, so its page showed no champion or
-- placers (Regions 2-4 are complete). The TrackWrestling text export stops partway through
-- Region 1; these come from the final bracket PDFs (2026_girls_region_final/Region 1), read by
-- scripts/build_girls_region1_place_bouts.mts. Round names follow Regions 2-4: F, C4 (cons. semi),
-- 3rd_Place, 5th_Place.
-- ROLLBACK: DELETE FROM matches WHERE tournament_id = 181 AND round IN ('F','C4','3rd_Place','5th_Place');

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id = 181 AND round IN ('F', 'C4', '3rd_Place', '5th_Place')) THEN
    RAISE EXCEPTION 'Region 1 place bouts already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
  -- 100 F: Qualtieri, LVH over Lozano, LYND (Fall 1:19)
  (181, 67, 'championship', 'F', 'c3afebcd-1ccd-4bf9-b185-e3032d584c74', '5d5342b2-200d-4c4e-adce-c42f6189a9c8', 'FALL', NULL, NULL, 79, true),
  -- 100 3rd_Place: Timonera, NUTL over Petersen, NEWT (Dec 6-0)
  (181, 67, 'consolation', '3rd_Place', '60f8f3aa-2fb9-48ee-82a0-1de363ab795a', 'e7aed6e3-ce54-4d24-8e23-1071b82681b7', 'DEC', 6, 0, NULL, true),
  -- 100 5th_Place: Patel, PACA over Minervini, MTOL (Fall 0:09)
  (181, 67, 'consolation', '5th_Place', '72acbc45-c161-4691-8799-984f7758343c', 'e52c91d5-fda9-406c-bf8b-f60b423fc65a', 'FALL', NULL, NULL, 9, true),
  -- 100 C4: Petersen, NEWT over Patel, PACA (Dec 8-3)
  (181, 67, 'consolation', 'C4', 'e7aed6e3-ce54-4d24-8e23-1071b82681b7', '72acbc45-c161-4691-8799-984f7758343c', 'DEC', 8, 3, NULL, true),
  -- 100 C4: Timonera, NUTL over Minervini, MTOL (Fall 1:19)
  (181, 67, 'consolation', 'C4', '60f8f3aa-2fb9-48ee-82a0-1de363ab795a', 'e52c91d5-fda9-406c-bf8b-f60b423fc65a', 'FALL', NULL, NULL, 79, true),
  -- 107 F: Yodice, PACA over Capone, MTOL (Fall 0:52)
  (181, 68, 'championship', 'F', '148b04de-4aa1-4f6f-9033-a99cf0731bf0', 'f90c8976-1644-492c-b594-6dac951a8692', 'FALL', NULL, NULL, 52, true),
  -- 107 3rd_Place: Coletta, MHCA over Santonocit, RAMS (Dec 11-9)
  (181, 68, 'consolation', '3rd_Place', '37e62b6c-5a6d-4cbd-b9f0-4206cfb125fa', '716f255c-1b84-4bf3-b418-da4980f79f03', 'DEC', 11, 9, NULL, true),
  -- 107 5th_Place: Connolly, WAHI over Cammarata, WVR (M. For.)
  (181, 68, 'consolation', '5th_Place', '2f9e154b-e2bc-4825-9d19-725dfbadece9', '86f0af90-b906-427e-bcfa-8cd5df3f686c', 'FORF', NULL, NULL, NULL, true),
  -- 107 C4: Santonocit, RAMS over Connolly, WAHI (Fall 5:17)
  (181, 68, 'consolation', 'C4', '716f255c-1b84-4bf3-b418-da4980f79f03', '2f9e154b-e2bc-4825-9d19-725dfbadece9', 'FALL', NULL, NULL, 317, true),
  -- 107 C4: Coletta, MHCA over Cammarata, WVR (MD 10-1)
  (181, 68, 'consolation', 'C4', '37e62b6c-5a6d-4cbd-b9f0-4206cfb125fa', '86f0af90-b906-427e-bcfa-8cd5df3f686c', 'MD', 10, 1, NULL, true),
  -- 114 F: Danbe, RIDE over Almendinge, LVH (Fall 1:40)
  (181, 69, 'championship', 'F', 'c95d97f6-8c81-45f2-b034-faeaae9dc4b9', '7e782133-d6bc-46f6-ad27-79da44844bd0', 'FALL', NULL, NULL, 100, true),
  -- 114 3rd_Place: Cunningham, MAHW over Addabbo, CLIF (Fall 2:52)
  (181, 69, 'consolation', '3rd_Place', '0e77fd77-34a4-4e2e-9950-5ba5551e5a36', 'fc0ae479-7f59-470c-9be8-f95be5105fac', 'FALL', NULL, NULL, 172, true),
  -- 114 5th_Place: Yukselen, PARA over Hidalgo, MHMK (Dec 12-6)
  (181, 69, 'consolation', '5th_Place', '53f1bf1f-d81b-4581-bc4f-f96bbe8adfdd', 'd0d32a6b-0fe9-43d8-b86b-cbcdcfe9b22c', 'DEC', 12, 6, NULL, true),
  -- 114 C4: Cunningham, MAHW over Yukselen, PARA (Fall 2:53)
  (181, 69, 'consolation', 'C4', '0e77fd77-34a4-4e2e-9950-5ba5551e5a36', '53f1bf1f-d81b-4581-bc4f-f96bbe8adfdd', 'FALL', NULL, NULL, 173, true),
  -- 114 C4: Addabbo, CLIF over Hidalgo, MHMK (Fall 1:14)
  (181, 69, 'consolation', 'C4', 'fc0ae479-7f59-470c-9be8-f95be5105fac', 'd0d32a6b-0fe9-43d8-b86b-cbcdcfe9b22c', 'FALL', NULL, NULL, 74, true),
  -- 120 F: Changaris, HPR over Diaz Santo, MHMK (Dec 9-2)
  (181, 70, 'championship', 'F', '05b81b77-f1c0-4a31-afa6-b4f2f5c99655', 'f27cdac7-695c-464d-9326-b52f9a813408', 'DEC', 9, 2, NULL, true),
  -- 120 3rd_Place: Carmichael, MO over Guzman Cab, ELPA (Fall 2:50)
  (181, 70, 'consolation', '3rd_Place', 'faf606cf-a136-40bd-bcb0-d54cdae33c1d', '5ca46860-fb74-4d31-bb39-7d630dd7f60d', 'FALL', NULL, NULL, 170, true),
  -- 120 5th_Place: Naddeo, PACA over Harrison, NEWT (Fall 0:21)
  (181, 70, 'consolation', '5th_Place', '6bf82b21-4cf3-4eac-8a45-73950606b748', 'f96e2be6-140e-401c-989b-306e1472602f', 'FALL', NULL, NULL, 21, true),
  -- 120 C4: Carmichael, MO over Harrison, NEWT (Fall 1:39)
  (181, 70, 'consolation', 'C4', 'faf606cf-a136-40bd-bcb0-d54cdae33c1d', 'f96e2be6-140e-401c-989b-306e1472602f', 'FALL', NULL, NULL, 99, true),
  -- 120 C4: Guzman Cab, ELPA over Naddeo, PACA (Fall 0:57)
  (181, 70, 'consolation', 'C4', '5ca46860-fb74-4d31-bb39-7d630dd7f60d', '6bf82b21-4cf3-4eac-8a45-73950606b748', 'FALL', NULL, NULL, 57, true),
  -- 126 F: Shardakova, KINN over Smyth, MTOL (Fall 1:24)
  (181, 71, 'championship', 'F', '8f60eb07-efd7-4c39-b086-b85ee5546b2a', '8c6f49d5-33b4-40d7-99f7-a8782c1a15c7', 'FALL', NULL, NULL, 84, true),
  -- 126 3rd_Place: Panuccio, RAMS over Ayala Rosa, PCTV (Fall 5:04)
  (181, 71, 'consolation', '3rd_Place', '383454ab-718b-4301-9ff3-193c04c520f7', 'beecba3e-c9ef-4f58-a3a6-3c09072bc99f', 'FALL', NULL, NULL, 304, true),
  -- 126 5th_Place: Vivas, BEHS over Sloan, WMT (Fall 2:42)
  (181, 71, 'consolation', '5th_Place', '4b6cab57-df15-4ec1-afae-212855877dd9', 'bd617518-b346-4b49-bea5-954caac22062', 'FALL', NULL, NULL, 162, true),
  -- 126 C4: Ayala Rosa, PCTV over Sloan, WMT (Dec 5-1)
  (181, 71, 'consolation', 'C4', 'beecba3e-c9ef-4f58-a3a6-3c09072bc99f', 'bd617518-b346-4b49-bea5-954caac22062', 'DEC', 5, 1, NULL, true),
  -- 126 C4: Panuccio, RAMS over Vivas, BEHS (Fall 1:08)
  (181, 71, 'consolation', 'C4', '383454ab-718b-4301-9ff3-193c04c520f7', '4b6cab57-df15-4ec1-afae-212855877dd9', 'FALL', NULL, NULL, 68, true),
  -- 132 F: Massenzio, STMA over Weiss, JESP (Dec 5-3)
  (181, 72, 'championship', 'F', '4719fdcd-d27f-41da-b22e-5aee1982d427', '73461bb4-163b-4722-8c84-6666fee2dbd2', 'DEC', 5, 3, NULL, true),
  -- 132 3rd_Place: Teixiera, MHMK over Roa, MARE (MD 12-0)
  (181, 72, 'consolation', '3rd_Place', '4091dbfa-a3e2-4fa4-b071-831f585c0432', 'c6699ce5-b256-4eb0-bf0a-3b776fed1d33', 'MD', 12, 0, NULL, true),
  -- 132 5th_Place: Herrera, CLPA over Thomas, RPHS (Fall 0:19)
  (181, 72, 'consolation', '5th_Place', '4c4bd1a1-743b-4d08-9b81-784b2f19b2b8', '218548a3-1337-4695-8d20-e89d7d7dfc10', 'FALL', NULL, NULL, 19, true),
  -- 132 C4: Roa, MARE over Thomas, RPHS (Fall 0:54)
  (181, 72, 'consolation', 'C4', 'c6699ce5-b256-4eb0-bf0a-3b776fed1d33', '218548a3-1337-4695-8d20-e89d7d7dfc10', 'FALL', NULL, NULL, 54, true),
  -- 132 C4: Teixiera, MHMK over Herrera, CLPA (Fall 0:36)
  (181, 72, 'consolation', 'C4', '4091dbfa-a3e2-4fa4-b071-831f585c0432', '4c4bd1a1-743b-4d08-9b81-784b2f19b2b8', 'FALL', NULL, NULL, 36, true),
  -- 138 F: Spadavecch, WEST over guzik-upch, VETO (MD 10-2)
  (181, 73, 'championship', 'F', '720c3948-7129-43a5-817f-9a6af1d662be', '1be6712a-48f9-4a59-83b8-d839896fbda2', 'MD', 10, 2, NULL, true),
  -- 138 3rd_Place: Aiello, JESP over Rodriguez , LEPP (Dec 11-4)
  (181, 73, 'consolation', '3rd_Place', 'd83ac537-3ed6-41d7-b3f6-a30818fa9267', 'e0e475d8-3c5c-48eb-bf3f-c78db0afb1fa', 'DEC', 11, 4, NULL, true),
  -- 138 5th_Place: Cruz, FALA over Gomez Hern, PAVA (Fall 0:36)
  (181, 73, 'consolation', '5th_Place', 'bba4a606-858d-4ff9-9c6b-b6666f590b49', '4c742849-89ab-409d-ad9e-b5d7084e1c64', 'FALL', NULL, NULL, 36, true),
  -- 138 C4: Rodriguez , LEPP over Gomez Hern, PAVA (Fall 1:42)
  (181, 73, 'consolation', 'C4', 'e0e475d8-3c5c-48eb-bf3f-c78db0afb1fa', '4c742849-89ab-409d-ad9e-b5d7084e1c64', 'FALL', NULL, NULL, 102, true),
  -- 138 C4: Aiello, JESP over Cruz, FALA (Fall 3:23)
  (181, 73, 'consolation', 'C4', 'd83ac537-3ed6-41d7-b3f6-a30818fa9267', 'bba4a606-858d-4ff9-9c6b-b6666f590b49', 'FALL', NULL, NULL, 203, true),
  -- 145 F: Barry, NEWT over Gavilanes, NUTL (Fall 2:50)
  (181, 74, 'championship', 'F', '19aa028d-e0c8-4c7e-b55b-0e8614d08428', '99666239-86da-48c8-a278-5881ea83c683', 'FALL', NULL, NULL, 170, true),
  -- 145 3rd_Place: Bernal, CLPA over Lumba, LYND (Fall 5:21)
  (181, 74, 'consolation', '3rd_Place', 'ee9afb02-324a-4fbb-9ac1-09a59fa0cb97', 'b6576365-1bf9-4243-b3cf-04111453e22b', 'FALL', NULL, NULL, 321, true),
  -- 145 5th_Place: Sultanbek, TENA over Bowie, BEHS (Fall 1:03)
  (181, 74, 'consolation', '5th_Place', '1b71ce22-d66d-4487-8b11-5a585bd91f70', '578f7069-bf1b-450f-ab4b-49c879177a8d', 'FALL', NULL, NULL, 63, true),
  -- 145 C4: Bernal, CLPA over Bowie, BEHS (Dec 3-0)
  (181, 74, 'consolation', 'C4', 'ee9afb02-324a-4fbb-9ac1-09a59fa0cb97', '578f7069-bf1b-450f-ab4b-49c879177a8d', 'DEC', 3, 0, NULL, true),
  -- 145 C4: Lumba, LYND over Sultanbek, TENA (MD 9-1)
  (181, 74, 'consolation', 'C4', 'b6576365-1bf9-4243-b3cf-04111453e22b', '1b71ce22-d66d-4487-8b11-5a585bd91f70', 'MD', 9, 1, NULL, true),
  -- 152 F: Poalillo, HPR over Ramos, NEWT (Fall 0:58)
  (181, 75, 'championship', 'F', '22a9ccca-af57-488a-81b9-68314078afd2', 'a978984b-76ad-4b0f-b1b8-4b94b994d26f', 'FALL', NULL, NULL, 58, true),
  -- 152 3rd_Place: Lagunes, LVH over Millet, CLIF (Fall 4:38)
  (181, 75, 'consolation', '3rd_Place', '97bba891-93ab-41a0-873d-18f2fede2d46', 'df9ecd73-926f-4be6-b1f9-40176b99f4b1', 'FALL', NULL, NULL, 278, true),
  -- 152 5th_Place: Suarez, PA over Shemon, MHMK (Dec 3-1)
  (181, 75, 'consolation', '5th_Place', '3c64b2f7-d04f-4263-b202-cf4fccaf59be', '49f341f6-bec3-438f-b423-d5d5e322b37d', 'DEC', 3, 1, NULL, true),
  -- 152 C4: Lagunes, LVH over Suarez, PA (Fall 1:39)
  (181, 75, 'consolation', 'C4', '97bba891-93ab-41a0-873d-18f2fede2d46', '3c64b2f7-d04f-4263-b202-cf4fccaf59be', 'FALL', NULL, NULL, 99, true),
  -- 152 C4: Millet, CLIF over Shemon, MHMK (Dec 9-5)
  (181, 75, 'consolation', 'C4', 'df9ecd73-926f-4be6-b1f9-40176b99f4b1', '49f341f6-bec3-438f-b423-d5d5e322b37d', 'DEC', 9, 5, NULL, true),
  -- 165 F: Georges, DECA over Mann, HPR (Fall 0:53)
  (181, 76, 'championship', 'F', '05ff4626-e622-4bf9-8721-fcc1ebf2b191', 'e25fbb78-e72e-4325-8f66-ea71af2729a9', 'FALL', NULL, NULL, 53, true),
  -- 165 3rd_Place: Genao, FALA over Tavarez, CLIF (Fall 1:03)
  (181, 76, 'consolation', '3rd_Place', '70561c88-aac8-4912-b8db-2423e397d827', '61a92ccf-7a69-4633-b3fc-6bfaf6ec8415', 'FALL', NULL, NULL, 63, true),
  -- 165 5th_Place: Wilkinson, MTOL over Galindo, PCTV (M. For.)
  (181, 76, 'consolation', '5th_Place', '45d532da-475f-4ba4-b8f2-96e70822e34a', '601ae781-6f53-41e5-bc53-6c2f062765ae', 'FORF', NULL, NULL, NULL, true),
  -- 165 C4: Genao, FALA over Galindo, PCTV (Fall 4:48)
  (181, 76, 'consolation', 'C4', '70561c88-aac8-4912-b8db-2423e397d827', '601ae781-6f53-41e5-bc53-6c2f062765ae', 'FALL', NULL, NULL, 288, true),
  -- 165 C4: Tavarez, CLIF over Wilkinson, MTOL (Dec 7-1)
  (181, 76, 'consolation', 'C4', '61a92ccf-7a69-4633-b3fc-6bfaf6ec8415', '45d532da-475f-4ba4-b8f2-96e70822e34a', 'DEC', 7, 1, NULL, true),
  -- 185 F: Osorio, STMA over Murray, NEWT (Fall 3:11)
  (181, 77, 'championship', 'F', 'fc5202b1-cf36-4656-9f73-7d39f77f76bb', '3560add8-52e5-4fb1-b7ca-d615c2e600fa', 'FALL', NULL, NULL, 191, true),
  -- 185 3rd_Place: Stiller, NWR over Soto, PAHI (Dec 7-6)
  (181, 77, 'consolation', '3rd_Place', '18f67618-c579-4381-9ab1-8ab2c9011974', '2ca02b06-e512-454b-a229-856cf68c63ef', 'DEC', 7, 6, NULL, true),
  -- 185 5th_Place: Nava, PASS over Silia Guzm, PCTV (SV-2 2-1)
  (181, 77, 'consolation', '5th_Place', '1cd20964-e5a6-477b-9dab-cf88a25aae02', '5a3209d8-bad0-4071-923b-da897500a640', '2-OT', 2, 1, NULL, true),
  -- 185 C4: Stiller, NWR over Nava, PASS (Fall 2:58)
  (181, 77, 'consolation', 'C4', '18f67618-c579-4381-9ab1-8ab2c9011974', '1cd20964-e5a6-477b-9dab-cf88a25aae02', 'FALL', NULL, NULL, 178, true),
  -- 185 C4: Soto, PAHI over Silia Guzm, PCTV (Fall 2:50)
  (181, 77, 'consolation', 'C4', '2ca02b06-e512-454b-a229-856cf68c63ef', '5a3209d8-bad0-4071-923b-da897500a640', 'FALL', NULL, NULL, 170, true),
  -- 235 F: Perez, LSB over Paglia, NEWT (Fall 0:44)
  (181, 78, 'championship', 'F', 'd4afd60c-84b3-4b74-9dc8-077718dcd94c', '168e2805-2a71-49aa-bd5a-585f28106bfc', 'FALL', NULL, NULL, 44, true),
  -- 235 3rd_Place: Valdez, CLPA over Garcia, PCTV (Fall 2:28)
  (181, 78, 'consolation', '3rd_Place', 'e96d78b1-7c48-487b-bddf-2ecd9d037c28', 'cfdae943-6ffe-4b1a-bcd5-f534a7d2d583', 'FALL', NULL, NULL, 148, true),
  -- 235 5th_Place: Esseya, DUMO over Grande, MHMK (Fall 1:58)
  (181, 78, 'consolation', '5th_Place', 'd2eadc8a-ef50-47b6-923c-8f340c474096', 'b0f6fcc2-e7e3-4459-8835-497e4eed5bfe', 'FALL', NULL, NULL, 118, true),
  -- 235 C4: Garcia, PCTV over Grande, MHMK (Fall 5:03)
  (181, 78, 'consolation', 'C4', 'cfdae943-6ffe-4b1a-bcd5-f534a7d2d583', 'b0f6fcc2-e7e3-4459-8835-497e4eed5bfe', 'FALL', NULL, NULL, 303, true),
  -- 235 C4: Valdez, CLPA over Esseya, DUMO (Fall 5:19)
  (181, 78, 'consolation', 'C4', 'e96d78b1-7c48-487b-bddf-2ecd9d037c28', 'd2eadc8a-ef50-47b6-923c-8f340c474096', 'FALL', NULL, NULL, 319, true);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 60 THEN RAISE EXCEPTION 'expected 60 bouts, got %', n; END IF;
END $$;
