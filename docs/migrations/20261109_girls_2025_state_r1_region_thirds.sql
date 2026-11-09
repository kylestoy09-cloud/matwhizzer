-- Girls 2024-25 postseason, step 1: State Round 1 and region 3rd place bouts (2026-11-09)
--
-- The 2024-25 girls regions (134-137) and State (138) were loaded from Round 2 on, with no region 3rd place
-- bouts. These are the missing bouts whose two wrestlers already have entries, from the TrackWrestling exports
-- (Whizzer Upload/Match Data/2025 Girls Region|State Data.py), built by scripts/build_girls_2025_r1_and_thirds.mts.
-- State Round 1: 46; region 3rd place: 46. The bouts with a wrestler who has no entry
-- (3) wait for step 2. Each bout is checked not already stored.
-- ROLLBACK: DELETE FROM matches WHERE (tournament_id = 138 AND round = 'R1') OR (tournament_id IN (134, 135, 136, 137) AND round = '3rd_Place');
--           (no such rows existed before this migration)
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE (tournament_id = 138 AND round = 'R1') OR (tournament_id IN (134, 135, 136, 137) AND round = '3rd_Place')) THEN
    RAISE EXCEPTION 'State Round 1 or region 3rd place bouts already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
    -- States 100 R1: Elizabeth Avila (Brick Township) 26-10 won by fall over Harlee Stracuzzi (Somerville) 25-11 (Fall 3:23)
    (138, 67, 'championship', 'R1', 'ea060a48-b7c5-4aea-8d88-ea7440bdc8cb', '4fa15142-4fe6-47d5-946e-7755eb7ddfd4', 'FALL', NULL, NULL, 203, true),
    -- States 100 R1: Angelina Qualitieri (Lenape Valley H.S.) 34-4 won by fall over Isabel Diehl (Delran) 21-14 (Fall 1:45)
    (138, 67, 'championship', 'R1', '7b398ab6-b820-47f2-9a62-a97a6d7d9316', '1f6699b9-ebc1-47d0-8905-1c1af3f6e956', 'FALL', NULL, NULL, 105, true),
    -- States 100 R1: Lydia Bagley (Delaware Valley Regional) 27-7 won by fall over Brooke Pettet (Eastern) 27-8 (Fall 1:56)
    (138, 67, 'championship', 'R1', 'f8e77139-01eb-4ff6-94e7-6b89f3fb2168', '3503668d-0fc8-42c0-8672-dd74c16c782f', 'FALL', NULL, NULL, 116, true),
    -- States 107 R1: Olivia Mitchell (East Brunswick H.S.) 31-5 won by decision over Gabriela Giacone (Watchung Hills Regional) 27-9 (Dec 11-
    (138, 68, 'championship', 'R1', '54466050-d3c0-4a5a-ad91-3caac2bc9851', 'a9ac069f-ad15-443c-881d-62c7d6fe1137', 'DEC', 11, 4, NULL, true),
    -- States 107 R1: Aubree Butler (Rancocas Valley Regional) 33-7 won by fall over Peyton Brining (Audubon) 18-8 (Fall 0:44)
    (138, 68, 'championship', 'R1', '4bfeac9d-749e-4525-8324-f457f02f15cb', '2ea5c15c-ec12-4fed-9cb7-adb10db1b2aa', 'FALL', NULL, NULL, 44, true),
    -- States 107 R1: Gianna Bonaccorso (Fair Lawn) 20-3 won by fall over Ava Novello (Mahwah) 17-7 (Fall 1:30)
    (138, 68, 'championship', 'R1', 'bdc0e2f8-b817-4c96-9c75-fb3e84eb8fee', '95d6a14d-f821-4fcb-a16c-1ad8bfc335ca', 'FALL', NULL, NULL, 90, true),
    -- States 107 R1: Lily Henderson (Vernon Township) 27-6 won by fall over Laia Colet-Rams (Westfield) 9-4 (Fall 5:10)
    (138, 68, 'championship', 'R1', 'b7c8e942-ecf7-45c4-b5da-281a3262687c', '893744a8-0db1-48b1-a154-fff0bc8a8e81', 'FALL', NULL, NULL, 310, true),
    -- States 114 R1: Sheyna Cruz (Paulsboro H.S.) 26-6 won by fall over Layla Newton (Haddon Twp Hgh School) 14-7 (Fall 0:48)
    (138, 69, 'championship', 'R1', 'dc76d066-50f3-4b29-a758-0d544511f8f3', '701a9e68-3653-4963-9bdc-c95bc59dd896', 'FALL', NULL, NULL, 48, true),
    -- States 114 R1: Elllie Kisselbach (Phillipsburg) 32-6 won by decision over Grace Riley (Paramus Catholic) 22-9 (Dec 11-6)
    (138, 69, 'championship', 'R1', 'ab0aac5c-436e-4315-8210-5b20a1c32662', '35acbd71-a7d4-4287-9f60-3654cd131a17', 'DEC', 11, 6, NULL, true),
    -- States 114 R1: Madison Blumenthal (Bordentown Regional/Florence Township) 21-5 won by fall over Jazzira Lopez (West Orange) 10-7 (Fall 
    (138, 69, 'championship', 'R1', '75396c32-0a3b-4e05-a54d-144e19201002', 'c8e05781-59c1-4e7e-aa40-77139b3f4c13', 'FALL', NULL, NULL, 211, true),
    -- States 114 R1: Jaliyah Richards (Scotch Plains-Fanwood) 23-11 won by fall over Natalie Tucker (Vernon Township) 20-9 (Fall 4:18)
    (138, 69, 'championship', 'R1', '6f0f5e04-cd0a-451b-a920-bd73815c9b31', 'cf37934a-dad5-4357-b1f9-4a61677e3813', 'FALL', NULL, NULL, 258, true),
    -- States 120 R1: Aman Cheema (Monroe Township) 14-5 won by decision over Zoe Poznanski (JFK/Woodbridge/Colonia) 24-9 (Dec 15-13)
    (138, 70, 'championship', 'R1', '92bedbf6-7bb0-4e2d-a86b-cb7c417a8816', '82799023-aa4c-44a8-92fd-cb944a9b3075', 'DEC', 15, 13, NULL, true),
    -- States 120 R1: Emma Peake (Hunterdon Central Reg) 28-4 won by fall over Sophia Salazar (Morris Hills) 25-10 (Fall 1:20)
    (138, 70, 'championship', 'R1', 'ff3c86c9-3b7c-4956-bd36-3e7c72656991', '5995d304-d0b0-4129-8123-5de1bcb32437', 'FALL', NULL, NULL, 80, true),
    -- States 120 R1: Jada Figueroa (Jackson Memorial Hs) 34-7 won by fall over Maeve Witte (Freehold Township) 18-8 (Fall 2:18)
    (138, 70, 'championship', 'R1', '111e7481-0a64-43d2-a678-8c7dc415d65b', 'c58ccea1-182b-47bf-ab61-8eaa49c3060f', 'FALL', NULL, NULL, 138, true),
    -- States 120 R1: Sophia Holmes (Clayton/Glassboro) 30-11 won by decision over Samirah Duron (Egg Harbor) 24-9 (Dec 8-4)
    (138, 70, 'championship', 'R1', '60f1cb50-283d-4450-9f25-b5e870969ce7', '1a798616-4e8e-4054-8474-0b1c7205146b', 'DEC', 8, 4, NULL, true),
    -- States 126 R1: Cristy Mejia (Robbinsville) 19-5 won by fall over Melanie Hernandez (Plainfield) 19-6 (Fall 3:55)
    (138, 71, 'championship', 'R1', 'd9e9073d-f500-4e5b-a8a5-da730d838474', 'e3fe22de-b410-41b5-8b32-9f21d4f9de0a', 'FALL', NULL, NULL, 235, true),
    -- States 126 R1: Briana Dugo (Jackson Memorial Hs) 32-8 won by fall over Noelsymar Estrada (Trenton Central) 12-7 (Fall 1:56)
    (138, 71, 'championship', 'R1', '769c3a56-ad70-42a9-b371-bf11daa86215', '4d6df520-380c-4c5f-a292-bfe8fa3e38d6', 'FALL', NULL, NULL, 116, true),
    -- States 126 R1: Madelyn McLaughlin (Bloomfield) 31-11 won by decision over Bilge Balci (Pennsville Memorial) 18-7 (Dec 6-1)
    (138, 71, 'championship', 'R1', '192412ba-6e55-49ea-884f-651c9d5f5d1a', '1905f87e-ee8b-419f-9fab-47ce26607b31', 'DEC', 6, 1, NULL, true),
    -- States 126 R1: Alexa Ciliotta (Montville Township High School) 22-3 won by decision over Molly Smyth (Mt. Olive) 21-5 (Dec 7-2)
    (138, 71, 'championship', 'R1', 'd38c2f8b-d63c-431e-8bf4-41308c1e32bc', '32c963b7-f655-4f31-8270-0cbe9481296b', 'DEC', 7, 2, NULL, true),
    -- States 132 R1: Sophia Massefski (Montville Township High School) 26-7 won in the ultimate tie breaker over Eudora Pamphile (Trenton Cen
    (138, 72, 'championship', 'R1', 'd40d34a7-7139-4701-b0f6-74b330b6d6eb', '8627f4ad-bdf1-40f6-9af2-6f3112168ec4', 'UTB', 3, 2, NULL, true),
    -- States 132 R1: Sophia Klecha (Pequannock Township) 21-5 won by fall over Abigail Centeno (Somerville) 31-13 (Fall 3:20)
    (138, 72, 'championship', 'R1', 'cd213175-6edd-4011-93aa-343479862765', 'cbea7021-4592-4ec1-8d67-159dce920881', 'FALL', NULL, NULL, 200, true),
    -- States 132 R1: Leanna Noel (Bloomfield) 35-7 won by tech fall over Melani Contreras (North Brunswick Township) 30-10 (TF-1.5 4:37 (19-2
    (138, 72, 'championship', 'R1', '1efbb425-1ca4-4ca7-9a2f-8cbb5874b55a', 'aab67632-3a01-455c-8b24-44aef06f14a5', 'TF-1.5', 19, 2, 277, true),
    -- States 132 R1: Sophie Babineau (Manalapan) 28-3 won by decision over JayAnna Hahn (Central Regional) 29-6 (Dec 11-8)
    (138, 72, 'championship', 'R1', 'f6dfef77-ce89-4f8f-8033-b6649b745522', '8f608cb1-de7c-4d57-b7d8-5e7b40bd76c6', 'DEC', 11, 8, NULL, true),
    -- States 138 R1: Ecrin Haliloglu (Delran) 28-8 won by major decision over Dominique Lopez (Jackson Memorial Hs) 34-8 (MD 8-0)
    (138, 73, 'championship', 'R1', '5cde2df8-e8d1-454e-bba5-e49fed515a9f', '94958292-132c-48eb-af32-1221a013cd11', 'MD', 8, 0, NULL, true),
    -- States 138 R1: Isabella Prem-Golden (Lenape) 21-5 won by major decision over Aydible Mejia (Elizabeth) 11-7 (MD 10-0)
    (138, 73, 'championship', 'R1', 'ba220b1a-219f-4286-acc6-a2fbf7fba5a4', 'e697cb87-0f04-4996-b361-e0717067befa', 'MD', 10, 0, NULL, true),
    -- States 138 R1: Hana Abdelnabi (Hamilton West) 13-6 won by decision over Danna Ramirez (Ocean City) 23-6 (Dec 12-8)
    (138, 73, 'championship', 'R1', '7a1d46a0-f501-409a-9044-fa13bb5e4721', '6498c08b-9033-459d-90ed-6290939a59f9', 'DEC', 12, 8, NULL, true),
    -- States 138 R1: Gabrielle Roberts (North Brunswick Township) 32-8 won by fall over Michelle Gavilanes (Nutley) 27-10 (Fall 5:12)
    (138, 73, 'championship', 'R1', '8c5de102-30b3-4c3e-8dbd-6dfbae0328cb', '851800ab-8bda-41cf-a578-2c53f3c1f7aa', 'FALL', NULL, NULL, 312, true),
    -- States 145 R1: Fatina Lozier (Pennsauken) 29-8 won by decision over Adriana Haskin (Rahway) 27-16 (Dec 8-6)
    (138, 74, 'championship', 'R1', 'e82aa80d-6b03-4932-b375-8233b4089581', '3cf54ffc-cca9-42ab-8d37-489b0ed784f7', 'DEC', 8, 6, NULL, true),
    -- States 145 R1: Gianna Lopez (Cherry Hill East) 17-6 won by fall over Caelum Ritzdorf (Metuchen) 19-9 (Fall 0:59)
    (138, 74, 'championship', 'R1', '884eba3f-37a5-4018-9b3b-ab861883d6ef', '53ba6c22-f23e-4c4d-81ef-5f0ee3dc1795', 'FALL', NULL, NULL, 59, true),
    -- States 145 R1: Valeria Ramirez (Elizabeth) 11-7 won by fall over Peyton Gauss (Pemberton Township) 29-7 (Fall 1:49)
    (138, 74, 'championship', 'R1', '818359de-3939-4db3-98c3-60cf579a614b', '0a7cf174-ed5d-410b-911e-03bd3aeb0508', 'FALL', NULL, NULL, 109, true),
    -- States 145 R1: Charlize Schlam (Point Pleasant Boro) 16-8 won by fall over Natalia Rusin (Middletown South) 24-10 (Fall 5:12)
    (138, 74, 'championship', 'R1', 'af423bf3-200d-452c-930c-b90b24af91d0', '8337971f-c857-4297-bab0-0c3f8817e19e', 'FALL', NULL, NULL, 312, true),
    -- States 152 R1: Alexus Paden (Clayton/Glassboro) 31-8 won by decision over Eliza Toth (Point Pleasant Boro) 20-11 (Dec 6-3)
    (138, 75, 'championship', 'R1', '557e167f-4020-42f3-98fb-1377992a1e46', '924afab0-5b44-4f53-b0c8-e6aa5fb10093', 'DEC', 6, 3, NULL, true),
    -- States 152 R1: Anshul Kumar (Somerville) 36-9 won by fall over Riley Conaty (North Hunterdon) 17-7 (Fall 1:25)
    (138, 75, 'championship', 'R1', 'ed952608-0c62-4b6b-b0a5-7f7d309a1fd0', '7433038f-f59a-4d77-ae4d-b6a389147ce5', 'FALL', NULL, NULL, 85, true),
    -- States 152 R1: Abbigale Dudley (Rancocas Valley Regional) 30-4 won by fall over Ava Forstenhausler (Roselle Park) 25-11 (Fall 1:23)
    (138, 75, 'championship', 'R1', 'bae64b69-9922-4086-99a2-c6b05d402aeb', '949b9579-3468-49f3-a926-c4c3edd4bb68', 'FALL', NULL, NULL, 83, true),
    -- States 152 R1: Catalina Santiago (Gloucester City JR/SR) 29-8 won by fall over Brigid Hatton (Raritan) 23-11 (Fall 3:51)
    (138, 75, 'championship', 'R1', '264353fe-a9dc-4ac5-9371-3fcbdf428f0a', '0569a931-4e24-4bdb-898e-2b5fd4161167', 'FALL', NULL, NULL, 231, true),
    -- States 165 R1: Jeveah Turner (Rancocas Valley Regional) 29-7 won by fall over Reno Prochilo (Bloomfield) 16-4 (Fall 1:45)
    (138, 76, 'championship', 'R1', '3b7f733a-b477-4e84-a1c9-092411ffe696', '35cd33d8-b077-4ec2-ae91-816b5e1f2b3d', 'FALL', NULL, NULL, 105, true),
    -- States 165 R1: Emily Breen (Point Pleasant Boro) 16-3 won by injury default over Ella Johnson (Hamilton East-Steinert) 21-5 (Inj. 0:17)
    (138, 76, 'championship', 'R1', 'd54251c3-048f-4e2f-88cc-aa5e3903aacd', '6fbae29b-861e-4f38-b2f8-1661230bf829', 'INJ', NULL, NULL, NULL, true),
    -- States 165 R1: Sofia Sousa (Old Bridge) 30-7 won by fall over Jayleen Barett (Elizabeth) 10-7 (Fall 1:14)
    (138, 76, 'championship', 'R1', 'd26311b5-8e56-4ef8-b158-6d39c4d0078e', '55ff9851-6f9f-4c49-8933-51d1842004ee', 'FALL', NULL, NULL, 74, true),
    -- States 165 R1: Paige DeCaro (Newton/Kittatinny) 35-3 won by fall over Makayla Decker (Saint Thomas Aquinas) 16-9 (Fall 0:29)
    (138, 76, 'championship', 'R1', 'fdf411c1-115d-4983-9e28-2bafb74ba09e', '1e73c7cf-324b-453c-abee-e07fb1c43f73', 'FALL', NULL, NULL, 29, true),
    -- States 185 R1: Rowan Waite (Vernon Township) 25-10 won by decision over Lesly Sanchez (Bloomfield) 25-10 (Dec 6-4)
    (138, 77, 'championship', 'R1', '98af6ccd-740f-425a-aba4-b41eda83f27b', '5a1195ba-1d4b-44c2-b762-08355718f7e9', 'DEC', 6, 4, NULL, true),
    -- States 185 R1: Carina Rivera (Nutley) 23-11 won by decision over Madilyn Rios (Hunterdon Central Reg) 24-12 (Dec 4-1)
    (138, 77, 'championship', 'R1', '76dd2930-b0f7-4420-8932-d414fcf715d2', 'b230016f-a588-40cd-a6a5-059bae9e7083', 'DEC', 4, 1, NULL, true),
    -- States 185 R1: Brianna Sandoval (Bound Brook HS) 31-3 won by fall over Tanvi Madisetti (Lawrence Senior) 26-5 (Fall 2:38)
    (138, 77, 'championship', 'R1', '81d85b34-4dd0-4f36-a0cf-a85aa092e4a8', 'f1ed3be5-079a-45cf-a4b3-535ded9c197b', 'FALL', NULL, NULL, 158, true),
    -- States 235 R1: Tracy Najarro (Manchester Regional) 5-3 won by decision over Rahkai Degrasse (North Brunswick Township) 24-9 (Dec 4-2)
    (138, 78, 'championship', 'R1', '1234b6e6-6ac5-42f8-badb-91c468163c92', 'a1e4d9b7-fa84-445f-a728-3bb7db883401', 'DEC', 4, 2, NULL, true),
    -- States 235 R1: Christina Lisboa (Pennsauken) 29-8 won by fall over Perla Castillo (Lakewood) 22-11 (Fall 5:27)
    (138, 78, 'championship', 'R1', '76f86a42-53bc-4efb-8d3f-9621f3de9d52', 'c7660f01-6dcd-4705-9c6d-006927a6262b', 'FALL', NULL, NULL, 327, true),
    -- States 235 R1: Giavonna Farrell-Byers (Howell) 29-10 won by fall over Yasmin Garcia (Rahway) 14-5 (Fall 1:32)
    (138, 78, 'championship', 'R1', '6a809403-b322-40d6-962b-1c5f1b58d8c5', '620f262e-d5b6-4000-9614-fc9a33b0d813', 'FALL', NULL, NULL, 92, true),
    -- States 235 R1: Aniyah Henley (Lenape) 20-7 won by fall over Emmy Hotz (Delaware Valley Regional) 20-4 (Fall 3:04)
    (138, 78, 'championship', 'R1', 'aeb9c936-c4cd-4d24-b6f6-e3c71284ea8c', '96fae2fa-5a94-4652-a88f-e4c2d684387b', 'FALL', NULL, NULL, 184, true),
    -- Regions North 1 100 3rd_Place: Angelina Qualitieri (Lenape Valley H.S.) 31-2 won by fall over Olivia McCormick (Lakeland Reg) 21-6 (Fall 1:40)
    (135, 67, 'consolation', '3rd_Place', '8a030ec3-6ec9-4d86-97fe-f9f90f4b372f', '96991e35-0b50-4a4c-ab01-3c096154d2c1', 'FALL', NULL, NULL, 100, true),
    -- Regions North 1 107 3rd_Place: Ava Novello (Mahwah) 17-5 won by fall over Kayla Coletta (Mary Help of Christians Academy) 24-6 (Fall 1:37)
    (135, 68, 'consolation', '3rd_Place', '2c1b06cc-9b10-41e2-9967-9edbdb388a5c', '62f75caa-5359-45da-a4bc-71854229e6b5', 'FALL', NULL, NULL, 97, true),
    -- Regions North 1 114 3rd_Place: Natalie Tucker (Vernon Township) 20-7 won by fall over Kaylee Hughen (Boonton) 18-9 (Fall 3:13)
    (135, 69, 'consolation', '3rd_Place', '229e8751-a8cf-4bb5-82b1-6cf511a477f0', '9ed68284-abf9-4bd9-ac8a-cd177db62b90', 'FALL', NULL, NULL, 193, true),
    -- Regions North 1 120 3rd_Place: Sophia Salazar (Morris Hills) 25-8 won by decision over Havana Acevedo (Montclair) 19-7 (Dec 8-6)
    (135, 70, 'consolation', '3rd_Place', 'f893476c-e169-44eb-ac15-2cf22bf58285', 'd1e0d9e3-344b-431d-ae48-8f3dffed0364', 'DEC', 8, 6, NULL, true),
    -- Regions North 1 126 3rd_Place: Molly Smyth (Mt. Olive) 19-3 won by fall over Fiona Gough (Wayne Valley) 12-4 (Fall 3:11)
    (135, 71, 'consolation', '3rd_Place', 'd1b149da-e775-474f-9239-ee9b2768ea54', 'fd153fb5-ab0c-411f-a1db-f66d446c8f93', 'FALL', NULL, NULL, 191, true),
    -- Regions North 1 132 3rd_Place: Sophia Massefski (Montville Township High School) 23-5 won by fall over Lauren Finkle (Passaic Co Tech-Voc) 24-8 (Fall 1
    (135, 72, 'consolation', '3rd_Place', 'cb9c8124-0c87-420a-ad8d-97bd3d28b88f', '50785630-0325-46dc-83cf-09223c76c709', 'FALL', NULL, NULL, 111, true),
    -- Regions North 1 138 3rd_Place: Michelle Gavilanes (Nutley) 27-8 won by fall over Gigi Santana (Lenape Valley H.S.) 26-10 (Fall 5:51)
    (135, 73, 'consolation', '3rd_Place', '79f3b2b6-2552-4e22-b151-06b14b1544fd', '1e453c08-8ad8-40ee-8c07-2653c0dc7b2c', 'FALL', NULL, NULL, 351, true),
    -- Regions North 1 145 3rd_Place: Samantha Goworek (Indian Hills) 11-2 won by fall over Kayley Bruner (High Point Regional) 13-4 (Fall 3:01)
    (135, 74, 'consolation', '3rd_Place', 'b97be355-8319-46dc-9802-66ff57c78d7d', '8988ba89-94e3-471f-a5a6-f2886fdf26ff', 'FALL', NULL, NULL, 181, true),
    -- Regions North 1 152 3rd_Place: Stella Ramos (Newton/Kittatinny) 29-3 won by fall over Destiny Rivera (Passaic Co Tech-Voc) 25-6 (Fall 2:58)
    (135, 75, 'consolation', '3rd_Place', 'eede584f-3710-4fa1-a434-0d0020c6cd3e', '533dcd3e-4bca-4fc4-a24f-c20e7228e798', 'FALL', NULL, NULL, 178, true),
    -- Regions North 1 165 3rd_Place: Paige DeCaro (Newton/Kittatinny) 32-2 won by fall over Aryana Osorio (St. Mary High School (Rutherford)) 10-5 (Fall 0:54
    (135, 76, 'consolation', '3rd_Place', '8fa43567-bc52-4280-8470-e8c9544f2a93', '4f7230a1-422e-4dd6-8a4f-cbee6299f3e4', 'FALL', NULL, NULL, 54, true),
    -- Regions North 1 185 3rd_Place: Rowan Waite (Vernon Township) 22-8 won by decision over Brianna Murray (Newton/Kittatinny) 28-7 (Dec 3-0)
    (135, 77, 'consolation', '3rd_Place', '035de293-db5b-4650-9e49-1372c427249d', '7d795920-8402-4031-afc9-3b748adcf349', 'DEC', 3, 0, NULL, true),
    -- Regions North 1 235 3rd_Place: Tracy Najarro (Manchester Regional) 4-1 won by fall over Abby Paglia (Newton/Kittatinny) 19-10 (Fall 0:41)
    (135, 78, 'consolation', '3rd_Place', '8e08690d-7926-4c98-8605-4ff8efbf8d77', '1862d292-7e29-4a22-8cdc-dd6aaae6f1a6', 'FALL', NULL, NULL, 41, true),
    -- Regions North 2 100 3rd_Place: Lydia Bagley (Delaware Valley Regional) 24-5 won by fall over Lexi Alzate (Warren Hills) 21-15 (Fall 2:52)
    (136, 67, 'consolation', '3rd_Place', '78d19959-48cd-4e4d-a5bb-966271f0b56d', '166095fe-040f-47d8-b258-83a4f675e61e', 'FALL', NULL, NULL, 172, true),
    -- Regions North 2 107 3rd_Place: Laia Colet-Rams (Westfield) 9-2 won by major decision over Allie Borzelli (North Hunterdon) 21-10 (MD 19-7)
    (136, 68, 'consolation', '3rd_Place', 'c1ff94d0-7cc2-4cda-94ad-09c2435385bf', 'eae3207c-3a4d-4050-96b5-50a7e365c517', 'MD', 19, 7, NULL, true),
    -- Regions North 2 114 3rd_Place: Jazzira Lopez (West Orange) 10-5 won by decision over Marianna Zegel (Madison) 20-6 (Dec 6-2)
    (136, 69, 'consolation', '3rd_Place', '131eb90c-54ee-4d3f-92fd-8868600a91db', '4feabac6-3003-47b9-ae31-e837d0f1e63e', 'DEC', 6, 2, NULL, true),
    -- Regions North 2 120 3rd_Place: Zoe Poznanski (JFK/Woodbridge/Colonia) 24-7 won by fall over Rochelle Phillips (Irvington) 13-4 (Fall 2:31)
    (136, 70, 'consolation', '3rd_Place', '2c6fcfe5-4950-4fe7-8a1f-8ed68eaa14bc', '8576ba31-ea9c-4230-932c-2af753af2122', 'FALL', NULL, NULL, 151, true),
    -- Regions North 2 126 3rd_Place: Melanie Hernandez (Plainfield) 18-3 won by decision over Harper Shimko (Scotch Plains-Fanwood) 23-8 (Dec 10-4)
    (136, 71, 'consolation', '3rd_Place', 'f987d77f-a507-4c62-a317-c2ea7c5b59a5', 'ab0e6e43-f408-4c73-817c-f4602490186c', 'DEC', 10, 4, NULL, true),
    -- Regions North 2 132 3rd_Place: Abigail Centeno (Somerville) 31-11 won by major decision over Amani Gosier (Irvington) 12-6 (MD 10-0)
    (136, 72, 'consolation', '3rd_Place', '4fac9402-bc32-475a-9e77-79b0bafe28a1', 'f5b6ccfb-15c6-4e00-8199-7c486663a8f6', 'MD', 10, 0, NULL, true),
    -- Regions North 2 138 3rd_Place: Aydible Mejia (Elizabeth) 10-4 won by fall over Allison Castellanos (Morristown) 12-2 (Fall 1:31)
    (136, 73, 'consolation', '3rd_Place', '57959220-c76d-4e57-a08b-8e90b5bfde82', '35371828-23b3-4d88-bb7f-259db50bbecf', 'FALL', NULL, NULL, 91, true),
    -- Regions North 2 145 3rd_Place: Adriana Haskin (Rahway) 25-13 won by fall over Hana Zamor (Scotch Plains-Fanwood) 18-10 (Fall 5:44)
    (136, 74, 'consolation', '3rd_Place', 'ce69f8c6-2491-4170-b969-6f02a60e593d', '2246af15-ed34-434d-ae68-81186c4d8eb3', 'FALL', NULL, NULL, 344, true),
    -- Regions North 2 152 3rd_Place: Riley Conaty (North Hunterdon) 17-5 won by fall over Faith Castro (Perth Amboy) 18-13 (Fall 0:56)
    (136, 75, 'consolation', '3rd_Place', '8003f7a1-4957-4cbd-b9fb-01d9443ca720', 'f7112d45-9ef3-4cf7-9220-b1bc15122a63', 'FALL', NULL, NULL, 56, true),
    -- Regions North 2 165 3rd_Place: Jayleen Barett (Elizabeth) 10-5 won by fall over Diana Darisme (Rahway) 16-8 (Fall 3:02)
    (136, 76, 'consolation', '3rd_Place', '53c34f9f-f302-45ae-b000-79bbc03cdf15', 'e6a7ff3e-2e1f-4909-9aa0-6f048d859ba9', 'FALL', NULL, NULL, 182, true),
    -- Regions North 2 185 3rd_Place: Madilyn Rios (Hunterdon Central Reg) 24-10 won by decision over Jaelyn Villalongo (Carteret) 10-3 (Dec 9-4)
    (136, 77, 'consolation', '3rd_Place', '1c12195b-3952-4a52-b795-251b67610544', '257161f2-6f83-4d34-a6b3-98f0fb149668', 'DEC', 9, 4, NULL, true),
    -- Regions North 2 235 3rd_Place: Emmy Hotz (Delaware Valley Regional) 18-2 won by fall over Addison Speth (Warren Hills) 16-10 (Fall 2:47)
    (136, 78, 'consolation', '3rd_Place', '36b07c64-59bf-4922-8607-1a7d468b71c5', '2f491f2a-aca1-435d-8283-46193bf57207', 'FALL', NULL, NULL, 167, true),
    -- Regions Central 100 3rd_Place: Elizabeth Avila (Brick Township) 24-7 won by fall over Samantha Larkin (Old Bridge) 23-9 (Fall 3:52)
    (134, 67, 'consolation', '3rd_Place', '57d1fbb8-18d3-477e-9113-923e51240a12', '687ec938-33be-430f-b69c-b686f720a4b4', 'FALL', NULL, NULL, 232, true),
    -- Regions Central 107 3rd_Place: Olivia Mitchell (East Brunswick H.S.) 29-3 won by fall over Charlida Cimino (Hillsborough) 27-9 (Fall 2:51)
    (134, 68, 'consolation', '3rd_Place', '9ed69106-7da4-47ae-8334-2b33419a1ef5', '155a214e-351a-41ff-a9a2-5f6d2087ed2a', 'FALL', NULL, NULL, 171, true),
    -- Regions Central 114 3rd_Place: Marlowe Donato (Jackson Memorial Hs) 28-7 won by fall over Emma Cook (Hopewell Valley Hs) 19-9 (Fall 3:49)
    (134, 69, 'consolation', '3rd_Place', '391b3da7-2e70-4a8a-843c-71af9118a756', '8d4533ae-028f-4a3e-8bfd-96bd83958716', 'FALL', NULL, NULL, 229, true),
    -- Regions Central 120 3rd_Place: Maeve Witte (Freehold Township) 18-6 won by decision over Cecilia O`Cone (Point Pleasant Beach Hs) 31-8 (Dec 8-5)
    (134, 70, 'consolation', '3rd_Place', 'b8cce1da-c677-438f-8b00-179bcf4523a3', 'c37d18da-71fa-4d78-a581-3f4690013036', 'DEC', 8, 5, NULL, true),
    -- Regions Central 126 3rd_Place: Noelsymar Estrada (Trenton Central) 12-5 won by fall over Marina Velazco (Lawrence Senior) 17-10 (Fall 1:09)
    (134, 71, 'consolation', '3rd_Place', '86300490-b121-44b2-8c7d-483ca06df0ba', 'c7223c43-6dee-4614-a7de-e690f7c78aa9', 'FALL', NULL, NULL, 69, true),
    -- Regions Central 132 3rd_Place: Melani Contreras (North Brunswick Township) 30-8 won by tech fall over Rowan Lacy-Cancel (Hamilton East-Steinert) 22-8 (
    (134, 72, 'consolation', '3rd_Place', '5289071a-082c-4dba-bec8-2693398928b2', 'b0ef21af-bef3-47c0-809e-4f1c9f03b545', 'TF-1.5', 16, 1, 190, true),
    -- Regions Central 138 3rd_Place: Hana Abdelnabi (Hamilton West) 12-4 won by decision over Marily Dominguez (Lakewood) 24-12 (Dec 7-2)
    (134, 73, 'consolation', '3rd_Place', '83c801d5-ac10-49e3-add1-9921b3e92df8', 'f12ddf3d-7190-4e6d-85a5-511e5f67c31d', 'DEC', 7, 2, NULL, true),
    -- Regions Central 145 3rd_Place: Natalia Rusin (Middletown South) 23-7 won by fall over Eileen Morales (Trenton Central) 20-9 (Fall 5:26)
    (134, 74, 'consolation', '3rd_Place', '917d8e94-7efe-4868-98d1-a73248f8e6da', '437201bc-741b-4494-a1d0-f3a053953c6b', 'FALL', NULL, NULL, 326, true),
    -- Regions Central 152 3rd_Place: Eliza Toth (Point Pleasant Boro) 19-8 won by decision over Zedekiah Pollard (New Brunswick) 23-9 (Dec 1-0)
    (134, 75, 'consolation', '3rd_Place', 'c0821d70-29ee-4344-9a7f-c7d20bf839aa', '47973251-489f-42a6-8718-642343645ec7', 'DEC', 1, 0, NULL, true),
    -- Regions Central 235 3rd_Place: Perla Castillo (Lakewood) 22-9 won by fall over Yuliana Hryn (Old Bridge) 23-14 (Fall 2:25)
    (134, 78, 'consolation', '3rd_Place', '973f73ef-1bbe-4078-835c-ccad337644c6', '334a9be3-2998-4504-b17e-4a3aa8e846d8', 'FALL', NULL, NULL, 145, true),
    -- Regions South 100 3rd_Place: Isabel Diehl (Delran) 21-12 won by decision over Mckenzie Markham (Kingsway Regional) 18-12 (Dec 26-20)
    (137, 67, 'consolation', '3rd_Place', 'b70ec3ab-d6c1-4fe9-902a-98d0aa4616e9', '27e799f3-493e-45b3-8b95-3ca0cee5e1bb', 'DEC', 26, 20, NULL, true),
    -- Regions South 107 3rd_Place: Peyton Brining (Audubon) 18-6 won by fall over Naomi Walker (Gloucester City JR/SR) 23-12 (Fall 3:33)
    (137, 68, 'consolation', '3rd_Place', '99bbd74c-994d-4cf5-91f9-3fc08e743061', '06252f96-2c2d-49a7-8328-b034a5421c70', 'FALL', NULL, NULL, 213, true),
    -- Regions South 114 3rd_Place: Layla Newton (Haddon Twp Hgh School) 14-5 won by decision over Sophia Reyes (Eastern) 18-7 (Dec 8-7)
    (137, 69, 'consolation', '3rd_Place', '33c5ce2a-c2c5-4f6a-9093-b00ec91121a6', '798e8489-b9b6-48de-9b6d-6698b78db431', 'DEC', 8, 7, NULL, true),
    -- Regions South 120 3rd_Place: Samirah Duran (Egg Harbor) 22-7 won in tie breaker - 1 over Makayla Vigilante (Southern Regional) 19-11 (TB-1 4-3)
    (137, 70, 'consolation', '3rd_Place', '5ced48fe-1f8e-429a-9cc4-6a1addb07ba2', '068875a1-684f-4ea9-91af-109420e68e13', 'TB-1', 4, 3, NULL, true),
    -- Regions South 126 3rd_Place: Bilge Balci (Pennsville Memorial) 18-5 won by decision over Gabriela Hoffmaster (Eastern) 17-6 (Dec 7-5)
    (137, 71, 'consolation', '3rd_Place', 'f4d4ae77-08c7-4396-be54-6ba2fc017911', 'b8ef2d55-3e6a-4ae5-a858-5b9120f42c35', 'DEC', 7, 5, NULL, true),
    -- Regions South 132 3rd_Place: JayAnna Hahn (Central Regional) 29-4 won by decision over Kylee Gaddy (Holy Spirit) 16-8 (Dec 8-6)
    (137, 72, 'consolation', '3rd_Place', '54d061fb-aaf1-4ed1-beaa-8a775cc19ea2', 'b899413b-f882-4057-bb10-17926ec0fe4e', 'DEC', 8, 6, NULL, true),
    -- Regions South 138 3rd_Place: Ecrin Haliloglu (Delran) 25-6 won by fall over Alexis Nelson (Gloucester City JR/SR) 24-7 (Fall 3:47)
    (137, 73, 'consolation', '3rd_Place', '645b8649-1a96-449d-957a-ac1c0c08faaa', 'fabd35ac-b7fd-479f-9f21-eac42406d8cc', 'FALL', NULL, NULL, 227, true),
    -- Regions South 145 3rd_Place: Gianna Lopez (Cherry Hill East) 12-5 won by fall over Elizabeth Ostoyic (Delsea) 30-5 (Fall 1:18)
    (137, 74, 'consolation', '3rd_Place', 'ef11ce9b-d0fe-4e01-9fed-5f86888ac52c', '22d6f1df-190f-43a1-87bd-19a540d3b80e', 'FALL', NULL, NULL, 78, true),
    -- Regions South 152 3rd_Place: Catalina Santiago (Gloucester City JR/SR) 28-6 won by fall over Lilliana Comstock (Central Regional) 16-10 (Fall 3:14)
    (137, 75, 'consolation', '3rd_Place', '1bcefc36-f85b-4cd4-b1a1-922112c63da9', 'ce3fca8b-9ba9-446f-9bea-d51b5de335c4', 'FALL', NULL, NULL, 194, true),
    -- Regions South 165 3rd_Place: Liliana Alicea (Central Regional) 29-3 won by fall over Denise Valencia (Maple Shade) 12-6 (Fall 3:47)
    (137, 76, 'consolation', '3rd_Place', '8c10dd36-0ada-412d-aea2-e7ae16730144', '7910c9b5-a3b8-42e1-ba0d-a147573acba3', 'FALL', NULL, NULL, 227, true),
    -- Regions South 185 3rd_Place: Paris Ford (Rancocas Valley Regional) 27-4 won by fall over Kayla Stevenson (Pennsauken) 11-3 (Fall 2:56)
    (137, 77, 'consolation', '3rd_Place', '7a84bef9-f6c7-42d7-9a37-48713f15c852', '2ec70ecf-e752-48ad-9623-4c6fce3968a7', 'FALL', NULL, NULL, 176, true),
    -- Regions South 235 3rd_Place: Christina Lisboa (Pennsauken) 28-6 won by fall over Samantha Domask (Palmyra) 20-6 (Fall 0:24)
    (137, 78, 'consolation', '3rd_Place', '71ce74e3-7215-49de-9be1-98e57bdfe4bf', 'a4e390e9-3d03-4694-adcd-8c1f79dbf0e7', 'FALL', NULL, NULL, 24, true);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 92 THEN RAISE EXCEPTION 'expected 92 bouts, got %', n; END IF;
END $$;

-- Verify: State R1 46; 3rd place per region
SELECT t.name, m.round, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE (m.tournament_id = 138 AND m.round = 'R1') OR (m.tournament_id IN (134, 135, 136, 137) AND m.round = '3rd_Place')
GROUP BY t.name, m.round ORDER BY t.name;
