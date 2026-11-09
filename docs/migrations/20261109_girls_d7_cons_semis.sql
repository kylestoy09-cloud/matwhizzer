-- Girls 2025-26 District 7: add the consolation semifinals (2026-11-09)
--
-- The TrackWrestling text export has no "Cons Semis" section for this district, so these bouts
-- were never loaded (the other ten districts have theirs, stored as round C3). Read from the final
-- bracket PDFs by scripts/build_girls_district_cons_semis.mts (the two bouts below the 5TH label) and
-- checked against the stored bouts: each pairs a semifinal loser with a cons. round 1 winner, the winners
-- are the 3rd place bout's wrestlers and the losers the 5th place bout's.
-- Expected: 23 bouts (2 per weight, less brackets whose consolation side is empty slots only).
-- Forfeit wins over an empty bracket slot are stored like the other districts' (FORF, no loser).
-- ROLLBACK: DELETE FROM matches WHERE tournament_id IN (192) AND round = 'C3';

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id IN (192) AND round = 'C3') THEN
    RAISE EXCEPTION 'cons. semifinals already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
  -- D7 100 bout 108: Gallo, MARE over Marin-Juar, NEBR (Fall 0:24)
  (192, 67, 'consolation', 'C3', '9697e020-672a-48c1-bce1-64ddf65a046a', '1734f00e-3c1b-4020-be66-b57f20ccca77', 'FALL', NULL, NULL, 24, true),
  -- D7 100 bout 109: Longo, NBT over Rodriguez-, HIPA (Fall 0:26)
  (192, 67, 'consolation', 'C3', 'b59215d2-1198-4f81-9a60-9414bd30c73d', '70996771-a0e4-4e7e-a754-ccd4f8b170fe', 'FALL', NULL, NULL, 26, true),
  -- D7 107 bout 110: Guan, HIPA over Burgos, RARI (MD 12-0)
  (192, 68, 'consolation', 'C3', 'ebca7478-d891-444a-b754-435e7b7a01e2', 'c6cfbe11-404f-4a55-8f0c-e2255223368f', 'MD', 12, 0, NULL, true),
  -- D7 107 bout 111: Stanley, MINO over Balbuena, NEBR (Fall 2:10)
  (192, 68, 'consolation', 'C3', '59b9cab0-4f57-4961-a2fd-0d2127b06ad5', '3f5161ee-ecfa-4e73-bc29-7c35902d931f', 'FALL', NULL, NULL, 130, true),
  -- D7 114 bout 112: Olvera, RBR over Cuomo, EBHS (Dec 6-3)
  (192, 69, 'consolation', 'C3', '01949198-6079-4c8c-842b-2bc8e1b83d73', '5fb3b83d-669f-4a20-9dec-8df3df328a29', 'DEC', 6, 3, NULL, true),
  -- D7 114 bout 113: Cicero, SPOT over Peraza, NBT (Fall 2:15)
  (192, 69, 'consolation', 'C3', '180b1311-96cd-4e0e-b784-aeb35c144116', '113b8292-3096-4c9e-aaf0-a15e333cbac2', 'FALL', NULL, NULL, 135, true),
  -- D7 120 bout 114: Berk, OLBR over Shah, HILL (Fall 1:09)
  (192, 70, 'consolation', 'C3', 'a381ab66-b3f3-4348-88ed-44b464c11015', '638b68ab-8b2e-43f8-a572-027bb6d46117', 'FALL', NULL, NULL, 69, true),
  -- D7 120 bout 115: Moshos, EBHS over Didomenico, RBR (Fall 2:51)
  (192, 70, 'consolation', 'C3', '966e101f-bad5-4363-ba3d-2b21bea152f9', '48408e19-0ef8-49e9-8fb2-4b9e53692138', 'FALL', NULL, NULL, 171, true),
  -- D7 126 bout 116: Lynch, OLBR over Khan, NBT (Fall 4:54)
  (192, 71, 'consolation', 'C3', 'e9d67542-f960-4358-943a-2b7327adf431', 'b5840594-21ba-4d84-9d8f-d4b7d497c1ae', 'FALL', NULL, NULL, 294, true),
  -- D7 126 bout 117: Dadzie, HILL over Albertelli, RBR (Dec 8-6)
  (192, 71, 'consolation', 'C3', '6ce3b1bd-8a9c-449a-ae85-28cc9a1f0c3a', '2bbe7ee7-a61e-40e8-8656-67d9b75775b9', 'DEC', 8, 6, NULL, true),
  -- D7 132 bout 118: Kiernan, HILL over Cabrera, RARI (TF-1.5 2:08 (16-0))
  (192, 72, 'consolation', 'C3', '195e5ad4-fb6c-4adf-a7f6-701d08b1bb10', 'd660aa59-833b-492e-83de-a18a3a530266', 'TF-1.5', 16, 0, 128, true),
  -- D7 132 bout 119: Sgalambro, MISO over Quintela, OLBR (MD 10-2)
  (192, 72, 'consolation', 'C3', '18979084-262a-45d9-bef9-3f43c6f2de34', '8823ed5f-5701-49bc-8377-4ff8af87e9ee', 'MD', 10, 2, NULL, true),
  -- D7 138 bout 120: Falzon, RARI over Taborda, OLBR (Fall 1:36)
  (192, 73, 'consolation', 'C3', '12dc6bac-05b6-4ff3-8d69-71cc46c4e05f', 'eeeb4d97-c4f4-48fd-9939-8a36d77df3ca', 'FALL', NULL, NULL, 96, true),
  -- D7 138 bout 121: DeJesus, NBT over Lopez-Lemu, RBR (Fall 5:36)
  (192, 73, 'consolation', 'C3', '7b711e30-4506-4cc0-aab6-f46e075b22c5', 'd0ef5a4b-9ecc-434d-a95d-8ae2796c64a6', 'FALL', NULL, NULL, 336, true),
  -- D7 145 bout 122: Chiapa Ben, NBT over Donohue, RARI (Fall 1:44)
  (192, 74, 'consolation', 'C3', 'be50e3d4-b67b-4334-8c8a-9538e006b815', 'e49d85a5-e7f7-46b1-a35d-3f1cabe17155', 'FALL', NULL, NULL, 104, true),
  -- D7 145 bout 123: Villa-Harp, RBR over Jackson, MISO (Fall 2:48)
  (192, 74, 'consolation', 'C3', 'b6dc2378-8c83-4fe0-b257-a310a81a82a8', 'fe6c7007-9d4d-4594-bd4c-bc60eca97461', 'FALL', NULL, NULL, 168, true),
  -- D7 152 bout 124: Romero, NBT over Ricardo, MINO (Fall 1:43)
  (192, 75, 'consolation', 'C3', 'cea90775-b160-4bdf-b5c2-8d47535544c0', '361d7197-875a-44f0-9d73-1a7780cf528e', 'FALL', NULL, NULL, 103, true),
  -- D7 152 bout 125: Kay, OLBR over Listopad, MONT (Fall 4:26)
  (192, 75, 'consolation', 'C3', '9ff61882-4843-4dce-928e-b536d88dfdf1', '84e1b837-5209-4e40-9fc5-70badc556e4c', 'FALL', NULL, NULL, 266, true),
  -- D7 165 bout 126: Soto, EBHS over Sherwood, SWM (Dec 11-9)
  (192, 76, 'consolation', 'C3', '2fb90e90-1540-4e97-8f77-00f9e885808a', '93f4c3d1-56ba-4e0d-b0b0-ead241b30ada', 'DEC', 11, 9, NULL, true),
  -- D7 165 bout 127: O`Neill, RARI over Cesiano, HILL (Fall 2:00)
  (192, 76, 'consolation', 'C3', '4fe45eb7-1bd0-4dc1-ae8c-c16538f62595', '5eb2f8bf-622c-430f-b40b-85756b841271', 'FALL', NULL, NULL, 120, true),
  -- D7 185 bout 128: Smith, OLBR over Marin-Torr, RBR (Fall 4:47)
  (192, 77, 'consolation', 'C3', 'c2dc43f7-ae25-43d2-82e3-b0e9b7920c08', '2c66f401-022e-4cf2-adbc-ec6a87107a86', 'FALL', NULL, NULL, 287, true),
  -- D7 185 bout 129: Abdalate, HILL over Torra, EBHS (Fall 5:33)
  (192, 77, 'consolation', 'C3', '3475bc8c-ffd5-4a5a-9e46-0d7adbd848da', 'fb34096e-14e2-4c61-9c43-3550c2306145', 'FALL', NULL, NULL, 333, true),
  -- D7 235 bout 130: Estrada, RARI over Barrios, NBT (MD 16-5)
  (192, 78, 'consolation', 'C3', '89a55222-4510-4d65-8a41-38e89491ca98', '2cc6de16-04f8-41c6-8a51-dee91f555464', 'MD', 16, 5, NULL, true);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 23 THEN RAISE EXCEPTION 'expected 23 bouts, got %', n; END IF;
END $$;

-- Verify: the count per district
SELECT t.name, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE m.tournament_id IN (192) AND m.round = 'C3' GROUP BY t.name ORDER BY t.name;
