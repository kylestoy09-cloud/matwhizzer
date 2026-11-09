-- Girls 2024-25 postseason, step 2: the region Round 1 bouts and three others (2026-11-09)
--
-- The 2024-25 girls regions were loaded from Round 2 on, and the Round 1 losers were never entered. Their
-- entries (and profiles where needed: 94 new, inactive) were added by scripts/apply_girls_2025_region_r1.mts
-- (ids: docs/migrations/backups/20261109_girls_2025_r1_created.json); these are their bouts, from the TrackWrestling exports. 258 bouts:
-- region Round 1, plus the three step-1 bouts that waited on an entry (State Round 1 185, Central 3rd place 165 / 185).
-- ROLLBACK: DELETE FROM matches WHERE winner_entry_id IN (the new entries) OR loser_entry_id IN (the new entries);
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id IN (134, 135, 136, 137) AND round = 'R1') THEN
    RAISE EXCEPTION 'region Round 1 bouts already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
    -- 135 100 R1: Ingrid Vazquez (Passaic) 14-12 won by major decision over Thiara Nunez (Leonia/Palisades Park) 6-4 (MD 12-1)
    (135, 67, 'championship', 'R1', '22d4b64e-d740-4562-a8fe-9cab9974cf58', '710c1812-5255-4284-b664-ac8f2b39ab5f', 'MD', 12, 1, NULL, true),
    -- 135 100 R1: Hanna Garofano (Wallkill Valley Regional) 7-13 won by fall over Mikayla Thompson (Elmwood Park) 1-12 (Fall 0:0
    (135, 67, 'championship', 'R1', '43aec4e6-e3fc-4361-a805-a53569550645', '2e8cec18-8a89-40f3-8d86-cea2980c897c', 'FALL', NULL, NULL, 0, true),
    -- 135 100 R1: Tori Stampone (Parsippany Hills High School) 14-12 won by fall over Mia Garcia (Lodi) 2-3 (Fall 4:28)
    (135, 67, 'championship', 'R1', '71f649e9-b6f4-404f-ab0d-63d79dae5268', '8ebd0158-0b3e-454a-8433-08ee2f214744', 'FALL', NULL, NULL, 268, true),
    -- 135 100 R1: Belinda Minervini (Mt. Olive) 6-5 won by decision over Kaylee Rodriguez (Passaic Co Tech-Voc) 6-8 (Dec 2-1)
    (135, 67, 'championship', 'R1', '7ad1bb0a-613a-4a18-a6ba-232d21fae1ba', '195b3105-0fa8-421a-986f-58e14c128130', 'DEC', 2, 1, NULL, true),
    -- 135 100 R1: Leilany Natal-Ramos (Belvidere) 16-8 won by fall over Jolie Kim (Pascack Valley School) 2-7 (Fall 3:04)
    (135, 67, 'championship', 'R1', '88f1b457-cd6c-48d9-b15e-2b2e65dac4a1', '299aaa6b-6fba-48a3-ae7b-3bc41875bdc8', 'FALL', NULL, NULL, 184, true),
    -- 135 100 R1: Allison Chavez (Cliffside Park/Ridgefield Memorial) 9-7 won by disqualification over Rachel Greenberg (Ramsey)
    (135, 67, 'championship', 'R1', '4f3d9ea6-edb4-4b2d-be5b-7e544cb1716a', '5cc35144-dbe9-4d54-a13a-6c2aa6da92a5', 'DQ', NULL, NULL, NULL, true),
    -- 135 107 R1: Sidney Figueroa (Boonton) 13-11 won by decision over Alison Benitez (Lodi) 5-3 (Dec 8-2)
    (135, 68, 'championship', 'R1', 'd46aa431-4f5f-42d1-9fe9-391233540ab8', '6eea9b57-0e85-4849-a486-ba9338fda917', 'DEC', 8, 2, NULL, true),
    -- 135 107 R1: Jenna Cammarata (Wallkill Valley Regional) 16-8 won by fall over Gris Ciprian (Passaic) 8-14 (Fall 1:17)
    (135, 68, 'championship', 'R1', '5acd1f67-001e-464b-bbb7-c4a9d23bbb40', '6e689f3d-2f0a-4b9e-b814-63a707f4f2ce', 'FALL', NULL, NULL, 77, true),
    -- 135 107 R1: Sophia Parzero (Lenape Valley H.S.) 23-10 won by fall over Sophia Ruta (Hawthorne) 5-11 (Fall 0:37)
    (135, 68, 'championship', 'R1', 'c0bef6e0-c156-4161-9d7c-2faf2eb5ae31', '8aba84de-8a6f-4fda-9134-13cdd7fefbaa', 'FALL', NULL, NULL, 37, true),
    -- 135 107 R1: Kate Machleder (Northern Valley Regional (Old Tappan) HS) 6-3 won by fall over Emilia Tylki (Garfield) 10-7 (F
    (135, 68, 'championship', 'R1', '5654cd7e-c1e4-489a-a889-b8fa5133b392', '1e1be010-9307-4003-be94-e15df042ab60', 'FALL', NULL, NULL, 146, true),
    -- 135 107 R1: Mia Capone (Mt. Olive) 20-4 won by fall over Alexis Dozier (Leonia/Palisades Park) 5-5 (Fall 1:18)
    (135, 68, 'championship', 'R1', '62360334-37e4-4c49-b521-e6dcd304bbba', '5b55fa76-1ca6-4530-bfb2-d1e1f3abc2a0', 'FALL', NULL, NULL, 78, true),
    -- 135 107 R1: Kayla Coletta (Mary Help of Christians Academy) 24-6 won by fall over Maria Rivera Perez (Parsippany Hills Hig
    (135, 68, 'championship', 'R1', '62f75caa-5359-45da-a4bc-71854229e6b5', '7b9622cc-ede5-4efd-a57a-91ed79bd49f0', 'FALL', NULL, NULL, 159, true),
    -- 135 107 R1: Laila Henson (St. Mary High School (Rutherford)) 6-7 won by major decision over Isabella Power (High Point Reg
    (135, 68, 'championship', 'R1', '0f592a54-aee6-40f1-884a-4fce533dd778', '96b52601-d36b-4260-b229-6974bf752377', 'MD', 14, 4, NULL, true),
    -- 135 107 R1: Kameko Sibblies (Newton/Kittatinny) 18-13 won by major decision over Amanda Scarpati (Lakeland Reg) 4-10 (MD 1
    (135, 68, 'championship', 'R1', 'af152f61-6ee8-4e10-bcc0-461345453347', 'ac78b5d2-4076-41e7-a23c-f3e6f981abd6', 'MD', 11, 3, NULL, true),
    -- 135 107 R1: Daniela Hidalgo (Morris Hills) 22-8 won by fall over Kassandra Lucero (Eastside ( Paterson)) 0-1 (Fall 0:37)
    (135, 68, 'championship', 'R1', 'ed41ea91-e496-49fb-b8b1-232c41aac9c9', '3f45474e-8b16-4293-a956-4129db62dfd1', 'FALL', NULL, NULL, 37, true),
    -- 135 107 R1: Isabella Santonocito (Ramsey) 17-13 won by fall over Yadira Morales Montes (Cliffside Park/Ridgefield Memorial
    (135, 68, 'championship', 'R1', 'efca07bc-18b4-4430-a662-4f0314991511', 'f0df1fcd-95b3-4d62-a7b2-692986b05770', 'FALL', NULL, NULL, 145, true),
    -- 135 107 R1: Alexa Scholz (Jefferson TWP) 11-11 won by decision over Izare Rivera (Passaic Co Tech-Voc) 14-9 (Dec 4-1)
    (135, 68, 'championship', 'R1', '758e1c50-06a6-43c4-a7c8-9d5d7c6ea0ed', '5ebb46e8-bddf-49e9-ab1b-831b7efa624b', 'DEC', 4, 1, NULL, true),
    -- 135 114 R1: Olivia Monderoy (Montclair) 14-7 won by fall over Emilia Gutierrez-Tami (Bogota/Ridgefield Park) 11-7 (Fall 4:
    (135, 69, 'championship', 'R1', '3726795f-b5b9-4b39-8e3a-b7262227ce7d', '56b6c872-22e9-48e3-b7c9-354456595d9a', 'FALL', NULL, NULL, 291, true),
    -- 135 114 R1: Isabelle Yukselen (Paramus) 15-6 won by tech fall over Kayla Paez (Mt. Olive) 5-12 (TF-1.5 2:23 (15-0))
    (135, 69, 'championship', 'R1', 'f5c0913b-8250-49b9-8600-70af9312af6e', 'de7c4222-057e-4b73-b44c-1a5a90a5f145', 'TF-1.5', 15, 0, 143, true),
    -- 135 114 R1: Natalie Tucker (Vernon Township) 20-7 won by fall over Briana Sadowski (Lenape Valley H.S.) 5-12 (Fall 0:23)
    (135, 69, 'championship', 'R1', '229e8751-a8cf-4bb5-82b1-6cf511a477f0', '99e82044-e744-40ca-ab9b-e6048ff8250f', 'FALL', NULL, NULL, 23, true),
    -- 135 114 R1: Lindsey Cunningham (Mahwah) 19-10 won by fall over Reilly Callan (Jefferson TWP) 9-12 (Fall 0:58)
    (135, 69, 'championship', 'R1', '79a25ce4-80b3-4c58-8613-12fc7861dd8f', '900733c4-27e7-436d-8255-195a0b606ef1', 'FALL', NULL, NULL, 58, true),
    -- 135 114 R1: Sarah Sheiner (Fair Lawn) 7-3 won by fall over Laura Rojas (Passaic Co Tech-Voc) 10-13 (Fall 1:46)
    (135, 69, 'championship', 'R1', 'ae172cf5-787b-44ad-8e93-43016e034dcc', '4ce7f114-c043-4c70-8561-9c86f100b973', 'FALL', NULL, NULL, 106, true),
    -- 135 114 R1: Lillianne Addabbo (Clifton) 11-8 won by fall over Gabriella Jaquez (Lakeland Reg) 6-8 (Fall 1:03)
    (135, 69, 'championship', 'R1', '1a5e6b72-3c8c-4811-b3e7-be06eb73a334', 'e97a09c2-3cec-445a-8896-cf0fdf461236', 'FALL', NULL, NULL, 63, true),
    -- 135 114 R1: Nicolette Vivas (Bergenfield HS) 18-12 won by fall over Emily Mcgee (Parsippany Hills High School) 14-19 (Fall
    (135, 69, 'championship', 'R1', 'dcee13db-d647-4794-8222-388a31fa3ea0', '0a2b184d-814f-4a61-b2bc-87e4edd3df10', 'FALL', NULL, NULL, 48, true),
    -- 135 114 R1: reese Rotonde (Ramsey) 22-7 won by fall over Karlee Reid (Newton/Kittatinny) 3-16 (Fall 0:33)
    (135, 69, 'championship', 'R1', '4bacce48-8faf-4d17-9b01-ac8f69aa2cdb', 'a8bd2e1b-39f1-4044-aef9-1eb3eb67bde5', 'FALL', NULL, NULL, 33, true),
    -- 135 114 R1: Lexi Cammarata (Wallkill Valley Regional) 19-4 won by fall over Laila Marsala (Nutley) 6-17 (Fall 2:45)
    (135, 69, 'championship', 'R1', '57a14477-d16c-4958-bdf4-c44b03eb4464', 'a649b3b6-4509-4fe5-8475-1cc1b558c901', 'FALL', NULL, NULL, 165, true),
    -- 135 114 R1: Kaylee Hughen (Boonton) 18-9 won by fall over Riley Eve (Belvidere) 6-10 (Fall 1:07)
    (135, 69, 'championship', 'R1', '9ed68284-abf9-4bd9-ac8a-cd177db62b90', 'cf932011-2e6c-4293-b946-b4e6de533f81', 'FALL', NULL, NULL, 67, true),
    -- 135 114 R1: Keaira Marshall (Cresskill) 6-6 won by medical forfeit over Carol Sutuj (Cliffside Park/Ridgefield Memorial) 1
    (135, 69, 'championship', 'R1', '60173a89-2f33-4178-88f7-49c6e441e4cb', 'a834d936-c2b8-47ca-99f0-2a0ee8c991fe', 'FORF', NULL, NULL, NULL, true),
    -- 135 120 R1: Juliet Novello (Mahwah) 14-13 won by fall over Trinity Shade (College Achieve Paterson Charter) 0-1 (Fall 1:28
    (135, 70, 'championship', 'R1', 'f297bf54-1fac-4b84-b3e1-8a6fd8684573', '3b3af2c5-1b6e-4006-a550-e1cae87a08f8', 'FALL', NULL, NULL, 88, true),
    -- 135 120 R1: Alexxa Schlereth (Wallkill Valley Regional) 16-6 won by fall over Isabella Winn (Nutley) 4-10 (Fall 1:43)
    (135, 70, 'championship', 'R1', '7643975e-44fb-4015-8919-6cbca68dcab0', '0293bf38-c5fa-43f9-8aa1-d77473212338', 'FALL', NULL, NULL, 103, true),
    -- 135 120 R1: Cora Almendinger (Lenape Valley H.S.) 25-11 won by fall over Giovanna White (Pascack Valley School) 3-6 (Fall 
    (135, 70, 'championship', 'R1', 'f826418f-7283-4c80-a60b-9bc52718285c', '3a3095c5-ba04-4425-8bbd-9466de31499a', 'FALL', NULL, NULL, 195, true),
    -- 135 120 R1: Gretchen Quast (Ramsey) 23-9 won by fall over Manushree Rana (Parsippany Hills High School) 6-15 (Fall 0:29)
    (135, 70, 'championship', 'R1', '2907ea23-b4e1-439e-90e9-e6749eb1b7f4', '078a9026-366a-43d1-93ec-87ae84839e58', 'FALL', NULL, NULL, 29, true),
    -- 135 120 R1: Rachael Magalhaes (Bogota/Ridgefield Park) 12-5 won by fall over Victoria Pooler (Boonton) 4-7 (Fall 3:43)
    (135, 70, 'championship', 'R1', '2d5ecb1c-8fe1-4d00-8699-dafbf7969083', 'cfe07a8b-17c7-4fb1-ac25-773676ce001e', 'FALL', NULL, NULL, 223, true),
    -- 135 120 R1: Chloe Page (Newton/Kittatinny) 12-16 won by fall over Sydney Bende (North Warren Reg) 5-5 (Fall 4:59)
    (135, 70, 'championship', 'R1', '4668c6b5-0696-4ba6-bcab-e556e319370e', 'acf85f47-1911-4235-906b-3c07acccefee', 'FALL', NULL, NULL, 299, true),
    -- 135 120 R1: Kailey Mount (Becton Regional/Wood-Ridge) 3-2 won by fall over Tiffany Aguilar (Cliffside Park/Ridgefield Memo
    (135, 70, 'championship', 'R1', '52be9564-808a-4f10-9a4d-734b7816aeb5', 'b007c624-08cf-43ef-8b3b-72aa08615964', 'FALL', NULL, NULL, 14, true),
    -- 135 120 R1: Perjia Dupont (Paramus Catholic) 9-7 won by decision over Violet Henderson (Vernon Township) 13-14 (Dec 4-0)
    (135, 70, 'championship', 'R1', 'd7b5eb5f-72e9-4f6e-9df1-bfea3511a5e0', '67ab916c-2eb7-4aea-8c48-f19708d54d2f', 'DEC', 4, 0, NULL, true),
    -- 135 120 R1: Mia Frasca (Lakeland Reg) 6-10 won by decision over Ruth Lara (Clifton) 12-6 (Dec 4-1)
    (135, 70, 'championship', 'R1', '31e29a3d-5efe-40c8-9eaf-d0513652c49d', '2ddfeb77-c65a-45c7-bb67-a796f5a924a9', 'DEC', 4, 1, NULL, true),
    -- 135 120 R1: Kelly Marquez (Dwight Morrow) 14-4 won by fall over Azjahnae Muhammad (Mt. Olive) 7-14 (Fall 2:00)
    (135, 70, 'championship', 'R1', 'ca32caac-402c-468d-8858-cec587680bd0', '0cac23d0-3521-4660-bb56-9d070bf3b4fb', 'FALL', NULL, NULL, 120, true),
    -- 135 120 R1: Sophia Salazar (Morris Hills) 25-8 won by fall over Sofia Hernandez (Dover) 3-10 (Fall 1:25)
    (135, 70, 'championship', 'R1', 'f893476c-e169-44eb-ac15-2cf22bf58285', '2aaf13b9-a192-47bd-8945-8a502ba83b19', 'FALL', NULL, NULL, 85, true),
    -- 135 120 R1: Kelly Varela (Passaic) 8-4 won by disqualification over Ava Eisenman (Garfield) 3-7 (DQ)
    (135, 70, 'championship', 'R1', 'a6b94de7-1942-4642-9671-d5161b22495a', 'e811386e-8edb-4ee3-8c29-d1776ea6f22e', 'DQ', NULL, NULL, NULL, true),
    -- 135 120 R1: Charlotte Mobley (Bergenfield HS) 13-14 won by fall over Cassie Wyble (High Point Regional) 3-4 (Fall 3:21)
    (135, 70, 'championship', 'R1', '1fb004a4-3ae3-4cf7-9056-d54221f725b8', 'fb991e34-f28b-4f06-a841-0385dd1a8073', 'FALL', NULL, NULL, 201, true),
    -- 135 126 R1: Rebecca Garcia (Northern Valley Regional (Demarest) HS) 20-7 won by fall over Samara Monahan (Clifton) 10-6 (F
    (135, 71, 'championship', 'R1', 'cf006855-c229-4d79-8fc5-d00f5271eb9f', '71106aec-74af-4738-9ea7-333ee67c805c', 'FALL', NULL, NULL, 224, true),
    -- 135 126 R1: Brooke Post (Lakeland Reg) 8-10 won by fall over Ava Hosonitz (Lenape Valley H.S.) 13-6 (Fall 3:40)
    (135, 71, 'championship', 'R1', 'a2984705-f5ac-4bc4-b633-9d24e6dc9776', '2eee827e-9135-4222-a3ef-e69419f4095f', 'FALL', NULL, NULL, 220, true),
    -- 135 126 R1: Polina Shardakova-Scorzafava (Kinnelon) 30-7 won by fall over Sabrina Jean Baptiste (Montclair) 5-10 (Fall 1:4
    (135, 71, 'championship', 'R1', '5e76d627-2d48-4442-b80c-c8cb29bd4c1c', '6e18ba32-3583-4d25-ab07-7df9aab92efc', 'FALL', NULL, NULL, 100, true),
    -- 135 126 R1: Fiona Gough (Wayne Valley) 12-4 won by fall over Astrid Morales (Mahwah) 2-21 (Fall 0:16)
    (135, 71, 'championship', 'R1', 'fd153fb5-ab0c-411f-a1db-f66d446c8f93', 'd3f4e350-22c4-48e4-9aa9-1b07c1de7f38', 'FALL', NULL, NULL, 16, true),
    -- 135 126 R1: Faustyna Przedworski (Garfield) 14-3 won by fall over Bella Vogler (High Point Regional) 3-2 (Fall 3:35)
    (135, 71, 'championship', 'R1', '8eae750c-842c-468a-8c66-60203a69b349', '5d544c7e-cc20-461b-bea5-e6ebf020e4f0', 'FALL', NULL, NULL, 215, true),
    -- 135 126 R1: Alyssa Aiello (Jefferson TWP) 12-7 won by fall over Aleida Garcia (Dover) 5-4 (Fall 2:52)
    (135, 71, 'championship', 'R1', '311051b6-0e56-4317-b8f0-0e272ffb2c15', '5a0a7744-8e18-4acd-9fb0-39838e7478d1', 'FALL', NULL, NULL, 172, true),
    -- 135 126 R1: Elizabeth Panuccio (Ramsey) 23-5 won by fall over Daraly Estevez (Passaic) 5-12 (Fall 1:20)
    (135, 71, 'championship', 'R1', '01c6d9bc-7aa3-49ef-b629-b920e390207f', 'e71d8bd4-0608-4a4f-8a88-181ee27005ba', 'FALL', NULL, NULL, 80, true),
    -- 135 126 R1: Sadie Collins (Vernon Township) 15-11 won by fall over Tania Ayala Rosas (Passaic Co Tech-Voc) 12-9 (Fall 5:11
    (135, 71, 'championship', 'R1', 'a353101b-5b7b-40de-a075-1a6ca3487cdc', '8c3e7ea4-d73e-4b54-8e62-6e73d717ebcf', 'FALL', NULL, NULL, 311, true),
    -- 135 126 R1: Molly Smyth (Mt. Olive) 19-3 won by decision over Nico Roa (Manchester Regional) 3-2 (Dec 4-0)
    (135, 71, 'championship', 'R1', 'd1b149da-e775-474f-9239-ee9b2768ea54', 'a02ed79c-0fac-46a1-b67c-9eacb6151cef', 'DEC', 4, 0, NULL, true),
    -- 135 126 R1: Sydney Murri (Fair Lawn) 17-4 won by fall over Genesis Acosta Soto (Parsippany Hills High School) 8-19 (Fall 1
    (135, 71, 'championship', 'R1', '3cf509f7-6667-4550-914a-e5afc0cb07c9', 'dc8a05df-a2d2-4f05-be06-f13dc2a7faba', 'FALL', NULL, NULL, 67, true),
    -- 135 126 R1: Alexa Ciliotta (Montville Township High School) 19-2 won by fall over Lauren Fouche (Pascack Valley School) 3-
    (135, 71, 'championship', 'R1', 'a03b8b85-946d-497d-b24e-7c39470cab15', 'e69153f6-0858-4a5d-a8ed-57701afdf3aa', 'FALL', NULL, NULL, 42, true),
    -- 135 126 R1: Emma Eigner (Newton/Kittatinny) 20-10 won by fall over Daniella Aragon (Cliffside Park/Ridgefield Memorial) 5-
    (135, 71, 'championship', 'R1', '070bf164-618f-464a-ac9b-d660a91e94d9', 'a970d615-e8ad-448e-809c-1f0a41b0b05f', 'FALL', NULL, NULL, 188, true),
    -- 135 126 R1: Phoebe Abboud (Morris Hills) 19-13 won by decision over Charlotte Flatt (Wallkill Valley Regional) 13-9 (Dec 5
    (135, 71, 'championship', 'R1', '90225c7c-5bfd-4f94-bd31-13cdcfe2e9a2', '6a634f12-35f7-450a-b610-b954e06255ad', 'DEC', 5, 0, NULL, true),
    -- 135 132 R1: Abigail Bloxham (Newton/Kittatinny) 11-10 won by fall over Jimena Rodriguez (Mt. Olive) 8-8 (Fall 5:36)
    (135, 72, 'championship', 'R1', '3fe133eb-eda9-4a34-9d8f-0b6a00bf042d', '8a7ab749-70e7-4c06-bc2f-68daabcce8cc', 'FALL', NULL, NULL, 336, true),
    -- 135 132 R1: Leia Lumba (Lyndhurst/North Arlington) 9-3 won by fall over Callahan Christy (Mountain Lakes) 3-5 (Fall 2:00)
    (135, 72, 'championship', 'R1', 'c329469d-d289-4b43-be2b-5d1cf26ff4d8', '5f85f97c-e0f1-4ced-b839-63fe9046f00f', 'FALL', NULL, NULL, 120, true),
    -- 135 132 R1: Melodie guzik-upchurch (Vernon Township) 24-5 won by fall over vanessa Colon (Ramsey) 8-13 (Fall 0:49)
    (135, 72, 'championship', 'R1', 'a7410cba-598b-4311-ac65-fc026f91b105', 'ee79f9e8-42a6-4bc1-ba7c-d986c0dad230', 'FALL', NULL, NULL, 49, true),
    -- 135 132 R1: Lauren Finkle (Passaic Co Tech-Voc) 24-8 won by fall over Samantha Lara Nuesi (Lakeland Reg) 3-9 (Fall 1:23)
    (135, 72, 'championship', 'R1', '50785630-0325-46dc-83cf-09223c76c709', 'ae20a07b-b79f-4adb-81e8-96a01912191c', 'FALL', NULL, NULL, 83, true),
    -- 135 132 R1: Ana Gazzola Olmos (Fair Lawn) 3-6 won by fall over Nadine Abdel-Razek (Leonia/Palisades Park) 8-3 (Fall 4:36)
    (135, 72, 'championship', 'R1', '1212a34d-0b81-4427-96ea-77d7f695b464', '1cbd2037-8649-44d8-aff4-2e433f6731eb', 'FALL', NULL, NULL, 276, true),
    -- 135 132 R1: Erica Vasquez (Paramus Catholic) 6-4 won by decision over Diana Baquero (Cliffside Park/Ridgefield Memorial) 4
    (135, 72, 'championship', 'R1', '51a1bfec-af05-432f-94f0-92bf557bef55', '2bd64c20-5338-4c5b-b47a-b83c84019eea', 'DEC', 11, 6, NULL, true),
    -- 135 132 R1: Mia Spadavecchia (Westwood) 12-7 won by fall over Sarah Atila (Northern Valley Regional (Old Tappan) HS) 1-6 (
    (135, 72, 'championship', 'R1', 'b095d293-27b4-4b92-9f76-ea77e40a9d25', '2aa9975f-39d6-48e8-9571-d4e4fd42848a', 'FALL', NULL, NULL, 44, true),
    -- 135 132 R1: Jacqueline Sloan (West Milford Township) 18-7 won by fall over Katherine Mijangos (Eastside ( Paterson)) 0-1 (
    (135, 72, 'championship', 'R1', '9aadab42-0cb4-4b42-8b14-92a54af434c1', 'a6e1b313-ed0a-490c-972a-2989a56ed21e', 'FALL', NULL, NULL, 45, true),
    -- 135 132 R1: Addyson Agens (Belvidere) 13-7 won by fall over Leah Romash (High Point Regional) 5-7 (Fall 1:16)
    (135, 72, 'championship', 'R1', '8ad04c95-b583-485b-bc2e-d1c97769753d', '74d39fc4-361f-4ba8-8eed-1c6cd4d08dbc', 'FALL', NULL, NULL, 76, true),
    -- 135 132 R1: Ava Vanderbeek (Mahwah) 18-8 won by fall over Janelly Lemus (Dwight Morrow) 2-8 (Fall 1:04)
    (135, 72, 'championship', 'R1', 'a47c58df-0937-4827-923c-9073f068cd48', '1199bd01-0d11-4f68-b052-fde263797853', 'FALL', NULL, NULL, 64, true),
    -- 135 132 R1: Olivia Fisher (Wallkill Valley Regional) 16-7 won by fall over Anahi Nava-Maceda (Parsippany Hills High School
    (135, 72, 'championship', 'R1', 'fcc8493f-e27a-452c-8642-abe299331767', '2a583814-e0d7-48a8-bf6e-4329f21b60cf', 'FALL', NULL, NULL, 100, true),
    -- 135 132 R1: Lily Massenzio (Depaul Catholic) 17-0 won by fall over Valeria Elao (Morris Hills) 6-13 (Fall 1:55)
    (135, 72, 'championship', 'R1', 'c69815e2-7556-442e-b523-7fc3435c8833', 'dae744cf-ac6c-4fc4-83dd-04d9e296b779', 'FALL', NULL, NULL, 115, true),
    -- 135 132 R1: Carolina Estrada (Bogota/Ridgefield Park) 9-3 won by fall over Victoria Francois (Becton Regional/Wood-Ridge) 
    (135, 72, 'championship', 'R1', '0b71dc8b-83d6-4aa2-ab98-0b6b978742f0', '97881479-af6b-41c7-8f7e-bf0703b93058', 'FALL', NULL, NULL, 98, true),
    -- 135 132 R1: Jennifer Torres (Elmwood Park) 10-7 won by fall over Jess Guerra (Lenape Valley H.S.) 12-15 (Fall 2:54)
    (135, 72, 'championship', 'R1', 'a4a24dec-66d1-4210-a340-6f1cf30999c1', '6557cd2f-8aef-473f-8824-51d055bd49ce', 'FALL', NULL, NULL, 174, true),
    -- 135 138 R1: Nanette Randall (Leonia/Palisades Park) 5-5 won by fall over Ariana Canipe (West Milford Township) 7-9 (Fall 2
    (135, 73, 'championship', 'R1', '20a87ec4-8131-4dd1-b640-7cd7d5eee2c3', 'd5b449bb-22c2-49d8-81e2-c8443c859e71', 'FALL', NULL, NULL, 145, true),
    -- 135 138 R1: Ester Teixiera (Morris Hills) 21-9 won by fall over Olivia Evans (Fair Lawn) 5-10 (Fall 1:13)
    (135, 73, 'championship', 'R1', '005be7cb-5d53-4669-85c6-9215dd6c5eb1', '8aa51828-185b-48b1-a7be-90abd8ed83c6', 'FALL', NULL, NULL, 73, true),
    -- 135 138 R1: Gabriella Santiago (Mahwah) 15-10 won by major decision over emma cabrera (Ramsey) 9-15 (MD 13-2)
    (135, 73, 'championship', 'R1', 'a35e91dd-f314-481c-bb40-86bfdbd761d1', 'eab37835-da12-4f77-b14d-5ba5192bddf8', 'MD', 13, 2, NULL, true),
    -- 135 138 R1: Harley Ojeda (Wallkill Valley Regional) 8-6 won by fall over Samantha Faustino (Passaic) 4-9 (Fall 3:44)
    (135, 73, 'championship', 'R1', '7bb8c5dd-043f-4061-939c-ad5c30f9ae83', '3386df1e-61ec-490c-9cbe-dba661408507', 'FALL', NULL, NULL, 224, true),
    -- 135 138 R1: Gabriela Villafana (High Point Regional) 7-5 won by fall over Isabella Gomero (Bogota/Ridgefield Park) 4-3 (Fa
    (135, 73, 'championship', 'R1', '56217b77-92df-42d3-afa8-51b175e0d40f', '2d1d8d57-fd41-42a0-9e6c-ed0744744808', 'FALL', NULL, NULL, 359, true),
    -- 135 145 R1: Alexa Huitzil (Passaic) 8-11 won by major decision over Bria Beshada (Newton/Kittatinny) 6-19 (MD 15-5)
    (135, 74, 'championship', 'R1', 'b2673e20-0951-40a9-ac48-e5f8f9dacae4', 'f9ec98df-c6d9-40ae-9670-6d6f89b8058b', 'MD', 15, 5, NULL, true),
    -- 136 100 R1: Jada Pinzon (North Plainfield) 12-14 won by fall over Alani Garcia (Bloomfield) 5-13 (Fall 2:23)
    (136, 67, 'championship', 'R1', '29935e95-fe19-48ae-ae70-c606f19f2be8', 'd067d531-37f8-41cf-be80-5ef301075ded', 'FALL', NULL, NULL, 143, true),
    -- 136 100 R1: Leslie Vera (Plainfield) 4-11 won by decision over Stacy Diaz (Linden) 14-16 (Dec 16-12)
    (136, 67, 'championship', 'R1', '59dca559-56ac-45c7-8b0f-674ba27709b1', 'f24af3d1-e7f6-4d00-8d98-2b677cfecba4', 'DEC', 16, 12, NULL, true),
    -- 136 100 R1: Sophia Marcovecchio (Scotch Plains-Fanwood) 8-13 won by decision over Mia Meneses (Elizabeth) 5-4 (Dec 15-14)
    (136, 67, 'championship', 'R1', 'f582dab4-7d4b-4c09-ae84-c353d96ed5a5', '0ca3f5fa-e473-4c4a-9360-3d07208c3878', 'DEC', 15, 14, NULL, true),
    -- 136 107 R1: Gianna Culver (New Providence) 1-1 won by decision over Carlie Gleason (Scotch Plains-Fanwood) 11-12 (Dec 6-5)
    (136, 68, 'championship', 'R1', '98093142-0f45-4c6c-a29b-c52c034dbd43', 'b2cfea1b-2cbd-46f5-a53c-b7abf334e0f8', 'DEC', 6, 5, NULL, true),
    -- 136 107 R1: Kashmera Williams (North Star Academy) 4-5 won by fall over Neela Myers (Metuchen) 1-8 (Fall 3:52)
    (136, 68, 'championship', 'R1', '5ac037b6-f5ca-4832-861d-ce54f4e58fee', 'a12e661f-64f6-45ee-9ebf-18c7f59642f2', 'FALL', NULL, NULL, 232, true),
    -- 136 107 R1: Dasha Flores (West Orange) 2-4 won by fall over Shaylin Perry (Phillipsburg) 0-17 (Fall 2:29)
    (136, 68, 'championship', 'R1', '86824b6a-d1b2-4269-83fe-63211f10c31d', '79d64da3-eb84-4f13-ac64-06c407580dd8', 'FALL', NULL, NULL, 149, true),
    -- 136 107 R1: Saanvi Saxena (Millburn) 12-5 won by fall over Ana Jireth Menjivar Rojas (North Plainfield) 11-16 (Fall 1:59)
    (136, 68, 'championship', 'R1', '5a878acd-35f4-4372-b1be-25362f8a085f', '5a3b14d6-7807-4911-b3fe-126028c16a38', 'FALL', NULL, NULL, 119, true),
    -- 136 107 R1: Adelaide Reist (Saint Thomas Aquinas) 13-13 won by tech. fall over Hayden Wagner (Delaware Valley Regional) 4-
    (136, 68, 'championship', 'R1', '382468f3-bb7c-45c6-b6a0-0c259641482b', '787ced40-c3bb-48b8-900f-0863a9bd4757', 'TF-1', 17, 0, 0, true),
    -- 136 114 R1: Kerlyn Pillacela Fernandez (North Plainfield) 10-17 won by fall over Lucia Giunta (Belleville) 1-9 (Fall 3:02)
    (136, 69, 'championship', 'R1', 'f6cf388e-5f80-410c-b28f-ca3ed792694e', '7d17dd6d-d4fe-4620-8522-61f4348cd91c', 'FALL', NULL, NULL, 182, true),
    -- 136 114 R1: Laylah Pennington (Plainfield) 10-5 won by tech fall over Aylin Ojeda (Orange) 8-9 (TF-1.5 0:00 (21-4))
    (136, 69, 'championship', 'R1', '7a10408e-9ad2-4b0b-87e9-89dd53176ad3', '32dd4737-1f57-454f-b1cb-b373b11e52cd', 'TF-1.5', 21, 4, 0, true),
    -- 136 114 R1: Angelina Mejia (Elizabeth) 11-3 won by fall over Kamea Dahuya (Watchung Hills Regional) 9-8 (Fall 1:20)
    (136, 69, 'championship', 'R1', '6dc79036-f244-46f1-8964-568a689a009a', '76a5b708-7123-4f34-9330-6e87f917edd7', 'FALL', NULL, NULL, 80, true),
    -- 136 114 R1: Mave Perry (North Hunterdon) 21-12 won by fall over Jazmine Castro (New Providence) 0-1 (Fall 5:44)
    (136, 69, 'championship', 'R1', '50bbf74c-12e2-44bd-894c-1273f1e4627f', 'effa3853-4007-4e4d-9d8a-bd9221921c26', 'FALL', NULL, NULL, 344, true),
    -- 136 114 R1: Julia Cardoso (Kearny) 10-6 won by fall over Emy Reyes-Enriquez (Highland Park) 5-8 (Fall 3:38)
    (136, 69, 'championship', 'R1', '091eaa2f-c94b-459f-8a0c-4b6773cc04a5', 'f2e0e1f8-35dc-4d53-b1db-dcbda61da672', 'FALL', NULL, NULL, 218, true),
    -- 136 114 R1: Estrella Rijo Brito (Perth Amboy) 15-12 won by fall over Mariana Cepeda-Morel (Carteret) 5-8 (Fall 0:36)
    (136, 69, 'championship', 'R1', '356cec25-5c8e-4c6f-bb51-36e70ab8ca7e', '65670982-795b-44b4-9cfe-a03b9cbbcceb', 'FALL', NULL, NULL, 36, true),
    -- 136 114 R1: Annabelle Toye (Delaware Valley Regional) 9-9 won by decision over Paige Karp (Bridgewater-Raritan) 6-5 (Dec 6
    (136, 69, 'championship', 'R1', 'f82ced6a-3ca6-4f7a-8fac-d919adc6b3e2', '487ed868-de1c-433c-b533-e4549262a600', 'DEC', 6, 4, NULL, true),
    -- 136 114 R1: Liana Rodriguez (Roselle Park) 17-9 won by decision over Arianna Gorab (Warren Hills) 11-24 (Dec 11-8)
    (136, 69, 'championship', 'R1', '1f7b3778-fc97-47e2-839d-96137777f6e8', 'b73366d4-f6a3-46c9-ad42-01ea8912a803', 'DEC', 11, 8, NULL, true),
    -- 136 114 R1: Mrunal Patil (John P. Stevens) 8-4 won by fall over Alexandra Morim (Rahway) 9-19 (Fall 2:55)
    (136, 69, 'championship', 'R1', '9761496e-e950-4607-b956-56dbbf95c2c7', '17329485-15d7-4387-a047-9001c2e0d1cb', 'FALL', NULL, NULL, 175, true),
    -- 136 120 R1: Zofia Vargas (Plainfield) 5-9 won by fall over Brynn Hines (Madison) 6-12 (Fall 0:38)
    (136, 70, 'championship', 'R1', '8eb007c0-e29f-4fe4-8c0d-fe6d9ff4a938', 'e0b60ed0-2495-4fcd-a79c-50f70b68feb3', 'FALL', NULL, NULL, 38, true),
    -- 136 120 R1: Emma White (North Hunterdon) 16-15 won by fall over Audrina Carlo (Perth Amboy) 6-17 (Fall 2:36)
    (136, 70, 'championship', 'R1', '5f7c2aa9-984e-4d6b-9437-1a669541d21c', 'd4fd1f4f-a51d-4428-b29c-cbc5bb5b0832', 'FALL', NULL, NULL, 156, true),
    -- 136 120 R1: Jennie Pruss (Phillipsburg) 7-13 won by decision over Leslie Llivicota (Newark Academy) 2-7 (Dec 9-3)
    (136, 70, 'championship', 'R1', 'ee50accd-efa5-41cb-a991-bb3f2b2785cf', '662209bb-9b07-4762-9cb2-843dfa01c3f9', 'DEC', 9, 3, NULL, true),
    -- 136 126 R1: Aniyah Garcia (Saint Thomas Aquinas) 13-11 won by fall over Scarlet Caragan (Morristown) 7-5 (Fall 5:20)
    (136, 71, 'championship', 'R1', '3eab044a-88a6-4f1e-a4da-ec73cb68e9f6', '054edfa0-23a9-46b8-9dcb-e6c4b5ecf2a6', 'FALL', NULL, NULL, 320, true),
    -- 136 126 R1: Charlize Hayes (Bayonne) 13-8 won by tech fall over Bri`on Franklin (North Star Academy) 4-5 (TF-1.5 0:00 (15-
    (136, 71, 'championship', 'R1', '224b9cf4-6f9b-4516-95c8-1131b69546a6', 'ffc53113-94ad-47b9-8fc3-59257336a438', 'TF-1.5', 15, 0, 0, true),
    -- 136 126 R1: Maria Garcia (Elizabeth) 6-7 won by fall over Brooke Obiedzinski (North Hunterdon) 3-14 (Fall 1:33)
    (136, 71, 'championship', 'R1', 'a971b355-82b4-4ca9-8863-99d6697c0971', 'c6c69557-4351-45ba-94af-8a69aabcbe42', 'FALL', NULL, NULL, 93, true),
    -- 136 126 R1: Yarilenny Moronta (Perth Amboy) 16-9 won by fall over Birthja Suffrin (Linden) 16-18 (Fall 1:57)
    (136, 71, 'championship', 'R1', '466a6647-f5d1-4a42-97f6-e3792552550b', '31063b52-bd6c-4eef-a659-129c78cdb276', 'FALL', NULL, NULL, 117, true),
    -- 136 132 R1: Tiffany Guanoquiza Restrepo (Belleville) 10-10 won by fall over Sharon Davila Ruiz (Piscataway High School) 8-
    (136, 72, 'championship', 'R1', 'c36e3db2-a5ff-4665-a792-df76452baac1', '3dfe625c-e50e-4f4b-999f-55f114435ddb', 'FALL', NULL, NULL, 306, true),
    -- 136 132 R1: Isabella McGarry (JFK/Woodbridge/Colonia) 18-9 won by fall over Tamara Merilan (Linden) 6-11 (Fall 1:36)
    (136, 72, 'championship', 'R1', '777bf9e9-8e3d-4e8a-963d-87e3d02db49b', '5103175e-7390-4c33-aa00-16949256b1f4', 'FALL', NULL, NULL, 96, true),
    -- 136 132 R1: Daniela Fasca-Morales (Bayonne) 11-6 won by fall over Kathleen Ramos (Elizabeth) 3-6 (Fall 3:28)
    (136, 72, 'championship', 'R1', '31c569c0-3bcf-4507-a304-bf5ff819adc7', 'be3daf63-9894-40a3-a9df-f63b3e250b10', 'FALL', NULL, NULL, 208, true),
    -- 136 138 R1: Alina Sahal (Roselle Park) 13-8 won by fall over Fiona Larkin (North Hunterdon) 5-10 (Fall 2:20)
    (136, 73, 'championship', 'R1', '1f496250-ef71-4b36-bfc6-ff8f486963e5', '82569260-8609-4e7c-8653-8e7619d3c870', 'FALL', NULL, NULL, 140, true),
    -- 136 138 R1: Shilah Dickerson (Belleville) 7-8 won by fall over Valerie Cumakova (Union) 0-1 (Fall 3:21)
    (136, 73, 'championship', 'R1', '87a1c27a-53a2-44e4-8b60-d7980c03459f', '1e372b14-1014-43e6-bbd5-174594127458', 'FALL', NULL, NULL, 201, true),
    -- 136 138 R1: Mia Sanchez-Balzac (Franklin) 12-11 won by fall over Grace deVelder (Hunterdon Central Reg) 11-18 (Fall 1:09)
    (136, 73, 'championship', 'R1', '2d989801-ba45-459a-8df0-14cc89f3c608', '2a58880f-d5f7-4de7-9ec1-a32655f08729', 'FALL', NULL, NULL, 69, true),
    -- 136 138 R1: Perla Gutierrez (Perth Amboy) 8-15 won by fall over Maya Mohammed (North Plainfield) 15-14 (Fall 1:31)
    (136, 73, 'championship', 'R1', '327d869b-2631-444d-b701-f5135b8e9a67', '428e9126-f810-4c9b-9df1-a17c0ce3e679', 'FALL', NULL, NULL, 91, true),
    -- 136 145 R1: Rowan de Wet (Manville Hs) 8-8 won by fall over Malani Sabolchick (Saint Thomas Aquinas) 6-9 (Fall 3:35)
    (136, 74, 'championship', 'R1', 'b138abc9-45ea-4f36-a97c-1031667ee55c', '12848fb4-1df4-47ee-82e0-c344cd6723fa', 'FALL', NULL, NULL, 215, true),
    -- 136 145 R1: Aslan Beneszewski (Warren Hills) 9-21 won by fall over Jessica Calle (JFK/Woodbridge/Colonia) 1-21 (Fall 1:45)
    (136, 74, 'championship', 'R1', '0eee4209-17d5-404f-9a4b-84bc4f32949c', '42ac9feb-585d-4535-a3d5-11b1465d19da', 'FALL', NULL, NULL, 105, true),
    -- 136 145 R1: Samantha Laguna-Cano (Middlesex/Dunellen) 1-1 won by fall over Giana Devizio (Roselle Park) 7-13 (Fall 3:31)
    (136, 74, 'championship', 'R1', '45ac8b82-b331-4f95-a7af-a52b60f13009', '164c5ed4-070a-4c04-a48a-e0c592483e2e', 'FALL', NULL, NULL, 211, true),
    -- 136 152 R1: Leyley Franchia (Scotch Plains-Fanwood) 10-9 won by fall over Yurri Hines-Wade (Phillipsburg) 11-15 (Fall 0:24
    (136, 75, 'championship', 'R1', '0b5e644f-e0e5-4bc3-a78c-07760601af19', '330b8898-880e-45d0-9e88-b431faaed8a2', 'FALL', NULL, NULL, 24, true),
    -- 136 152 R1: Jaylind Gonzalez (Rahway) 18-15 won by fall over Emily Aguilar Herrera (Franklin) 5-13 (Fall 2:13)
    (136, 75, 'championship', 'R1', 'b5d996e3-3b80-4dcf-a640-a3359b5cbbdb', '99366b56-9a12-4e75-90b6-4711984bd792', 'FALL', NULL, NULL, 133, true),
    -- 136 152 R1: Ashna Patel (Hunterdon Central Reg) 14-15 won by decision over Sara Abraham-Winkler (Millburn) 7-6 (Dec 4-2)
    (136, 75, 'championship', 'R1', 'ce142dbc-bd98-4f1b-a34b-a0c1a86eb3c5', '8c58e9ae-6485-4daf-9a5c-8d016f49d7fd', 'DEC', 4, 2, NULL, true),
    -- 136 152 R1: Grace Artola (Middlesex/Dunellen) 1-1 won by decision over Jailynn Robinson (West Orange) 0-6 (Dec 6-5)
    (136, 75, 'championship', 'R1', 'f48f7c97-c701-4e70-86f5-4edbb1269920', 'b3203ffa-0d0d-4991-b5fb-c54b06d6dcaa', 'DEC', 6, 5, NULL, true),
    -- 136 152 R1: Sofia Pedroso (Saint Thomas Aquinas) 12-11 won by fall over Madison Belton (Hanover Park Hs) 3-6 (Fall 3:52)
    (136, 75, 'championship', 'R1', '5a123719-6831-45b5-be15-fc43bb27b316', 'd9a93cd1-c468-4f9d-bfe6-db7fc15b293f', 'FALL', NULL, NULL, 232, true),
    -- 136 185 R1: Kayla Melsky (Phillipsburg) 10-19 won by decision over Ivanna Mendez (Linden) 10-15 (Dec 3-0)
    (136, 77, 'championship', 'R1', 'c8a455da-d6b8-4387-bbc9-84fe20017fc1', '85dc0e0a-e47a-4ed7-bde8-3ea1ee512b0b', 'DEC', 3, 0, NULL, true),
    -- 136 185 R1: Juliana Dowling (Scotch Plains-Fanwood) 6-12 won by decision over Victoria Kidd-Maxey (JFK/Woodbridge/Colonia)
    (136, 77, 'championship', 'R1', 'f819a72c-93a9-4830-9a24-fe705e4ff947', '3b5847c4-5c5d-435c-936f-8678fbf2381f', 'DEC', 4, 1, NULL, true),
    -- 134 100 R1: Victoria Longo (North Brunswick Township) 20-12 won by fall over Deeksha Seelam (West Windsor-Plainsboro South
    (134, 67, 'championship', 'R1', 'e6e27483-be9d-4174-8cd1-3c02df9f8833', 'f684dd59-93cc-43c3-a370-48536cfd2c0d', 'FALL', NULL, NULL, 55, true),
    -- 134 100 R1: Samantha Larkin (Old Bridge) 23-9 won by fall over Maya Trinidad (Bordentown Regional/Florence Township) 5-14 
    (134, 67, 'championship', 'R1', '687ec938-33be-430f-b69c-b686f720a4b4', 'f9526e78-2fad-4cfe-94fb-358c7c928916', 'FALL', NULL, NULL, 37, true),
    -- 134 100 R1: Khrissy Oliveira (Long Branch) 5-7 won by fall over Izzie Nemeth (Notre Dame) 5-11 (Fall 3:16)
    (134, 67, 'championship', 'R1', '6313de11-e803-4d9e-84d3-68b3411a3d0c', 'af8c41eb-04b6-4874-9263-e7ee437e544c', 'FALL', NULL, NULL, 196, true),
    -- 134 100 R1: Layla Lubrano-Lavadera (Freehold Borough) 2-13 won by decision over Julihana Fuentes (Ewing) 3-15 (Dec 13-8)
    (134, 67, 'championship', 'R1', 'ed0604e2-2887-4765-bd45-090972d1fd6c', '439e28fb-9e3a-454d-ab0a-23159c96d601', 'DEC', 13, 8, NULL, true),
    -- 134 100 R1: Lara Bahr (Princeton) 9-5 won by decision over Suwati Malik (Hightstown) 11-5 (Dec 16-11)
    (134, 67, 'championship', 'R1', 'affa9f92-1e43-46f4-bc3a-4d936ace16aa', '362727bc-ea3a-4f0c-abaa-6052d8fe5081', 'DEC', 16, 11, NULL, true),
    -- 134 100 R1: Ariella Guzman (Raritan) 13-19 won by decision over Gloria Alvarez (Trenton Central) 7-8 (Dec 4-2)
    (134, 67, 'championship', 'R1', '3a8dfce6-3c9f-4d6b-8c5f-f7e9f9a7857d', '9274512c-2439-414f-b539-4d0616f60000', 'DEC', 4, 2, NULL, true),
    -- 134 100 R1: Stella Kramer (Lawrence Senior) 27-4 won by tech fall over Kayley Robles (New Brunswick) 10-7 (TF-1.5 5:53 (17
    (134, 67, 'championship', 'R1', 'f539d7fa-43f5-4766-9569-abfd1351e257', '4c763aa8-aa19-4557-8caa-39eb975ca42d', 'TF-1.5', 17, 1, 353, true),
    -- 134 100 R1: Karla Salguero (Hamilton West) 11-12 won by fall over Cassieann James (East Brunswick H.S.) 11-13 (Fall 1:20)
    (134, 67, 'championship', 'R1', '7e75c918-4462-4329-9345-6ac1ccaf727c', 'dda91469-e0d3-4535-b2e7-92ef9722061e', 'FALL', NULL, NULL, 80, true),
    -- 134 100 R1: Juliette Halpin (West Windsor-Plainsboro North) 12-7 won by fall over Emily Alvarado (Wall Hs) 6-9 (Fall 2:25)
    (134, 67, 'championship', 'R1', 'faef6683-3425-4cd8-894b-f3607486b788', '233c644f-9148-4cca-a49e-401579fd7e9d', 'FALL', NULL, NULL, 145, true),
    -- 134 107 R1: Hannah Jang (Marlboro) 14-15 won by fall over Nadiea Mohsin (Bordentown Regional/Florence Township) 4-10 (Fall
    (134, 68, 'championship', 'R1', '309cf00d-b9a9-4c43-8b47-d14bea32fdf6', '4e8f72c8-d1e0-45d0-b5a9-dcae1d9203a6', 'FALL', NULL, NULL, 33, true),
    -- 134 107 R1: Madison Magrino (Old Bridge) 19-13 won by fall over Emily Lazo-Cruz (Neptune) 0-1 (Fall 2:51)
    (134, 68, 'championship', 'R1', '45c85e54-b49b-44a7-b758-27338ce03d1c', '88362daa-19c4-4e20-ab73-cd4cc26ee002', 'FALL', NULL, NULL, 171, true),
    -- 134 107 R1: Maite Balbuena (New Brunswick) 6-13 won by fall over Heidi Bonilla-Santiago (Red Bank Regional) 2-6 (Fall 2:10
    (134, 68, 'championship', 'R1', '8d45c3fc-ce4c-4767-aa80-89d802a0c3de', '4e57607d-b2d6-4c27-9606-6453cc9657d3', 'FALL', NULL, NULL, 130, true),
    -- 134 107 R1: Ridhi Gupta (West Windsor-Plainsboro South) 10-10 won by decision over Leslie Velecela (Hightstown) 10-7 (Dec 
    (134, 68, 'championship', 'R1', '975d9627-d8ff-43bc-bc04-eb80aa16a27d', '535ee9b6-50c1-4b29-a099-51e6a5a10d1f', 'DEC', 7, 3, NULL, true),
    -- 134 107 R1: Rachel Springer (Hopewell Valley Hs) 2-1 won by fall over Vidhi Bharat Agarwal (West Windsor-Plainsboro North)
    (134, 68, 'championship', 'R1', '70724326-dbd4-40b6-ad94-0ada88003508', '5e478c14-6ba1-4012-81df-8678b4df2f81', 'FALL', NULL, NULL, 76, true),
    -- 134 107 R1: Amaya Ar-Raheem (North Brunswick Township) 10-19 won by major decision over Madison Burgos (Raritan) 8-20 (MD 
    (134, 68, 'championship', 'R1', '0be6a747-79de-4df1-bc2d-fa51cd044d9d', 'ad5c41c6-b9b1-444e-be8b-1de9344a7434', 'MD', 16, 8, NULL, true),
    -- 134 107 R1: Yuridia Figueroa (Lakewood) 11-14 won by fall over Cindy Garcia (Wall Hs) 1-10 (Fall 4:45)
    (134, 68, 'championship', 'R1', '58dbfb3e-35fa-43bd-a455-f40ac16f5f88', '5d14538b-cfb5-4c83-adfb-8811fc5baaa4', 'FALL', NULL, NULL, 285, true),
    -- 134 107 R1: Juleysi Diaz (Freehold Borough) 4-7 won by decision over Leisy Pinos Gomz (Lawrence Senior) 7-21 (Dec 8-2)
    (134, 68, 'championship', 'R1', '9f8f1a10-fdb8-422a-a7ea-796eb063e4b9', 'df320ba5-4106-42d3-98c5-db3dc5708b2f', 'DEC', 8, 2, NULL, true),
    -- 134 114 R1: Aryanna Lake (Manalapan) 5-5 won by fall over Janaea Brown (Raritan) 6-23 (Fall 1:11)
    (134, 69, 'championship', 'R1', 'a21017a9-a212-4176-8f2b-f46097c167c0', 'afc537c4-1ab5-497f-9273-78f560fd5c00', 'FALL', NULL, NULL, 71, true),
    -- 134 114 R1: Kaitlyn Enciso (Robbinsville) 6-7 won by fall over Francis Peraza (North Brunswick Township) 15-14 (Fall 1:41)
    (134, 69, 'championship', 'R1', '7567915e-6e03-407e-8c62-4d29763ced46', '90e4a63c-c0f1-40c1-9922-602ea42df91a', 'FALL', NULL, NULL, 101, true),
    -- 134 114 R1: Yu Fan (Holmdel) 11-3 won by fall over Madison Ladao (Matawan Reg) 3-5 (Fall 5:45)
    (134, 69, 'championship', 'R1', '7a063822-56e2-4a90-bb01-b98eef2d6dc2', '72ae5a36-0487-43bd-b11f-28f48bbb9609', 'FALL', NULL, NULL, 345, true),
    -- 134 114 R1: Melinda Slous (Northern Burlington ( Columbus)) 4-3 won by fall over Janel Crosby (Lawrence Senior) 6-10 (Fall
    (134, 69, 'championship', 'R1', '652e3ded-3e14-41ee-98e1-c05849058bf5', 'ed0ddea0-d213-4d48-8486-8701c833474d', 'FALL', NULL, NULL, 64, true),
    -- 134 114 R1: Samantha Torres (Trenton Central) 15-8 won by decision over Larisa Avetisyan (Marlboro) 14-11 (Dec 5-3)
    (134, 69, 'championship', 'R1', '174c7f63-5934-4586-b772-267d8661746d', 'cf2643f1-6679-4457-903f-4994cfd36691', 'DEC', 5, 3, NULL, true),
    -- 134 114 R1: Xinlan Xu (West Windsor-Plainsboro South) 11-8 won by fall over Sinead McLoughlin (Hillsborough) 3-12 (Fall 1:
    (134, 69, 'championship', 'R1', '4467ac1b-07c2-4fae-b5fb-e999769b2a2c', '4ff12f13-5517-46fb-9103-9f4cafcb6c69', 'FALL', NULL, NULL, 61, true),
    -- 134 114 R1: Deema Saleh (Notre Dame) 3-9 won by fall over Jaina Young (East Brunswick H.S.) 4-16 (Fall 2:46)
    (134, 69, 'championship', 'R1', '6237a007-1ddc-4e31-ac4e-c000e5b4810f', 'fa613eeb-31b6-4c71-aa92-6cde9adae1dc', 'FALL', NULL, NULL, 166, true),
    -- 134 114 R1: Natale Pitti (Monroe Township) 5-4 won by fall over Julia Berk (Old Bridge) 14-13 (Fall 0:37)
    (134, 69, 'championship', 'R1', 'a7e77520-8ebb-465f-8f7d-243f1af756d6', '85ac57c3-1557-4a52-859d-e2f9a1181db5', 'FALL', NULL, NULL, 37, true),
    -- 134 114 R1: Anshu Cherukumilli (Montgomery) 8-3 won by fall over Alissa Stilwaggon (Riverside) 5-10 (Fall 1:01)
    (134, 69, 'championship', 'R1', '52118824-c7e4-4591-87a8-c5004c02be52', '9f3626fe-7006-4b54-86cc-40b7c683cf55', 'FALL', NULL, NULL, 61, true),
    -- 134 114 R1: Jasline Avila (Brick Township) 13-12 won by fall over Emma Merritt (Princeton) 5-8 (Fall 0:56)
    (134, 69, 'championship', 'R1', '19abc499-49a1-4c5e-b0ae-207086c0a03b', 'ef4e3e61-bd8f-4bf8-a407-fe6fa0ab5ed4', 'FALL', NULL, NULL, 56, true),
    -- 134 114 R1: Kaory Olvera (Red Bank Regional) 8-7 won by fall over Willa Walsh (Point Pleasant Boro) 2-11 (Fall 1:02)
    (134, 69, 'championship', 'R1', '54bb2d5f-b65d-4049-a6db-2b8a2b44f2b8', '35febd95-06b4-4557-9a28-f3ad98bce575', 'FALL', NULL, NULL, 62, true),
    -- 134 120 R1: Makena Tchir-Spence (Manalapan) 7-17 won by fall over Valeria Trujillo (Princeton) 6-14 (Fall 5:17)
    (134, 70, 'championship', 'R1', '0c3128a8-a3ec-4d0d-add8-a681df6d8b31', 'a0df6abc-212c-4a5e-90f3-839bb3a2f98e', 'FALL', NULL, NULL, 317, true),
    -- 134 120 R1: Aman Cheema (Monroe Township) 13-3 won by fall over Marybeth Maher (Red Bank Regional) 1-4 (Fall 1:38)
    (134, 70, 'championship', 'R1', '42fb260c-ca16-4000-a1d6-a9f5d146d42d', '09168660-df88-4b3d-917f-aa392e880e04', 'FALL', NULL, NULL, 98, true),
    -- 134 120 R1: Layla Rivera (Hamilton West) 16-8 won by fall over Amanda Sidoti (South Brunswick Hs) 5-17 (Fall 3:04)
    (134, 70, 'championship', 'R1', 'a242126a-9cea-4710-b49a-a5e2b63499b9', '1d296e8e-eb11-407f-8613-17bd457ec43d', 'FALL', NULL, NULL, 184, true),
    -- 134 120 R1: Avery Bergman (Hopewell Valley Hs) 18-5 won by fall over Bryanna Alves-Domingos (Riverside) 6-11 (Fall 1:25)
    (134, 70, 'championship', 'R1', '06e72693-d0dd-48cd-a8d1-33de3757f817', '51d500ca-816f-44b0-8038-7d36053312ff', 'FALL', NULL, NULL, 85, true),
    -- 134 120 R1: Averie Harmon (Middletown South) 20-9 won by decision over Cindy Ayala (Lakewood) 17-10 (Dec 7-4)
    (134, 70, 'championship', 'R1', '742692f5-4224-4b30-a210-1cedf481b1c1', '9c6b66c0-d088-478b-a6e9-908cf5c6173b', 'DEC', 7, 4, NULL, true),
    -- 134 120 R1: Yadira Rivera (Hamilton North- Nottingham) 8-13 won by fall over Genesis Martinez (New Brunswick) 8-14 (Fall 0
    (134, 70, 'championship', 'R1', '4ca438f7-7f31-41de-b4f2-b66b5994825d', 'dcc2aca4-46e6-4eae-8d3f-6a4d0f202a9f', 'FALL', NULL, NULL, 51, true),
    -- 134 120 R1: Cecilia O`Cone (Point Pleasant Beach Hs) 31-8 won by fall over Kioni Lewis (South River) 1-9 (Fall 1:20)
    (134, 70, 'championship', 'R1', 'c37d18da-71fa-4d78-a581-3f4690013036', '48a40318-0e0d-460e-a95a-e77ee6492329', 'FALL', NULL, NULL, 80, true),
    -- 134 120 R1: Maeve Witte (Freehold Township) 18-6 won by fall over Brenda Carrillo-Solano (Wall Hs) 5-10 (Fall 1:21)
    (134, 70, 'championship', 'R1', 'b8cce1da-c677-438f-8b00-179bcf4523a3', '8b38efd0-1995-4b65-b8c9-bdaddff3e2a0', 'FALL', NULL, NULL, 81, true),
    -- 134 120 R1: Jaylen Franicevich (Montgomery) 6-3 won by decision over Stella Melnikov (Old Bridge) 9-11 (Dec 17-10)
    (134, 70, 'championship', 'R1', 'f67a1cc7-682b-4fbb-bdbc-76aafd4f9a06', 'a8169949-289d-45ad-bd97-d88b65c782ef', 'DEC', 17, 10, NULL, true),
    -- 134 120 R1: Mayte Barreto (Hightstown) 9-10 won by fall over Danna Chiapa (North Brunswick Township) 11-8 (Fall 1:32)
    (134, 70, 'championship', 'R1', '31f63b07-bc97-4ff5-8dc4-11b4027dc79f', '3ba81b41-23f9-450f-9a14-d35c865d22e1', 'FALL', NULL, NULL, 92, true),
    -- 134 120 R1: Isabella Panfili (Hamilton East-Steinert) 18-10 won by fall over Heaven Sykes (Trenton Central) 15-11 (Fall 3:
    (134, 70, 'championship', 'R1', '7c84d5c0-e15a-4575-a0ba-a8ccf0b73fdd', '06e57e12-c5e8-4bb9-8098-9c7e9c1f9a70', 'FALL', NULL, NULL, 196, true),
    -- 134 120 R1: Grace Kang (West Windsor-Plainsboro South) 16-7 won by fall over Aedan Smillie (Bordentown Regional/Florence T
    (134, 70, 'championship', 'R1', '8f41cfdc-7130-44f1-a606-69fe2fba59ea', 'e4a171d0-18f0-4a7c-a50c-1d30a0d1417c', 'FALL', NULL, NULL, 339, true),
    -- 134 120 R1: Emily Cuomo (East Brunswick H.S.) 17-14 won by decision over Genesis Erroa (Howell) 7-13 (Dec 10-7)
    (134, 70, 'championship', 'R1', '7030ce4f-b482-4f55-bb23-4526f7609644', '3c318752-9746-4bcc-91f1-0ad7b40a5133', 'DEC', 10, 7, NULL, true),
    -- 134 120 R1: Rodaina Elshafey (Marlboro) 20-8 won by fall over Erin Welch (Point Pleasant Boro) 8-11 (Fall 0:51)
    (134, 70, 'championship', 'R1', '571e9629-06dd-4551-a96a-f277ae4b4a86', 'bb2cada9-1b4d-431d-bd1a-97687215066a', 'FALL', NULL, NULL, 51, true),
    -- 134 126 R1: Jaelyn Villalobos (Howell) 14-19 won by fall over Naysha Rivera (Freehold Borough) 10-8 (Fall 3:09)
    (134, 71, 'championship', 'R1', 'b41e57bd-c3f7-4c5e-8949-4bb54088aeef', 'ed47db3e-7f2f-4395-a2ce-ce22c0b83eb6', 'FALL', NULL, NULL, 189, true),
    -- 134 126 R1: April Sarmiento (East Brunswick H.S.) 16-10 won by fall over Allison Serru (Bordentown Regional/Florence Towns
    (134, 71, 'championship', 'R1', 'fdada0ea-825b-4300-8ecc-ecb0dda69c52', 'c84e5f60-96d4-407c-bff1-f1c3dcab192e', 'FALL', NULL, NULL, 74, true),
    -- 134 126 R1: Elizabeth Drozdov (Holmdel) 5-7 won by decision over Juliana Fresolone (Hamilton North- Nottingham) 3-9 (Dec 8
    (134, 71, 'championship', 'R1', '300f3b1f-1301-4749-98a5-2d0bf1e91070', '74064cc1-8298-4ec4-9e81-719fcd3236cf', 'DEC', 8, 3, NULL, true),
    -- 134 126 R1: Janiya Orihuela (North Brunswick Township) 21-13 won by fall over Daniela Del Cid (Princeton) 0-13 (Fall 0:36)
    (134, 71, 'championship', 'R1', '9e92580c-fca6-478e-9e46-7d3783944691', 'ba652381-d9c7-4c8a-88d1-32ab874b6a04', 'FALL', NULL, NULL, 36, true),
    -- 134 126 R1: Taylor Grinnan (Riverside) 12-7 won by fall over Natali Cabrera (Raritan) 4-23 (Fall 0:24)
    (134, 71, 'championship', 'R1', '6d7dd7b0-9054-407e-a8a0-a6ddae2c7a5e', '08026815-abc6-483d-97f3-ffa382374052', 'FALL', NULL, NULL, 24, true),
    -- 134 126 R1: Sofia Sgalambro (Middletown South) 5-15 won by fall over Ashlee Chen (Marlboro) 12-16 (Fall 3:45)
    (134, 71, 'championship', 'R1', '1297bb3d-f298-42b2-993e-957c0e40ce07', '92d59d0f-4049-4af1-8a70-93a326ae733b', 'FALL', NULL, NULL, 225, true),
    -- 134 132 R1: Ananya Chuphal (West Windsor-Plainsboro North) 8-17 won by fall over Antonella Gonzalez Maurera (Marlboro) 10-
    (134, 72, 'championship', 'R1', '66e670d1-adde-4921-ae42-43d0e529e235', '0c3c09c3-0298-4572-9e9b-10f0ccd24523', 'FALL', NULL, NULL, 296, true),
    -- 134 132 R1: Britney Rocha (Ocean Township) 9-10 won by fall over Patricia Boyle (Riverside) 0-7 (Fall 0:45)
    (134, 72, 'championship', 'R1', 'cd4202ce-a080-49bc-a9c0-848dfeca7cf6', '1ec55463-ca50-4cb3-a009-9cb07a837663', 'FALL', NULL, NULL, 45, true),
    -- 134 132 R1: Hana Rochkind (West Windsor-Plainsboro South) 9-10 won by decision over Juliette Gonzalez-Torres (Howell) 8-15
    (134, 72, 'championship', 'R1', '0ca9639a-d0ed-492b-a790-4505a81af1b3', '51a13b5b-86df-42eb-997c-7565af7a85f2', 'DEC', 5, 1, NULL, true),
    -- 134 132 R1: Ryleigh Lynch (Old Bridge) 12-17 won by fall over Michelle Lucero (Holmdel) 3-7 (Fall 1:48)
    (134, 72, 'championship', 'R1', '23d04a59-261d-4fa5-91d1-fb89769bf776', 'e2dc32de-3d97-4301-82cf-aeab1e1d491f', 'FALL', NULL, NULL, 108, true),
    -- 134 138 R1: Madison McKoy (West Windsor-Plainsboro South) 10-10 won by fall over Caroline Samayoa Alencar (Freehold Boroug
    (134, 73, 'championship', 'R1', '8758ca36-4a7c-4e6c-80c1-0c453a6bf35c', '60e2b547-e603-48a9-83cd-2e2caeb75766', 'FALL', NULL, NULL, 195, true),
    -- 134 138 R1: Jayla Hidalgo (Hillsborough) 5-8 won by decision over Ashley Monti (Freehold Township) 8-9 (Dec 13-8)
    (134, 73, 'championship', 'R1', '5126060f-7d86-4d57-a761-4a7796fdb90c', '1e34940f-e131-46ba-a0e9-e09e472200ee', 'DEC', 13, 8, NULL, true),
    -- 134 145 R1: Emily Valencia Vargas (East Brunswick H.S.) 10-9 won by fall over Ilene Dennehy (Raritan) 5-15 (Fall 0:39)
    (134, 74, 'championship', 'R1', 'ac8146d0-5d92-495a-8ee2-477487897cfa', '56e1bbbd-a252-49f3-a2fd-78d35dfd4e7c', 'FALL', NULL, NULL, 39, true),
    -- 134 145 R1: Raymonda Kamara (Ewing) 13-10 won by fall over Ariyanna DiStephano-Cruz (Hamilton East-Steinert) 6-14 (Fall 0:
    (134, 74, 'championship', 'R1', '70bf9882-64c5-48f0-8a5f-3b89e5325e7f', 'c8090fe2-7a45-4012-aa3b-1a488079be72', 'FALL', NULL, NULL, 49, true),
    -- 134 145 R1: Camila DeOliveira (Robbinsville) 5-7 won by fall over Emily Perez-Espinosa (Wall Hs) 2-13 (Fall 0:59)
    (134, 74, 'championship', 'R1', '3c4debc8-430d-499b-97e8-6cedc8000b18', '2623a42f-b8e5-4c89-aedb-fcba8416cbee', 'FALL', NULL, NULL, 59, true),
    -- 134 145 R1: Sophia Rodriguez (North Brunswick Township) 17-10 won by fall over Laurenn Chapman (Freehold Borough) 4-10 (Fa
    (134, 74, 'championship', 'R1', 'e164a051-8929-4068-bcfc-dff2b54fd0f7', '5bcb0b86-13ee-4562-842d-bb211b6c9f0b', 'FALL', NULL, NULL, 224, true),
    -- 134 145 R1: Cambria Reinhold (Hopewell Valley Hs) 17-8 won by fall over Morgan Jennings (Howell) 9-15 (Fall 5:50)
    (134, 74, 'championship', 'R1', 'e0490c96-18ac-4a92-8e52-2b749f99a113', '1251cede-4a42-4fdd-8474-29a663172e28', 'FALL', NULL, NULL, 350, true),
    -- 134 145 R1: Salony Verma (West Windsor-Plainsboro North) 8-9 won by decision over Yarel Argueta (Brick Township) 4-12 (Dec
    (134, 74, 'championship', 'R1', 'e83cb775-f823-4d92-98f5-1ecfaad804a5', 'f72cf5b3-084f-408e-b2fd-ac3a6015c65c', 'DEC', 3, 2, NULL, true),
    -- 134 145 R1: Lianny Sanchez (Hillsborough) 18-8 won by fall over Liz Rivera (Lawrence Senior) 12-11 (Fall 1:57)
    (134, 74, 'championship', 'R1', '83a70d04-c770-4006-ada6-452bb5d36e98', 'b8a8b26c-b300-4df7-8579-e9ef8fd8cadf', 'FALL', NULL, NULL, 117, true),
    -- 134 145 R1: Emma Rollins (Colts Neck) 7-6 won by fall over Gabriella Graves (Jackson Memorial Hs) 2-17 (Fall 1:14)
    (134, 74, 'championship', 'R1', '5dda754a-fbbf-4320-a67e-efc37354a3dd', 'd459438f-95fe-4f40-a22b-791d424d988b', 'FALL', NULL, NULL, 74, true),
    -- 134 152 R1: Emily Garcia (Princeton) 3-11 won by fall over Olivia Gierman (Hightstown) 3-10 (Fall 1:03)
    (134, 75, 'championship', 'R1', 'cea442a6-51cb-4ffc-a18e-2fed0e0b80f9', '9abff8c6-d4a5-425f-9edf-93e90eb4a80e', 'FALL', NULL, NULL, 63, true),
    -- 134 152 R1: Kaylee Chiapa Bendito (North Brunswick Township) 18-12 won by fall over Gabriela Pantoja (Northern Burlington 
    (134, 75, 'championship', 'R1', 'd9bf66f5-c1fb-4e93-b15a-35d07fa6f999', 'dcd000a4-e0f8-4ce9-bdc6-14b8d96c2bed', 'FALL', NULL, NULL, 210, true),
    -- 134 152 R1: Francesca Pignata (Marlboro) 5-14 won by fall over Khushi Shah (South Brunswick Hs) 0-14 (Fall 4:50)
    (134, 75, 'championship', 'R1', '7cd14535-f2e3-4899-bfb3-fa8fc024b4fa', '487048ff-a33d-413f-a751-d26e280081fe', 'FALL', NULL, NULL, 290, true),
    -- 134 152 R1: Adrianna Mondaci (Howell) 15-15 won by fall over Ganna Lystiuk (Manalapan) 7-8 (Fall 3:52)
    (134, 75, 'championship', 'R1', '4c60214c-5850-42d8-80c9-9166bb79416f', '443b31f5-f829-4875-8435-ef24fb5b3ea6', 'FALL', NULL, NULL, 232, true),
    -- 134 152 R1: Zoe Davis (Riverside) 6-10 won by fall over Jariana Lucaro (Lawrence Senior) 10-12 (Fall 2:26)
    (134, 75, 'championship', 'R1', 'c1a34211-ab16-4b72-8961-cf523097a122', 'fa3c4704-67c9-4234-b90e-b13cffbad9a0', 'FALL', NULL, NULL, 146, true),
    -- 134 152 R1: Luz Ortega (Lakewood) 7-13 won by fall over Marina Ferrari (Robbinsville) 0-8 (Fall 1:32)
    (134, 75, 'championship', 'R1', '9739eb40-e202-42f9-88ee-5a501485d8ee', '25f4d76f-128c-4ccf-bd8d-9849f8a6fb7d', 'FALL', NULL, NULL, 92, true),
    -- 134 165 R1: Angelina Santiago (Hamilton West) 6-9 won by fall over Krishna Mohan (South Brunswick Hs) 3-11 (Fall 2:55)
    (134, 76, 'championship', 'R1', '362601bc-2509-487f-a5a4-a5e9288feee4', '6e5d5a5f-5ee4-4e43-8398-f15deadfd769', 'FALL', NULL, NULL, 175, true),
    -- 134 165 R1: Theodora Milchanoski (Hopewell Valley Hs) 7-11 won by fall over Isabella Tauriello (Hillsborough) 4-6 (Fall 1:
    (134, 76, 'championship', 'R1', 'ad5e6b1b-0cca-4581-8448-f503daa0311c', '57118427-ead0-4efe-bf5c-042483e08303', 'FALL', NULL, NULL, 70, true),
    -- 134 165 R1: Alexandra Kokozakis (Middletown South) 11-12 won by fall over Ashley Read (Howell) 8-18 (Fall 1:16)
    (134, 76, 'championship', 'R1', '48e7a308-28f1-4c9f-ada0-ddd372dbaa89', '7f1f55d4-cf10-49bd-9f18-12cc84b849e1', 'FALL', NULL, NULL, 76, true),
    -- 134 165 R1: Journee Washington (Notre Dame) 3-18 won by fall over Jocelyn Lopez (Trenton Central) 2-16 (Fall 0:46)
    (134, 76, 'championship', 'R1', 'fc23ea2d-f536-4f01-ae10-dbdce1210af8', 'fff2bbeb-080c-448d-9698-f299575d1266', 'FALL', NULL, NULL, 46, true),
    -- 134 185 R1: Naomi Tawfik (Brick Township) 8-9 won by decision over Kissandra Rizo (Hamilton North- Nottingham) 4-8 (Dec 6-
    (134, 77, 'championship', 'R1', '228805c6-145a-4401-aa0d-2cbb49bb36a6', '048e8e09-9a94-46a8-bacf-c1e89295be20', 'DEC', 6, 1, NULL, true),
    -- 134 185 R1: Judy Abdalate (Hillsborough) 12-9 won by decision over Samantha Bakst (Old Bridge) 7-11 (Dec 5-0)
    (134, 77, 'championship', 'R1', '46d07339-fa45-4e6d-89ae-d37b4866a460', '39480054-5c08-4291-81e1-e08620d7ba67', 'DEC', 5, 0, NULL, true),
    -- 134 165 3rd_Place: Sofia Sousa (Old Bridge) 27-5 won by fall over Franchesca Edouard (Ewing) 15-8 (Fall 0:47)
    (134, 76, 'consolation', '3rd_Place', 'a631f2cb-aba5-4ecd-8a32-fda43d5d1a21', '2142d2dc-497e-4ac6-a94e-0ad7b4cf3c6b', 'FALL', NULL, NULL, 47, true),
    -- 134 185 3rd_Place: Keyra Huastitlan Reyes (Hightstown) 9-4 won by decision over Morayo Illori (Howell) 22-14 (Dec 12-6)
    (134, 77, 'consolation', '3rd_Place', '053d1f4e-ae4c-49eb-b83f-0fdc18d028d8', '4df110fc-21b9-48fc-9f16-d60a686310a3', 'DEC', 12, 6, NULL, true),
    -- 137 100 R1: Deysi Mauro Cortez (West Deptford) 9-7 won by decision over Mia Kraft (Southern Regional) 3-9 (Dec 6-2)
    (137, 67, 'championship', 'R1', '048af5a1-7c57-4371-8cee-4f1c434c9653', 'cd764daf-ba04-437f-b9ea-df720dfaa2a5', 'DEC', 6, 2, NULL, true),
    -- 137 100 R1: Aleisha Santiago (Paulsboro H.S.) 13-8 won by fall over Laci Saunders (Overbrook Reg Senior) 16-11 (Fall 0:58)
    (137, 67, 'championship', 'R1', 'd20ddba5-a298-4c7b-a5a9-ae0bd0929c7c', '16d214b7-4b97-4e2f-bb71-2ab73c6a5ad7', 'FALL', NULL, NULL, 58, true),
    -- 137 100 R1: Julianna Rice (Lenape) 19-8 won by decision over Gianna Edwards (Buena Regional) 3-8 (Dec 15-12)
    (137, 67, 'championship', 'R1', '1018ceeb-ad78-4403-b9a0-82c7e56a9e72', '8f5c3c3f-5093-4e61-86ed-2a3c30ba3ec8', 'DEC', 15, 12, NULL, true),
    -- 137 100 R1: Maliyah Nieves (BCIT - Westampton) 12-13 won by fall over Isabella Gjini (Delsea) 2-10 (Fall 0:12)
    (137, 67, 'championship', 'R1', 'f6a30365-2e05-4306-b05c-fea5fe4b0620', '7c923c1e-78a2-4bb4-8627-007641d0d804', 'FALL', NULL, NULL, 12, true),
    -- 137 100 R1: Nina Realdine (Highland Regional High School) 4-8 won by fall over Gianna Goto (Pitman) 4-8 (Fall 3:57)
    (137, 67, 'championship', 'R1', 'b1769653-de7b-4014-a322-1eb4a8d7c9ce', 'e17d2085-b8be-4aef-8492-182c48ccb653', 'FALL', NULL, NULL, 237, true),
    -- 137 100 R1: Jules Platti (Pinelands Regional) 11-6 won by fall over Adelynn Zemp (Deptford) 10-9 (Fall 2:39)
    (137, 67, 'championship', 'R1', 'fe00ada1-d261-469f-9177-d7b03dc9da6b', 'a14a885c-c999-4897-96a0-9aae4ea676a2', 'FALL', NULL, NULL, 159, true),
    -- 137 100 R1: Adriana Connelly (Gloucester City JR/SR) 18-14 won by fall over Jazlyn Canales-Bonilla (Lindenwold) 6-7 (Fall 
    (137, 67, 'championship', 'R1', '59a4a3a9-385c-47f5-a277-a917578366d9', 'd0acf33a-93a6-44c0-a2d7-13952ad4f242', 'FALL', NULL, NULL, 113, true),
    -- 137 107 R1: Kaleigh McCready (Seneca) 14-15 won by fall over Casey Moore (Collingswood) 4-18 (Fall 3:18)
    (137, 68, 'championship', 'R1', '552ddd1e-3e4c-4df2-8a87-0ed1db39163e', 'c36800b8-5be0-4891-ad40-54fcaa33b31a', 'FALL', NULL, NULL, 198, true),
    -- 137 107 R1: Hailey Schweigart (Southern Regional) 20-8 won by fall over Zoe Torraya (Overbrook Reg Senior) 6-7 (Fall 2:38)
    (137, 68, 'championship', 'R1', 'ef9985d5-8c00-4242-a62c-9e34410acdff', '54e35ae1-a9bc-4ae0-810d-92557e2d1de0', 'FALL', NULL, NULL, 158, true),
    -- 137 107 R1: Ava Baldino (Delsea) 15-6 won by fall over Ava Paul (Deptford) 1-4 (Fall 2:32)
    (137, 68, 'championship', 'R1', '7a8a91b1-c370-4a5d-89e4-44cc1cba07f5', '05d20956-700e-4794-88f7-bbfc4b09898e', 'FALL', NULL, NULL, 152, true),
    -- 137 107 R1: Malayah Calm (Lindenwold) 14-6 won by fall over Isabella Oliveras Najera (Absegami) 3-13 (Fall 2:57)
    (137, 68, 'championship', 'R1', '9065f7bc-a80f-4dfc-b414-c53150eb6867', '82cc6c04-a2fd-41b6-b58e-dabfff95b309', 'FALL', NULL, NULL, 177, true),
    -- 137 107 R1: Isabella Robles (West Deptford) 10-8 won by fall over Evelyn Reyes (Central Regional) 8-21 (Fall 3:27)
    (137, 68, 'championship', 'R1', '4c9d1ac7-f838-43cb-93a0-dbba9178451b', 'ba3b7f7a-b0b4-4938-8650-2f70f2e4f62e', 'FALL', NULL, NULL, 207, true),
    -- 137 107 R1: Peyton Brining (Audubon) 18-6 won by fall over Evellyn De Castro Barbosa (Delran) 7-2 (Fall 2:19)
    (137, 68, 'championship', 'R1', '99bbd74c-994d-4cf5-91f9-3fc08e743061', '03913b9b-8826-4da3-9031-2c4aa18adaae', 'FALL', NULL, NULL, 139, true),
    -- 137 107 R1: Darlene Ho (Egg Harbor) 4-9 won by major decision over Addison Costello (Highland Regional High School) 3-8 (M
    (137, 68, 'championship', 'R1', 'fabb0ec5-4b2a-41fd-82c0-1785d9a97ec4', '23651a4f-a82d-4280-b490-9c7c3d9f20ce', 'MD', 13, 0, NULL, true),
    -- 137 114 R1: Olivia Sleeper (Lenape) 13-8 won by decision over Anyae Munson-Young (Cherokee) 6-6 (Dec 9-6)
    (137, 69, 'championship', 'R1', '7ff69d37-11be-4e31-99cd-3b14d7e4ed64', 'd9a38ffe-ecaf-42b3-800a-5dc168166c95', 'DEC', 9, 6, NULL, true),
    -- 137 114 R1: Samantha Ridel (Williamstown) 20-12 won by fall over Nevaeh Lundy (West Deptford) 3-10 (Fall 0:57)
    (137, 69, 'championship', 'R1', 'aac9a946-9096-45c1-9012-03e6ab048a24', '897e42bf-3837-4bcd-9563-158c54659fdd', 'FALL', NULL, NULL, 57, true),
    -- 137 114 R1: Amelia Taylor (Absegami) 23-9 won by fall over Josalyn Hurlburt (Pemberton Township) 8-12 (Fall 2:41)
    (137, 69, 'championship', 'R1', 'd873dd7a-b37b-44e2-8468-0b7d2363fe84', 'a16417e8-0858-475a-9219-19ea84a159f9', 'FALL', NULL, NULL, 161, true),
    -- 137 114 R1: Shae-Lyn Guido (Southern Regional) 24-9 won by fall over Abigael Milk (Ocean City) 3-13 (Fall 1:43)
    (137, 69, 'championship', 'R1', '640fb039-0327-429a-9eb6-06f909055130', '8652a553-57af-4944-9fdf-0d7e745f55a0', 'FALL', NULL, NULL, 103, true),
    -- 137 114 R1: Adison Hughes (Delsea) 7-9 won by fall over Amber Freiling (Overbrook Reg Senior) 3-13 (Fall 2:44)
    (137, 69, 'championship', 'R1', '2575edf7-ce10-4624-8418-cdbcbc9c0297', 'f3a5bf1e-7c79-40d8-a985-2f44063f000d', 'FALL', NULL, NULL, 164, true),
    -- 137 114 R1: Haley Pace (Pennsville Memorial) 9-12 won by fall over Lily Stevenson (Sterling) 9-6 (Fall 5:36)
    (137, 69, 'championship', 'R1', 'b00e15cd-c9ee-4ede-8ee6-90f3983e9425', 'b41d1c92-c054-472d-bb29-257a6a74713b', 'FALL', NULL, NULL, 336, true),
    -- 137 114 R1: Zoey Rodriguez (Manchester Township) 17-13 won by fall over Savanah Valliere (Lindenwold) 6-15 (Fall 5:15)
    (137, 69, 'championship', 'R1', '46695577-e411-4d3a-8933-71f4cbfaab9f', 'b3efea78-1837-4890-b6ac-7c5f439cba16', 'FALL', NULL, NULL, 315, true),
    -- 137 114 R1: Avelin Wells (Clearview Regional) 17-4 won by decision over Regan Borrelli (Cherry Hill East) 9-9 (Dec 11-7)
    (137, 69, 'championship', 'R1', '6917735f-9e5d-448e-94ca-d79714c92fdf', 'e4013b72-15af-4a44-9de9-1ca4192f3faa', 'DEC', 11, 7, NULL, true),
    -- 137 114 R1: Sophia Reyes (Eastern) 18-7 won by fall over Ekemini Arinye (Oakcrest) 8-7 (Fall 1:06)
    (137, 69, 'championship', 'R1', '798e8489-b9b6-48de-9b6d-6698b78db431', 'e761d1b2-9984-4f6a-a71a-1a245ce62bca', 'FALL', NULL, NULL, 66, true),
    -- 137 114 R1: Layla Heinze (Central Regional) 19-11 won by fall over Rylee Evans (Cinnaminson) 19-7 (Fall 3:03)
    (137, 69, 'championship', 'R1', 'eaef18ec-1667-4b9d-afb1-9d6f633c714f', '9dacba06-22c2-4d8f-ae43-64037f4e6e18', 'FALL', NULL, NULL, 183, true),
    -- 137 114 R1: Aubrey Raum (Buena Regional) 7-8 won by fall over Lara Paiva (Delran) 17-12 (Fall 3:07)
    (137, 69, 'championship', 'R1', '489e0a4f-cac8-401d-8ada-1c4a5755a3ae', 'bd407931-77fb-462c-a8ef-d12189b2f4bb', 'FALL', NULL, NULL, 187, true),
    -- 137 114 R1: Cassidy Moore (Collingswood) 12-10 won by fall over Olivia Rivers (Winslow Twp ( Edgewood)) 0-11 (Fall 1:02)
    (137, 69, 'championship', 'R1', 'f5141773-422f-4cc2-b52d-c300a849f820', 'e460955a-c276-47d4-b1a0-8a28d00bc8f6', 'FALL', NULL, NULL, 62, true),
    -- 137 120 R1: Ava Ritz (Delsea) 15-7 won by major decision over Reese Harduk (Lenape) 0-5 (MD 18-7)
    (137, 70, 'championship', 'R1', 'b28eb98c-d77c-4fee-8dc6-f91339d8a86f', '77a329eb-8bc7-4916-b959-f90d45a7775d', 'MD', 18, 7, NULL, true),
    -- 137 120 R1: Rosalie Sharp (Williamstown) 16-9 won by fall over Vitoria Ferreira Souza (Cinnaminson) 6-15 (Fall 1:11)
    (137, 70, 'championship', 'R1', '2d0138a5-7c6f-46cf-b3de-a5ecd721ee1e', '1c1b95e1-0724-4013-817c-6f757b20aa70', 'FALL', NULL, NULL, 71, true),
    -- 137 120 R1: Alexandria Chase (Absegami) 12-12 won by fall over Deborah Amann (Sterling) 9-8 (Fall 0:47)
    (137, 70, 'championship', 'R1', '02c041b8-4be7-416a-a484-61efd49b79f3', '0850976a-0c24-4939-9393-a3900542b10c', 'FALL', NULL, NULL, 47, true),
    -- 137 120 R1: Grace O`Neill (Toms River East H.S.) 19-8 won by fall over Adelaide Matta Arvo (Collingswood) 12-9 (Fall 2:49)
    (137, 70, 'championship', 'R1', '2d9069d1-331e-4066-9257-73ea21408e6a', 'ae3b1f9a-af36-48e5-b0b9-65a44aee566c', 'FALL', NULL, NULL, 169, true),
    -- 137 120 R1: Jazhury Zayas (Willingboro High School) 12-11 won by fall over Elizabeth Rodriguez-Aviles (Manchester Township
    (137, 70, 'championship', 'R1', '02b1bfb3-4a77-4e5b-bb46-0fd7382a8788', 'a6a6ae2c-a912-4235-8bdc-259f95718064', 'FALL', NULL, NULL, 42, true),
    -- 137 120 R1: Gabrielly Silva (Delran) 20-8 won by fall over Gianna Petracci (Washington Township) 5-11 (Fall 1:44)
    (137, 70, 'championship', 'R1', '31eb466f-c9f7-46cb-8035-0163096665a4', '4c0f6f98-9649-4ad0-adbf-29a891d7a5d7', 'FALL', NULL, NULL, 104, true),
    -- 137 120 R1: Samirah Duran (Egg Harbor) 22-7 won by fall over Kyla Rutt (Cedar Creek) 11-10 (Fall 0:59)
    (137, 70, 'championship', 'R1', '5ced48fe-1f8e-429a-9cc4-6a1addb07ba2', '53af67b5-6dec-4189-a620-de084e3b9ccf', 'FALL', NULL, NULL, 59, true),
    -- 137 120 R1: Sophia Holmes (Clayton/Glassboro) 27-8 won by fall over Leah Barbera (Overbrook Reg Senior) 0-9 (Fall 0:15)
    (137, 70, 'championship', 'R1', '7a21379e-29c0-4d1f-b3b1-da51bdeb6f57', 'ae246a16-7a90-4f3a-ab55-44feb7991041', 'FALL', NULL, NULL, 15, true),
    -- 137 120 R1: Christina Johnston (Central Regional) 20-11 won by fall over Samantha Thomas (West Deptford) 3-19 (Fall 0:44)
    (137, 70, 'championship', 'R1', '15f78126-e4bf-49cf-a256-119004acea07', '1e31d78d-78f9-4cf9-89cd-c8958e6199f0', 'FALL', NULL, NULL, 44, true),
    -- 137 120 R1: Nylah Jackson (Pemberton Township) 15-15 won by fall over Madison Friday (BCIT - Westampton) 17-8 (Fall 2:22)
    (137, 70, 'championship', 'R1', 'e8af2e28-8d51-4457-8913-cebc3851c265', 'b26d67dc-5d2c-43d1-9c68-c6d83a49430e', 'FALL', NULL, NULL, 142, true),
    -- 137 120 R1: Jasmine Williams (Winslow Twp ( Edgewood)) 15-9 won by fall over Julianna Sabec (Eastern) 10-8 (Fall 0:41)
    (137, 70, 'championship', 'R1', '23853a7e-cf01-4df8-a0c1-f5e7d6e3c697', 'a2cc3df8-4082-4229-9460-e046533cba66', 'FALL', NULL, NULL, 41, true),
    -- 137 120 R1: Alyssa Orsino (Hammonton) 13-4 won by tech fall over Adamaris Vergara (Cherokee) 7-14 (TF-1.5 3:40 (15-0))
    (137, 70, 'championship', 'R1', '87ec21fb-001c-48ec-9e7b-e9297350b767', 'b860909e-0261-421d-9502-dba246e3894e', 'TF-1.5', 15, 0, 220, true),
    -- 137 120 R1: Makiyah Harris (Mainland Regional) 8-11 won by fall over Ivani Gonzales (Gloucester City JR/SR) 14-10 (Fall 3:
    (137, 70, 'championship', 'R1', 'e5e90615-a2e1-450e-86f7-69c3b69b58cb', '9727f3e2-0c56-4b7b-9e53-aeb5122d7a2d', 'FALL', NULL, NULL, 192, true),
    -- 137 120 R1: Noelle Dugas (Moorestown) 5-5 won by fall over Josephine Young (Ocean City) 4-10 (Fall 3:40)
    (137, 70, 'championship', 'R1', 'deda6de0-93e7-44ed-a891-08abb9327356', '565081e9-f6b6-474e-a46f-324621f8ed50', 'FALL', NULL, NULL, 220, true),
    -- 137 126 R1: McKayla Latkovich (Rancocas Valley Regional) 6-14 won by fall over Denali Rangel (Gloucester City JR/SR) 7-10 
    (137, 71, 'championship', 'R1', '1be53ec1-85ff-400b-b1ab-86e6b60496bc', '949203ff-c5fa-4fc0-878e-97d270cf11cd', 'FALL', NULL, NULL, 33, true),
    -- 137 126 R1: Kathryn Green (Pemberton Township) 12-11 won by fall over Hannah Bottomer (Cinnaminson) 10-5 (Fall 2:49)
    (137, 71, 'championship', 'R1', '068bed15-01d3-45b0-b785-0d8e686c5932', '73219616-6536-4802-998d-8a4c6504d4eb', 'FALL', NULL, NULL, 169, true),
    -- 137 126 R1: Sophie Moody (Central Regional) 10-10 won by tech fall over Mary Kelleher (Absegami) 1-11 (TF-1.5 2:42 (17-2))
    (137, 71, 'championship', 'R1', '7d8f1a6d-1f7a-4a28-8c58-8d54f95d8990', '77b4674c-251f-4775-b66a-40144bf5e9a6', 'TF-1.5', 17, 2, 162, true),
    -- 137 126 R1: Leiyah Stone (Clayton/Glassboro) 8-5 won by decision over Chloe Lloyd (Williamstown) 6-13 (Dec 9-7)
    (137, 71, 'championship', 'R1', 'a2355764-f0f0-40c5-ba02-4618df079fa1', '5e143fa6-47fc-4fca-9015-3bff2c93f6d6', 'DEC', 9, 7, NULL, true),
    -- 137 126 R1: Angela Biondi (Manchester Township) 10-9 won by fall over Bella Perez (Delran) 4-15 (Fall 1:27)
    (137, 71, 'championship', 'R1', '0f9b66ea-e62d-44cc-9f70-d70512cc87e2', 'f8cbb7c5-6b9f-40ff-ab44-8f1094a23715', 'FALL', NULL, NULL, 87, true),
    -- 137 126 R1: Elyn Lopez-Saenz (Toms River North) 7-3 won by fall over Brizziyda Sanchez (Lindenwold) 6-13 (Fall 0:19)
    (137, 71, 'championship', 'R1', 'd2522806-40be-432b-9b5e-fe371b94f2ef', '6a0ad08a-d332-49ea-934a-2a32b92c8a69', 'FALL', NULL, NULL, 19, true),
    -- 137 126 R1: Jordanna Tete (Lenape) 11-11 won by fall over Malia Landolt (Seneca) 14-12 (Fall 2:37)
    (137, 71, 'championship', 'R1', '8b5f76e7-589c-4e4b-b38d-0f7f87ad194b', '8aa544dc-c40b-4e44-ad68-9c0199114bf7', 'FALL', NULL, NULL, 157, true),
    -- 137 132 R1: Hope Jones (Kingsway Regional) 15-12 won by fall over Chelsea Ohoa (Willingboro High School) 5-12 (Fall 3:28)
    (137, 72, 'championship', 'R1', '48eecda8-d9a4-46ee-bfab-18711dfd6228', '7ed38341-bdea-435c-83c4-5b641b0b905f', 'FALL', NULL, NULL, 208, true),
    -- 137 132 R1: Courtney Bowyer (Middle Township) 5-4 won by fall over London Reevey (Collingswood) 16-9 (Fall 4:00)
    (137, 72, 'championship', 'R1', '214dc1cb-624d-4365-a051-e15619ff0929', 'dbabdb43-d546-4e23-b2d9-01d29b70e59e', 'FALL', NULL, NULL, 240, true),
    -- 137 132 R1: Nathalia Tran (Cherry Hill East) 9-4 won by fall over Elizabeth Warren (Rancocas Valley Regional) 12-15 (Fall 
    (137, 72, 'championship', 'R1', 'c38eb1dd-37cc-4005-ac30-15e289523574', 'a7cfc353-7bb5-45dd-b2dc-41a4f565bf68', 'FALL', NULL, NULL, 176, true),
    -- 137 132 R1: Raniya Glascoe (BCIT - Westampton) 8-5 won by decision over Kelly Herrera (Ocean City) 2-13 (Dec 10-9)
    (137, 72, 'championship', 'R1', 'e513447d-9068-4e0f-ae19-9d65974d40ce', '39437419-7f0c-4650-b96a-b70261bd05c4', 'DEC', 10, 9, NULL, true),
    -- 137 132 R1: Julianna Bush (Washington Township) 13-5 won by decision over Evolet Espinosa (Eastern) 9-14 (Dec 10-6)
    (137, 72, 'championship', 'R1', 'd277a982-4bc2-411a-afcc-929834393834', '4a01901f-5885-4cb0-8e38-de70cf9cbae7', 'DEC', 10, 6, NULL, true),
    -- 137 132 R1: Sofia Vazquez (Delsea) 6-9 won by fall over Sydney Ward (Southern Regional) 9-16 (Fall 5:18)
    (137, 72, 'championship', 'R1', '46d28998-2f99-4428-bf04-9d386602135a', '3dab3ecb-1ae2-464c-9d7e-1942ebfa0c1b', 'FALL', NULL, NULL, 318, true),
    -- 137 132 R1: Nariah Miles (Manchester Township) 19-10 won by fall over Abigail Cusato (Clayton/Glassboro) 6-9 (Fall 0:56)
    (137, 72, 'championship', 'R1', 'efbf50fd-f79d-4798-9845-b02a57a29915', 'be5f3b7c-a67b-4561-b93b-224192850066', 'FALL', NULL, NULL, 56, true),
    -- 137 132 R1: Ashley Willis (Gloucester City JR/SR) 20-11 won by decision over Lilyana Zwillinger (Williamstown) 17-14 (Dec 
    (137, 72, 'championship', 'R1', '0fadb9d7-0ab4-4648-abc2-af8e6e9c3971', '15f71af8-b70b-4e84-9cdd-fb4cd8dcf8fe', 'DEC', 12, 10, NULL, true),
    -- 137 138 R1: Mollie Bruggis (Eastern) 6-10 won by fall over Ellie Fanz (Delsea) 4-5 (Fall 0:15)
    (137, 73, 'championship', 'R1', '7978f863-87bc-41ed-81a6-7ae62c7b3e0e', 'f958566f-3f0d-4ab7-b6ca-2dd6fb0ee9aa', 'FALL', NULL, NULL, 15, true),
    -- 137 138 R1: Julia Lord (Cedar Creek) 5-5 won by major decision over Camila Melendez (Williamstown) 5-14 (MD 14-1)
    (137, 73, 'championship', 'R1', 'de877e29-3a8e-438a-88f9-86d606d13e2a', '9738ff6d-143c-41a3-a594-2ed925830235', 'MD', 14, 1, NULL, true),
    -- 137 145 R1: Sarah Longo (Clearview Regional) 12-9 won by fall over Concepcion Soriano (Clayton/Glassboro) 3-11 (Fall 1:15)
    (137, 74, 'championship', 'R1', '12b57019-0e8f-4bc5-a40e-1e7b59b30c98', '5e3c106f-e39d-46d3-b4c3-e25aa44a8664', 'FALL', NULL, NULL, 75, true),
    -- 137 145 R1: Sarah Alvim (Delran) 8-12 won by fall over Ciara Knight (Absegami) 3-18 (Fall 4:43)
    (137, 74, 'championship', 'R1', '442a8537-c4ce-41f0-beee-a6e0e5cc2856', '564b1f89-b4fb-4b33-ab9e-752a5082b5b4', 'FALL', NULL, NULL, 283, true),
    -- 137 145 R1: Casey Laracy (Manchester Township) 10-9 won by decision over Ariella Little (Eastern) 5-7 (Dec 5-4)
    (137, 74, 'championship', 'R1', '6c1a8ba1-5326-4584-bef0-2a5af49ba3ae', 'ef2af315-02c8-4c34-a4ae-608c1104b57c', 'DEC', 5, 4, NULL, true),
    -- 137 145 R1: Gianna Lopez (Cherry Hill East) 12-5 won by decision over Tianna Tapia-Mendez (Southern Regional) 11-11 (Dec 9
    (137, 74, 'championship', 'R1', 'ef11ce9b-d0fe-4e01-9fed-5f86888ac52c', '9c2400f9-0a21-4365-b2b4-3905c2a81b26', 'DEC', 9, 3, NULL, true),
    -- 137 145 R1: Ja`Mia Martin (Audubon) 7-8 won by fall over Jessica Hume (Ocean City) 11-10 (Fall 0:46)
    (137, 74, 'championship', 'R1', 'c110b989-9df0-4bba-8fc1-c2b0b3c9e54c', '800a83b5-d607-411c-b3be-0786ea79509c', 'FALL', NULL, NULL, 46, true),
    -- 137 165 R1: Jazira Cosby (Absegami) 8-6 won by fall over Alexandra Velasquez (Eastern) 5-12 (Fall 1:42)
    (137, 76, 'championship', 'R1', '73a7c538-ab60-4c9b-bd0b-e4528d8c3f51', '213960c7-e36a-4c08-93f4-30ecd564dacd', 'FALL', NULL, NULL, 102, true),
    -- 137 165 R1: Joanna Moore (Toms River East H.S.) 11-9 won by fall over Kendal Renshaw (Clayton/Glassboro) 4-11 (Fall 5:18)
    (137, 76, 'championship', 'R1', 'bba46202-fcc0-4f37-a235-d99dadb7ed9c', 'c5844270-a0c6-4cef-b43f-9da392a621e4', 'FALL', NULL, NULL, 318, true),
    -- 137 165 R1: Carmella Destralo (Delsea) 8-8 won by fall over Mackenzi Cerchiaro (Washington Township) 4-9 (Fall 3:24)
    (137, 76, 'championship', 'R1', 'ac9c97b2-52ad-414a-a25c-f0b85988cff7', 'b0a1142a-d549-4d69-a7f9-572a82b5773e', 'FALL', NULL, NULL, 204, true),
    -- 137 165 R1: Tytiana Miller (Salem) 9-4 won by fall over Yasmin Jamison (Pennsauken) 3-6 (Fall 0:56)
    (137, 76, 'championship', 'R1', '771aa033-04c2-4582-84c4-65958a019012', 'c3082d7b-baaa-4bab-bada-ea6acf203802', 'FALL', NULL, NULL, 56, true),
    -- 138 185 R1: Kiana Alvarez (Elmwood Park) 19-3 won by fall over Keyra Huastitlan Reyes (Hightstown) 9-6 (Fall 2:23)
    (138, 77, 'championship', 'R1', 'ec01847f-9671-494e-8636-c5cf3946ef6e', '63a7ee88-544e-4d9e-896c-a37d25f54ee4', 'FALL', NULL, NULL, 143, true);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 258 THEN RAISE EXCEPTION 'expected 258 bouts, got %', n; END IF;
END $$;

-- Verify: Round 1 per region, and the three others
SELECT t.name, m.round, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE (m.tournament_id IN (134, 135, 136, 137) AND m.round = 'R1') OR (m.tournament_id = 138 AND m.round = 'R1') OR (m.tournament_id = 134 AND m.round = '3rd_Place')
GROUP BY t.name, m.round ORDER BY t.name, m.round;
