-- Girls 2025-26 districts: add the 3rd and 5th place bouts (2026-11-02)
--
-- The TrackWrestling export (gt_s2_girls_districts.txt) lists 144 "3rd Place Match" and 143 "5th Place Match"
-- lines: 283 bouts plus 4 forfeit-vs-forfeit slots that are not bouts. A place won by a bye is
-- stored as BYE, and a win over a forfeit slot as FORF with no loser (as elsewhere).
-- The district import never loaded them, so girls district pages showed no 3rd-6th places and the
-- consolation bracket stopped at C3 (the consolation semifinal). Kyle checked the original
-- documents: every 3rd place match is listed. Each row's wrestlers are matched to their entry in
-- that district at that weight (built by scripts/build_girls_district_place_bouts.mts).
-- ROLLBACK: DELETE FROM matches WHERE round IN ('3rd_Place','5th_Place') AND tournament_id IN
--   (SELECT id FROM tournaments WHERE gender = 'F' AND season_id = 2026 AND tournament_type = 'districts');

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
             WHERE t.gender = 'F' AND t.season_id = 2026 AND t.tournament_type = 'districts'
               AND m.round IN ('3rd_Place', '5th_Place')) THEN
    RAISE EXCEPTION 'girls 2025-26 district place bouts already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
  -- D1 100: Sophia Washburn over Faith Mellito (Dec 14-8)
  (186, 67, 'consolation', '3rd_Place', 'ce255631-09dd-4904-8052-3f90d2534e2e', 'b6b8afc3-da91-4dc3-acac-b0606bc482dd', 'DEC', 14, 8, NULL, true),
  -- D1 100: London Long over Karlly Hague (Fall 2:20)
  (186, 67, 'consolation', '5th_Place', 'e6bbefb3-c59c-4e4e-bac9-3ca33778518b', '012188f0-816c-4f72-9a98-372a1b9661a4', 'FALL', NULL, NULL, 140, true),
  -- D1 107: Isabella Santonocito over Eva Denne (Fall 0:31)
  (186, 68, 'consolation', '3rd_Place', '8473aed8-7fea-4dd0-8c0d-9759d531f19f', '3a82f43e-a115-4e66-a2d0-1d0208b0a3e6', 'FALL', NULL, NULL, 31, true),
  -- D1 107: Alexa Scholz over Amanda Scarpati (Fall 0:55)
  (186, 68, 'consolation', '5th_Place', '27f3d6f1-b704-496a-9e38-95da26f98774', 'b714fd28-f318-41df-befd-8cef9de5c541', 'FALL', NULL, NULL, 55, true),
  -- D1 114: Reilly Callan over Kaelen Hague (Fall 2:13)
  (186, 69, 'consolation', '3rd_Place', '1678753f-89da-4367-980f-3b61d72ce5a6', '4faba738-b05b-4860-a486-14423b8c568c', 'FALL', NULL, NULL, 133, true),
  -- D1 114: Abigail Bloxham over Ashley Romero-Tamayo (Fall 1:03)
  (186, 69, 'consolation', '5th_Place', '5cb0045f-bcef-4656-bd00-d7ec4d6912a9', '47968ba1-8743-415b-85cf-a2488fdd008a', 'FALL', NULL, NULL, 63, true),
  -- D1 120: Hannah Harrison over Sua Jeong (Fall 0:26)
  (186, 70, 'consolation', '3rd_Place', '3f0e5d14-f2bb-4bd8-bb5f-6338296d24d2', '9097e8c1-1ee0-4e0d-83e5-d0d493727239', 'FALL', NULL, NULL, 26, true),
  -- D1 120: Mia Frasca over Violet Henderson (Dec 2-1)
  (186, 70, 'consolation', '5th_Place', '2221564b-96ba-4849-bf76-d29562fca888', '3e006788-4d1b-4ec7-8e5e-1712b232ede0', 'DEC', 2, 1, NULL, true),
  -- D1 126: Bella Vogler over Jacqueline Sloan (Fall 1:06)
  (186, 71, 'consolation', '3rd_Place', 'ccd47126-6071-4196-b725-44877262a2ea', 'd9fc9b4f-56a2-4f60-9bc3-c799dc7a0716', 'FALL', NULL, NULL, 66, true),
  -- D1 126: Ava Vanderbeek over Sadie Collins (Dec 8-3)
  (186, 71, 'consolation', '5th_Place', '3d4c0934-28a3-4918-a467-c1c4e6a179a9', 'c8aeaf59-b7fb-4677-9f69-f040b8259588', 'DEC', 8, 3, NULL, true),
  -- D1 132: Jasmine Christ over Isabella Elder (TF-1.5 5:48 (23-8))
  (186, 72, 'consolation', '3rd_Place', '041ba04c-49fb-46fd-8e92-f90c98a43f8d', '92d9b6b6-37de-4275-b432-4f8069f7c617', 'TF-1.5', 23, 8, 348, true),
  -- D1 132: Alyssa Conway over vanessa Colon (Dec 8-2)
  (186, 72, 'consolation', '5th_Place', 'a3af22c2-345c-4eed-8ce6-d5c2654d22ac', '128df1c6-bf78-4ea6-acc5-c98f94cc79b2', 'DEC', 8, 2, NULL, true),
  -- D1 138: Gabriela Villafana over Yulie Harada (Fall 1:56)
  (186, 73, 'consolation', '3rd_Place', 'e628bcbd-ba4d-4a70-88d0-76c4150e8fb3', 'e3bee003-c6c2-414a-9e41-893caa3d0779', 'FALL', NULL, NULL, 116, true),
  -- D1 138: Madelyn Hammett over Samantha Lara (Dec 5-2)
  (186, 73, 'consolation', '5th_Place', 'f44a777e-5e16-4c2a-ae2e-9de1830cdf9a', 'c63fcbb2-2ffe-4168-b1c3-b114fbab06e9', 'DEC', 5, 2, NULL, true),
  -- D1 145: Micaela Azcona over Juliet Oakley (Fall 3:22)
  (186, 74, 'consolation', '3rd_Place', '1599ccca-b5ee-43b7-8047-736495af84ba', 'b4d62b39-c2ad-4100-8be1-45b3f09f4da0', 'FALL', NULL, NULL, 202, true),
  -- D1 145: Klarity Lain over Emily Rodriguez (Fall 1:24)
  (186, 74, 'consolation', '5th_Place', '3860c599-e2cd-4c26-b41e-34d916c57fb9', '50edf04d-52eb-459c-8cd5-46c7d2f97316', 'FALL', NULL, NULL, 84, true),
  -- D1 152: Alexandra Acosta-McCracken over Francesca Muia (TF-1.5 3:06 (17-2))
  (186, 75, 'consolation', '3rd_Place', 'b6c3801b-378b-4226-8895-34e02206a426', '6972f36f-9f4e-4c61-a490-5e43b09b6ee1', 'TF-1.5', 17, 2, 186, true),
  -- D1 152: Gwen Silipena over Itzel Vazquez (Fall 3:35)
  (186, 75, 'consolation', '5th_Place', '39b12b1d-2ac3-427d-8fe6-aef7474b0500', '88c68125-c2b3-45b0-91ea-53d20795fd7c', 'FALL', NULL, NULL, 215, true),
  -- D1 165: Julia Cirillo over Samantha Varum (Fall 0:43)
  (186, 76, 'consolation', '3rd_Place', 'f28324d1-f568-40c0-9317-237d08120c5c', '2be5bf10-7560-4356-84b4-55fac79410df', 'FALL', NULL, NULL, 43, true),
  -- D1 165: Luciana Gallagher over Isabel James (Fall 5:22)
  (186, 76, 'consolation', '5th_Place', '41fed2fd-a5e2-448d-9503-b74dcb0b2a2f', '39cf60dc-d6f8-414e-b49a-d49c6f7dcbe0', 'FALL', NULL, NULL, 322, true),
  -- D1 185: Brianna Stiller over Karly Lockburner (Fall 3:24)
  (186, 77, 'consolation', '3rd_Place', 'f816de66-03fe-4295-b3ca-26351601e8db', 'ad918255-1c97-4e28-9c37-f0b91292260c', 'FALL', NULL, NULL, 204, true),
  -- D1 185: Jayden Soliman over Natasha Malson-Jacoby (Dec 5-1)
  (186, 77, 'consolation', '5th_Place', '8bfc025b-76fa-4af8-a5a0-657d32781c56', '9fdb64ae-2fcb-40e3-ba4b-46bc5c341990', 'DEC', 5, 1, NULL, true),
  -- D1 235: Janayla Corum over Annika Santos (Fall 1:08)
  (186, 78, 'consolation', '3rd_Place', '1656dfd3-c351-43da-9f33-c50ab1c07b98', '3f8d4948-ac41-4897-adb7-42e71ad1f4ba', 'FALL', NULL, NULL, 68, true),
  -- D1 235: Taryn Donovan over Forfeit Forfeit (For.)
  (186, 78, 'consolation', '5th_Place', 'ce316af8-eabb-4f47-97e2-05f0cbf73e8d', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D2 100: Alysa Patel over Kaylee Rodriguez (Fall 0:14)
  (187, 67, 'consolation', '3rd_Place', 'c7e94149-a83f-4089-892a-2e62fdb88898', 'ab648c0f-9e35-4e13-a6d9-a988cf5615e1', 'FALL', NULL, NULL, 14, true),
  -- D2 100: Brisa Gonzalez-Rodriguez over Elena Pinedo (Fall 1:23)
  (187, 67, 'consolation', '5th_Place', 'fef5ccc4-b0fa-4188-8584-f7dd69956410', '20ca3297-0f0a-4f58-aafc-c8a883d93923', 'FALL', NULL, NULL, 83, true),
  -- D2 107: Sarah Sheiner over Ava Connolly (Fall 0:54)
  (187, 68, 'consolation', '3rd_Place', 'c22d5399-f136-424c-9bc3-cca995880ed3', '3a487692-4bcc-4e05-9061-2e6682ceab8b', 'FALL', NULL, NULL, 54, true),
  -- D2 107: Mariella Nieves over Mikayla Thompson (Fall 5:40)
  (187, 68, 'consolation', '5th_Place', '9c730ca9-a001-4e07-a198-ea01b3b13fb8', '64de8a87-9732-4081-89ea-975f5dbaf092', 'FALL', NULL, NULL, 340, true),
  -- D2 114: Cora Almendinger over Daniela Hidalgo (Fall 3:07)
  (187, 69, 'consolation', '3rd_Place', 'e95ce76e-2a53-4429-97e8-a028f1ed2df9', 'c6983e80-9419-4435-9fb5-87b4de73508b', 'FALL', NULL, NULL, 187, true),
  -- D2 114: Sophia Meehan over Viviana McGuire (Fall 1:09)
  (187, 69, 'consolation', '5th_Place', '028d938f-d7ae-499f-ba64-555f2db7e499', 'bf9c9c33-7302-4671-9503-8c4801d90c91', 'FALL', NULL, NULL, 69, true),
  -- D2 120: Abigail Naddeo over Madelyn Carmichael (Dec 12-5)
  (187, 70, 'consolation', '3rd_Place', 'b3388397-8f73-4872-beb6-b431c5a5b414', 'd23e7df0-a88a-437e-a1c6-6934f3d1f068', 'DEC', 12, 5, NULL, true),
  -- D2 120: Cristelle Fiestas over Elizabeth Turanskiy (Fall 4:35)
  (187, 70, 'consolation', '5th_Place', '51051ade-cc0c-4dbf-aaff-cd7aac1f7465', 'dbc0de60-43f5-4275-bf40-fb2f1938e9e7', 'FALL', NULL, NULL, 275, true),
  -- D2 126: Keaira Marshall over Trinity Shade (Fall 3:12)
  (187, 71, 'consolation', '3rd_Place', '4e3dbd0a-eada-4d22-b184-afcde1dacd79', 'c0008ee9-c9bf-49e2-962a-1345c68dfada', 'FALL', NULL, NULL, 192, true),
  -- D2 126: Isabella Grippo over Jess Guerra (Fall 0:51)
  (187, 71, 'consolation', '5th_Place', '7eb3a273-f91b-46cd-9ebe-09f8ca7f5d30', 'e24f143f-11ba-4ba0-ae19-5f865eebf1f9', 'FALL', NULL, NULL, 51, true),
  -- D2 132: Jennifer Torres over Tiana Diaz (Fall 0:09)
  (187, 72, 'consolation', '3rd_Place', '96342237-ad1a-4219-909a-13c8ab4ab721', '3b4468ae-95e0-40b1-9bd4-115a46a55a44', 'FALL', NULL, NULL, 9, true),
  -- D2 132: Janelly Lemus over Rodi Alexander (M. For.)
  (187, 72, 'consolation', '5th_Place', '9f8648b6-2abc-4aeb-89f1-2fb3316c0116', '5331091d-04fb-4f79-aec2-fdb3fc132b49', 'FORF', NULL, NULL, NULL, true),
  -- D2 138: Zoe Cruz over Aleida Garcia (Fall 1:15)
  (187, 73, 'consolation', '3rd_Place', 'f750a475-8fe0-41f2-8ed4-828cf0b46138', '4cbf5f30-4ae4-48d2-a4d2-c1733cb54a3b', 'FALL', NULL, NULL, 75, true),
  -- D2 138: Kaelynn Rodriguez over Forfeit A (For.)
  (187, 73, 'consolation', '5th_Place', 'ed61c638-8ab8-4321-acf0-d4f61281a69b', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D2 145: Olyvia Bowie over Izvella Avila (Fall 3:41)
  (187, 74, 'consolation', '3rd_Place', '6e406e06-afa5-47aa-8dd5-cbf335b3cea5', 'b6445b7f-d2ae-456a-a50b-6094787db8c4', 'FALL', NULL, NULL, 221, true),
  -- D2 145: Ashley Coronel over Victoria Frias (Fall 0:59)
  (187, 74, 'consolation', '5th_Place', '301a7906-f1ed-49bb-85c9-d04d0d96d9eb', 'f09d6b6d-783a-4738-abc9-414ccbf47c56', 'FALL', NULL, NULL, 59, true),
  -- D2 152: Natalia Fragomeni over Arianna Romero (Fall 3:44)
  (187, 75, 'consolation', '3rd_Place', '3b28219e-ee2c-4eb1-b0ee-b79ea27b4ab6', 'd7fc8016-39f3-4e48-96fb-7a49b4257185', 'FALL', NULL, NULL, 224, true),
  -- D2 152: Nadia Bibi over Aniyah Brown (Fall 0:07)
  (187, 75, 'consolation', '5th_Place', '832b5725-a360-4a95-8c07-904727099da6', '031d51e8-8909-4606-9596-d69dfd3edde5', 'FALL', NULL, NULL, 7, true),
  -- D2 165: Athena Galindo over Ariana Genao (Fall 4:25)
  (187, 76, 'consolation', '3rd_Place', '217eda1b-e6c6-49ee-93f0-d0e6bfb68201', '68af62cd-e123-4b6a-b353-fd5745230742', 'FALL', NULL, NULL, 265, true),
  -- D2 165: Chloe Capazzi over Chelsea Pinto (Fall 1:06)
  (187, 76, 'consolation', '5th_Place', 'ad8ce740-f4fb-4d69-916f-a869238a4c3a', '0b2251b9-06b2-4184-80e2-95dbe4217953', 'FALL', NULL, NULL, 66, true),
  -- D2 185: Madison Chuon over Zittalee Grande (Fall 0:35)
  (187, 77, 'consolation', '3rd_Place', 'a364f2a8-c498-4b49-b65c-9017c0b52de0', 'b5775317-f630-4ab7-8215-74fe3e2d7b07', 'FALL', NULL, NULL, 35, true),
  -- D2 185: Angeline Mendez over Forfeit A (For.)
  (187, 77, 'consolation', '5th_Place', '4c9d81f9-a62f-4928-994f-7e505a2d85f5', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D2 235: Darlin Portillo over Kaitlyn Walker (Fall 2:25)
  (187, 78, 'consolation', '3rd_Place', 'a165fad0-83df-48e7-b882-be94ee9e4b16', '07ac687a-9c97-43a8-93c9-03082816d66c', 'FALL', NULL, NULL, 145, true),
  -- D2 235: Avery Rodriguez over Forfeit A (For.)
  (187, 78, 'consolation', '5th_Place', '6b391897-54d9-47e7-a941-d4ad12628cb1', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D3 100: Belinda Minervini over Marielle Gonzalez (OT 2-1)
  (188, 67, 'consolation', '3rd_Place', 'a4ba67c7-5718-4bbd-b117-3fffa9234af3', 'e79adc68-00b6-4195-a733-1a0efe689083', 'SV-1', 2, 1, NULL, true),
  -- D3 100: Tori Stampone over Aviani Garcia (Fall 2:48)
  (188, 67, 'consolation', '5th_Place', '0fb361b7-f5db-421b-abbf-71ef390584ae', 'aa9696ee-f3f6-480e-92ef-1348199225ae', 'FALL', NULL, NULL, 168, true),
  -- D3 107: Chastelyn Ruiz over Chastelyn Hechavarria Vasquez (Dec 1-0)
  (188, 68, 'consolation', '3rd_Place', 'b9b017b6-1e28-4279-933b-c9f403b632b9', '3b6b0b2e-436d-4c59-86e4-c2ed58cbb5ef', 'DEC', 1, 0, NULL, true),
  -- D3 107: Isabella Drotos over Gracelyn Archuleta (MD 10-1)
  (188, 68, 'consolation', '5th_Place', 'e8f3fbac-53af-49e2-8570-d5217b157081', 'e522fa1a-6a33-455e-8b8f-b33adc591569', 'MD', 10, 1, NULL, true),
  -- D3 114: Mikayla Littlejohn over Lillianne Addabbo (Fall 2:55)
  (188, 69, 'consolation', '3rd_Place', '057c39d7-e0ac-45f4-92d0-3aa2efdc2d34', 'ad6b5fe3-55bc-4a5d-8f87-df2046a62fa3', 'FALL', NULL, NULL, 175, true),
  -- D3 114: Samantha Oblen over Riley Eve (MD 14-1)
  (188, 69, 'consolation', '5th_Place', 'fb64ad99-08fb-4acd-a2f3-73c152e88888', '352adb7f-9a42-4cbc-8019-c45a99fb5456', 'MD', 14, 1, NULL, true),
  -- D3 120: Ava Drew over Sabrina Jean Baptiste (Dec 8-1)
  (188, 70, 'consolation', '3rd_Place', 'dfa1c665-6fd5-4477-b7fd-7a2ab10cd114', '9310fab6-99cc-4df6-931c-de39762edbd8', 'DEC', 8, 1, NULL, true),
  -- D3 120: Nadine Abdel-Razek over Laila Marsala (Fall 0:31)
  (188, 70, 'consolation', '5th_Place', '782c86b7-eab6-4080-8fd3-a180120f8319', '3c241b02-3026-4699-827b-18f6d783772d', 'FALL', NULL, NULL, 31, true),
  -- D3 126: Ava Eisenman over Yishan Zhou (OT 13-10)
  (188, 71, 'consolation', '3rd_Place', 'f100600d-bd7d-44a1-a59d-d0d277af9bd2', '491c0bdb-e582-4e81-99ec-6c467b3c6bde', 'SV-1', 13, 10, NULL, true),
  -- D3 126: Genesis Acosta Soto over Peyton Rotbaum (Fall 5:02)
  (188, 71, 'consolation', '5th_Place', 'fc42ecd1-4c32-4624-8b57-506277765f68', '90615011-508c-4c52-adb8-4a986ccb93ad', 'FALL', NULL, NULL, 302, true),
  -- D3 132: Layla Thomas over Diana Herrera (Fall 1:52)
  (188, 72, 'consolation', '3rd_Place', 'a5e323aa-4a1d-4fc8-8146-ab0b1be8d140', '5556e47f-5e48-4f17-9222-50a1ab55c94b', 'FALL', NULL, NULL, 112, true),
  -- D3 132: Valeria Veliz over Maria Flores (Fall 1:33)
  (188, 72, 'consolation', '5th_Place', '9b0f9bf2-d490-4e38-87ac-0c62efe0555a', '87d48e87-e9cb-4027-b2d2-9463c7e7874d', 'FALL', NULL, NULL, 93, true),
  -- D3 138: Valeria Gomez Hernandez over Jade Mayo (Fall 1:05)
  (188, 73, 'consolation', '3rd_Place', '100bda72-7afc-43a2-95b2-34beb762095b', '3b701b7a-9e9c-4a4b-a413-12acd105426c', 'FALL', NULL, NULL, 65, true),
  -- D3 138: Victoria Francois over Claire Carey (For.)
  (188, 73, 'consolation', '5th_Place', '972416a5-ed29-4e16-95ca-6e42284acd46', '8600b274-8326-44d5-906b-93d96db655cf', 'FORF', NULL, NULL, NULL, true),
  -- D3 145: Ashley Bernal over Gabriella Correa (Fall 5:42)
  (188, 74, 'consolation', '3rd_Place', '6dcfeeea-9ffd-41ba-8710-1cc760a198e5', 'a469e0bc-4658-465b-9894-fb0c3050e2cf', 'FALL', NULL, NULL, 342, true),
  -- D3 145: Robexy Melendez Sanchez over Gia Brutus (Fall 1:39)
  (188, 74, 'consolation', '5th_Place', '465b80c3-1274-4c5e-bdca-fbf49e085087', 'fc55723c-32c7-4ba5-b223-ede89bf02fc8', 'FALL', NULL, NULL, 99, true),
  -- D3 152: Juliana Vargas over Anastasia Zarenin (Fall 1:43)
  (188, 75, 'consolation', '3rd_Place', '53b699ec-b818-42b8-9243-b95ad9ec24f5', '30e6e96f-3a14-434a-bb3a-dd8c7a3c587b', 'FALL', NULL, NULL, 103, true),
  -- D3 152: Alexa Huitzil over Sayde Hagensen (Fall 4:43)
  (188, 75, 'consolation', '5th_Place', '1bebeada-6903-42a3-a10c-80c5472eb0f6', 'bd4666c1-0276-43f0-bded-923e81f89954', 'FALL', NULL, NULL, 283, true),
  -- D3 165: Ava Montes de Oca over Forfeit (For.)
  (188, 76, 'consolation', '3rd_Place', '3938c57e-d829-4cf9-967a-0044a3c38bdb', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D3 185: Nazareth Santos over Nicole Romero Molina (Fall 1:51)
  (188, 77, 'consolation', '3rd_Place', '3aa04caf-1392-47c4-84f6-499564a2ca97', 'feb26f79-834c-4a82-a7ae-27eaae0c3105', 'FALL', NULL, NULL, 111, true),
  -- D3 185: Kyara Chiminazzo over Ashley Vilela Armijos (Fall 0:14)
  (188, 77, 'consolation', '5th_Place', 'c24e123c-ca78-4417-bcbe-76d9f5fbbb6b', 'ea86185d-74f7-47dd-ba74-26671e39ea32', 'FALL', NULL, NULL, 14, true),
  -- D3 235: Mon`Kenzie Esseya over Jasmin Valdez (Dec 4-2)
  (188, 78, 'consolation', '3rd_Place', '7234358b-1f7f-4373-809c-7e616979efc9', '70b42ab1-8635-4099-9664-6e55b1186a60', 'DEC', 4, 2, NULL, true),
  -- D3 235: Autumn Murray over Nina De La Vina (Fall 1:31)
  (188, 78, 'consolation', '5th_Place', '1f852162-23ec-4f37-ae99-5585ecd2c016', 'a038c206-5441-477b-9780-b958f88ff928', 'FALL', NULL, NULL, 91, true),
  -- D4 100: Ashly Sarceno over Alana Everett (Fall 0:59)
  (189, 67, 'consolation', '3rd_Place', 'ba6cb891-296c-4e40-9ad6-3007756e74f4', '8f32427a-90b5-4138-b9b8-48de9544294b', 'FALL', NULL, NULL, 59, true),
  -- D4 100: Kasey Salgado over Lexi Colan (Fall 1:53)
  (189, 67, 'consolation', '5th_Place', '98deef49-ef37-41e0-b9ce-000d1e531eae', '46dcf511-d9ec-4f03-8d16-75ad8b487dac', 'FALL', NULL, NULL, 113, true),
  -- D4 107: Gabrielle Ruedy over Lexi Galvan (Fall 1:53)
  (189, 68, 'consolation', '3rd_Place', '0c17ea10-20fa-462b-bd15-6bc90ef5e033', 'ca292122-dd81-4588-a64c-01a88f5c0e7a', 'FALL', NULL, NULL, 113, true),
  -- D4 107: Cayce Wang over Isabella Chirino (Fall 3:52)
  (189, 68, 'consolation', '5th_Place', 'd5ea7412-499b-4c8b-98d7-5e86afbdf201', 'dd843c78-412d-4f9a-9172-8fe622ecc1ec', 'FALL', NULL, NULL, 232, true),
  -- D4 114: Marianna Zegel over Cameron Steele (Fall 0:43)
  (189, 69, 'consolation', '3rd_Place', '1379c0f4-cec7-43a8-b430-f0b336b7b597', '5ac988f2-fb5f-4636-96a7-ced0b0b4c0a6', 'FALL', NULL, NULL, 43, true),
  -- D4 114: Mariel Maldonado over Maryori Lopez Gonzalez (Fall 2:30)
  (189, 69, 'consolation', '5th_Place', '23d0f20b-ca63-4758-8724-ba981b4ba847', 'cdeb88e9-998d-483c-aece-4f0b9a3b6fb3', 'FALL', NULL, NULL, 150, true),
  -- D4 120: Kailee Alford over Sared Mata (MD 12-4)
  (189, 70, 'consolation', '3rd_Place', '140083a7-dd0f-4d91-93e9-a84eafd4aa66', 'd07bf6d9-9ee0-4102-9496-ffea6c1d1f33', 'MD', 12, 4, NULL, true),
  -- D4 120: London Townes over Bree Rocco (For.)
  (189, 70, 'consolation', '5th_Place', 'a9cc63d5-00c0-40d8-b804-ba94445aa95f', '7a4b2127-c3ef-42bd-ac74-7c48eeb0f08c', 'FORF', NULL, NULL, NULL, true),
  -- D4 126: Maia Sierra over Emily Paguay (Fall 3:28)
  (189, 71, 'consolation', '3rd_Place', '4f486736-8895-45db-9433-c6cbb8d5d267', 'd6fb8795-1404-49f1-81e3-dba2f6ae620a', 'FALL', NULL, NULL, 208, true),
  -- D4 126: Tiffany Guanoquiza Restrepo over Brynn Hines (Fall 3:33)
  (189, 71, 'consolation', '5th_Place', '28f7c343-99f8-461f-91b1-d5943b05ebae', 'd4dcde53-3ac3-4154-9f06-8a7a008dec27', 'FALL', NULL, NULL, 213, true),
  -- D4 132: Ruby Meagher over Allison Castellanos (Fall 1:07)
  (189, 72, 'consolation', '3rd_Place', '154c341c-6501-42d8-a1b2-65eb490cb0a8', '23f43652-4cb4-4a7b-8f32-86057006c630', 'FALL', NULL, NULL, 67, true),
  -- D4 132: Gianna Leggio over Makayla Harris (Fall 1:18)
  (189, 72, 'consolation', '5th_Place', 'f7e36808-4a9a-404c-99b1-69dd0e47240c', 'd8201744-c60b-4dc2-b061-d95cc0bdfa47', 'FALL', NULL, NULL, 78, true),
  -- D4 138: Taylor Horton over Ariana Soria (M. For.)
  (189, 73, 'consolation', '3rd_Place', 'd58daab0-351c-46fb-b59c-2b9d75ba92fe', 'c74abf3d-1ee3-4bd2-8c50-d8a492d9c118', 'FORF', NULL, NULL, NULL, true),
  -- D4 138: Pearl Senelorm over Juannis Rios (MD 13-2)
  (189, 73, 'consolation', '5th_Place', '33470e4b-4160-4d8e-ad96-40f2fdae107d', '3c57c583-8d75-47d6-a34b-ba8401e23479', 'MD', 13, 2, NULL, true),
  -- D4 145: Airyon Mitchell over Carolina Paz (Fall 5:09)
  (189, 74, 'consolation', '3rd_Place', '657f3b4e-4ebf-4d1d-addd-6c4c5eb3b420', '58bbf44f-1742-40f7-b2b0-3b1f311fbb0c', 'FALL', NULL, NULL, 309, true),
  -- D4 145: Amy Rosillo over Veronica Velazquez (Fall 3:30)
  (189, 74, 'consolation', '5th_Place', '88616d1c-9515-4492-911f-8a7361f93dea', '60238cf1-98df-4c29-a3d0-7b99537300f3', 'FALL', NULL, NULL, 210, true),
  -- D4 152: Hailey Ventura over Desinty Okoye (Fall 2:59)
  (189, 75, 'consolation', '3rd_Place', 'e6a4928a-1439-4719-a4a8-c93519fdf14d', 'af2d5022-f627-4a34-bb56-bf8eeb636b84', 'FALL', NULL, NULL, 179, true),
  -- D4 152: Madison Belton over Jailynn Robinson (Fall 4:51)
  (189, 75, 'consolation', '5th_Place', 'f9b9d170-e138-41a8-af60-67b9c7fb3ad4', 'dfb5c60a-d415-49a7-8678-f5407376cb91', 'FALL', NULL, NULL, 291, true),
  -- D4 165: Arianna Buttitta over Anaiz Barbecho (Fall 1:49)
  (189, 76, 'consolation', '3rd_Place', '592521b2-1b95-43b6-a1ec-ae07114175ec', '2f8731d9-94bb-4e93-ab0c-6df5095001f1', 'FALL', NULL, NULL, 109, true),
  -- D4 165: Liana Garcia over Nia Singhal (For.)
  (189, 76, 'consolation', '5th_Place', '19e9dc03-6c02-41f8-81e8-5fc47465a4b8', 'b5558ecd-7116-4e24-94d7-cbe3fc382e28', 'FORF', NULL, NULL, NULL, true),
  -- D4 185: Issy Beam over Ashly Cruz (MD 12-4)
  (189, 77, 'consolation', '3rd_Place', 'fc96b0e1-91b9-4b3f-86f4-fcaa121faf51', '25055ae2-950c-4975-b5b5-c3ea79db4c19', 'MD', 12, 4, NULL, true),
  -- D4 185: Azalea Tejada over Skylar Lawrence (MD 16-5)
  (189, 77, 'consolation', '5th_Place', '307d872b-a766-4829-b165-adb844267aa9', '6b012727-36c9-4901-83aa-3ed1b403de0b', 'MD', 16, 5, NULL, true),
  -- D4 235: Ibukunoluwa Badmos over Mosie Prince (Fall 1:04)
  (189, 78, 'consolation', '3rd_Place', '8b036d9a-0605-47bd-8c68-e1f2cc9fa022', '180a1538-95bc-4826-beea-272e7a671d03', 'FALL', NULL, NULL, 64, true),
  -- D4 235: Jala Davis over La`Niyah Hercules (Fall 5:54)
  (189, 78, 'consolation', '5th_Place', 'df2613f0-9bb9-45e7-aa22-95a3842e2fac', '8783fef4-0ee9-4da2-9754-11eee57e7623', 'FALL', NULL, NULL, 354, true),
  -- D5 100: Leslie Vera over Sarah Nisenbaum (MD 18-10)
  (190, 67, 'consolation', '3rd_Place', '4ad2f54f-73bf-4f5b-a2ee-6b7f62877d8e', '3e5a03f3-d74d-4bf0-abb6-38d0eee0fb7d', 'MD', 18, 10, NULL, true),
  -- D5 100: Tara Maloy over Mia Meneses (Fall 1:01)
  (190, 67, 'consolation', '5th_Place', 'b4ff655d-5d02-4bdb-85e8-166f2cbfc1d3', 'f1f20ba9-4cee-48b4-98de-24ba0d6ac52a', 'FALL', NULL, NULL, 61, true),
  -- D5 107: Angelina Mejia over Jia Battles-Cobb (Fall 0:36)
  (190, 68, 'consolation', '3rd_Place', '85e7f165-55dd-4062-90da-6531b96acde9', '36826e5f-9a57-43d1-8cfb-61f7abcccc01', 'FALL', NULL, NULL, 36, true),
  -- D5 107: Mya Lopez over Emma White (Fall 2:00)
  (190, 68, 'consolation', '5th_Place', '0e0e45e7-7783-430a-bca9-213a551d40dc', 'c0592b44-66b6-4a8c-a4a0-7b2e22fa3044', 'FALL', NULL, NULL, 120, true),
  -- D5 114: Maria Garcia over Andrea Carire Cruz (Fall 0:36)
  (190, 69, 'consolation', '3rd_Place', 'c35ae123-205c-4c4c-97d1-11afacf28500', '688803c5-a8d7-4733-8158-b19c7a4bfe90', 'FALL', NULL, NULL, 36, true),
  -- D5 114: Alison Puchuelo Sanchez over Eudoxia Valdivia (Fall 1:29)
  (190, 69, 'consolation', '5th_Place', '2da2b39f-a49b-428b-a788-899caa1f3d91', 'c513fc1b-39e6-4a73-bd25-39685c9f6f07', 'FALL', NULL, NULL, 89, true),
  -- D5 120: Adriana Fernandez over Charlize Hayes (Fall 2:22)
  (190, 70, 'consolation', '3rd_Place', '464bb2c4-ee4c-4a46-982c-b1368f66f0ac', '621c9f7e-ed18-4927-a882-ba823f318860', 'FALL', NULL, NULL, 142, true),
  -- D5 120: Liana Rodriguez over Maeve Perry (For.)
  (190, 70, 'consolation', '5th_Place', 'a0f19ed5-a325-4744-9fc3-52ce8b167aff', 'a7efcc09-ae33-4df3-91ee-04593c6e3f5f', 'FORF', NULL, NULL, NULL, true),
  -- D5 126: Kamryn Hansen over Valerie Cumakova (Fall 3:22)
  (190, 71, 'consolation', '3rd_Place', '98a2db66-293a-47bb-a18d-5c383c834c91', '2a866ec1-5212-41f3-bef1-8a4164c337d9', 'FALL', NULL, NULL, 202, true),
  -- D5 126: Sophia MacArthur over Teana Lustal (Fall 1:42)
  (190, 71, 'consolation', '5th_Place', 'a126ca1c-7ad5-48a8-8195-c1d87fc473ca', '4cd83229-2cc4-4264-840f-54540eaa310a', 'FALL', NULL, NULL, 102, true),
  -- D5 132: Heaydy Gonzalez over Fergie Perez Martinez (Dec 9-5)
  (190, 72, 'consolation', '3rd_Place', '07b787c4-399e-4c7c-8db2-702a05db518e', 'c32dfc11-aad9-4810-a990-ce8e5360306f', 'DEC', 9, 5, NULL, true),
  -- D5 132: Ashly Canar over Madison Garcia- Xoloc (Dec 7-5)
  (190, 72, 'consolation', '5th_Place', '0f289d2a-80be-412f-b629-af9674a09ad9', '4fcac206-fe94-46fd-a02e-9d6c398b700e', 'DEC', 7, 5, NULL, true),
  -- D5 138: Cassidy Costello over Sophia Stacy (Fall 1:23)
  (190, 73, 'consolation', '3rd_Place', '4fec4b6b-7780-47fe-b7cd-f9e9dd7dcfdd', '9d18cf80-2e67-43bc-b474-e36b01b76aa9', 'FALL', NULL, NULL, 83, true),
  -- D5 138: Giana Devizio over Ariana Nova (Fall 1:05)
  (190, 73, 'consolation', '5th_Place', 'c0e37883-4d12-4d13-999e-11c09a78db77', 'd36eb5e1-d971-4d28-8798-8f112ba8fde5', 'FALL', NULL, NULL, 65, true),
  -- D5 145: Xiana Reymundo Inga over Ebubechi Moore (Fall 3:16)
  (190, 74, 'consolation', '3rd_Place', '4cf1b4b6-2de9-4ebb-8cf3-abd9d5d8f7cd', '083d80c4-a9a1-4ae5-ac49-a21db6e347c8', 'FALL', NULL, NULL, 196, true),
  -- D5 145: Daniela Fasca-Morales over Cassidy Jackson (Fall 3:08)
  (190, 74, 'consolation', '5th_Place', '0daf1f53-4d8c-40a1-b78b-c13dd9de57b9', 'f15732a8-d749-4eb2-8e9c-25e5a1a30d65', 'FALL', NULL, NULL, 188, true),
  -- D5 152: Zamiya Wright over Vivianna Avent (Fall 1:49)
  (190, 75, 'consolation', '3rd_Place', 'a7506167-0453-4e53-b292-80b7c277d30a', 'b4908652-4c46-4736-b320-79e949e597e5', 'FALL', NULL, NULL, 109, true),
  -- D5 152: Anjelyn Liz over Sara Vidarte Escudero (Fall 2:51)
  (190, 75, 'consolation', '5th_Place', 'a282c398-27cf-4a79-bb2c-ac7de48ddd1a', '8cefa2df-e2fd-40fc-a5da-c2f60d23abac', 'FALL', NULL, NULL, 171, true),
  -- D5 165: Saya Zamor over Dai`Ja Coleman (Fall 0:13)
  (190, 76, 'consolation', '3rd_Place', 'ce014746-4b2b-4629-82c4-cb29eb61b90c', '55cd35bd-5a8b-48ac-87c3-f3eb1aa158f3', 'FALL', NULL, NULL, 13, true),
  -- D5 165: Diana Darisme over Angelica Garcia (Inj. 0:00)
  (190, 76, 'consolation', '5th_Place', '8360669d-7a7b-48d3-b6ae-6ead395c7c64', '79e62878-56d7-49c5-a3a4-7470e2e27947', 'INJ', NULL, NULL, NULL, true),
  -- D5 185: Jaylind Gonzalez over Bella Luna (Dec 14-9)
  (190, 77, 'consolation', '3rd_Place', '799f5f4e-6388-41a1-bb76-ff1d81d516cb', 'd8638ee7-cd2a-4613-9e5c-f781ccd3f7e4', 'DEC', 14, 9, NULL, true),
  -- D5 185: Elizabeth Snyder over Melanie Rodriguez (Fall 2:24)
  (190, 77, 'consolation', '5th_Place', '5f70911c-d75c-4f7b-9f8c-f03d39b26d32', 'b92c6ed8-2efe-4ed4-9f53-6f64d83a1a19', 'FALL', NULL, NULL, 144, true),
  -- D5 235: Esther Adjogble over Arabia Walker (Fall 0:18)
  (190, 78, 'consolation', '3rd_Place', '56e3568d-1bea-4f8c-b673-dd7bb508c41e', '9ac8d2f4-6600-4b1d-8bfe-e1eca90e0895', 'FALL', NULL, NULL, 18, true),
  -- D5 235: Karina Quezada over A Forfeit (For.)
  (190, 78, 'consolation', '5th_Place', 'c6d86192-3858-4193-aa1d-746459f75d53', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D6 100: Lydia Bagley over Sarisbel Rodriguez (Fall 2:49)
  (191, 67, 'consolation', '3rd_Place', '4996619a-8d40-4310-bd06-da36d0cfd7aa', '23316eca-3f8a-43a1-8697-6fe847979bbe', 'FALL', NULL, NULL, 169, true),
  -- D6 100: Madison Kelly over Tara Muni (Fall 0:24)
  (191, 67, 'consolation', '5th_Place', '9d3f6155-5ab7-40bf-a891-bd81c93d3a3a', '1403853a-190c-4866-b3f5-5b3c09ea0edf', 'FALL', NULL, NULL, 24, true),
  -- D6 107: Alessandra Armenti over Kiara Chac (MD 11-0)
  (191, 68, 'consolation', '3rd_Place', 'd1fe20fd-625c-43af-b5c8-32fd333b7db2', 'f32ba168-85e6-4f67-8af7-da96223e206b', 'MD', 11, 0, NULL, true),
  -- D6 107: Adelaide Reist over Sophia Monge (Fall 3:40)
  (191, 68, 'consolation', '5th_Place', '0081d32e-cf3d-4122-877a-1788edaf5a14', 'afd69c96-a87b-415f-becb-594bbb2c6d2d', 'FALL', NULL, NULL, 220, true),
  -- D6 114: Briana Butler over Pamela Lamptey (Fall 3:01)
  (191, 69, 'consolation', '3rd_Place', 'f6efddf5-c440-4688-98d4-3ef8f5c73185', 'b92d1151-0de3-47e0-80da-63cd175590d1', 'FALL', NULL, NULL, 181, true),
  -- D6 114: Brianna Castillo over Mrunal Patil (Fall 2:30)
  (191, 69, 'consolation', '5th_Place', '2a223abd-96c9-45ea-9d50-0d0da98c7bcf', 'e53a7e97-ae63-4d03-a4f4-eb6e0f0b94d8', 'FALL', NULL, NULL, 150, true),
  -- D6 120: Paige Karp over Skylar Karpew (M. For.)
  (191, 70, 'consolation', '3rd_Place', 'bc5d6aae-07fa-428d-87ee-31b3dea00ddc', '29acc63b-4387-4289-a3c4-c8724b3337c5', 'FORF', NULL, NULL, NULL, true),
  -- D6 120: Arianny Gomez over Juliet Duda (Fall 2:33)
  (191, 70, 'consolation', '5th_Place', '4958b96a-aaf2-4131-a4d4-40a2f9e42c24', 'f25574c5-a55d-4fdb-bde9-ba53566d449a', 'FALL', NULL, NULL, 153, true),
  -- D6 126: Carly Poggio over Gwendolyn Falkovich (Fall 1:02)
  (191, 71, 'consolation', '3rd_Place', '712db70e-c2f8-4f93-b893-f5420c9d1c64', '1ecf27c4-ea37-4ef7-bc17-e9ff355bd3d9', 'FALL', NULL, NULL, 62, true),
  -- D6 126: Nahomi Mejia-Artica over Alexandra Strauss (MD 13-0)
  (191, 71, 'consolation', '5th_Place', 'ac7ecb9a-9678-46a3-833c-838e1b1da4e4', 'f01888f7-4fbd-4550-81bf-9367ccd29021', 'MD', 13, 0, NULL, true),
  -- D6 132: Shpresa Leka over Yarilenny Moronta (Fall 1:31)
  (191, 72, 'consolation', '3rd_Place', 'd101e463-6638-41fe-a087-90f8db4c11b5', '3b81cd48-0d53-48a9-8975-b2187618034d', 'FALL', NULL, NULL, 91, true),
  -- D6 132: Adriana Henriquez over Janeliz Carvajal (Fall 1:56)
  (191, 72, 'consolation', '5th_Place', 'aa6d996e-a86c-40ab-ad18-4ace8cfbc609', 'f687768e-df00-4192-9ddc-3a16df9dcb84', 'FALL', NULL, NULL, 116, true),
  -- D6 138: Gladys Castro-Parraguez over Kaelyn Djaba (Fall 1:36)
  (191, 73, 'consolation', '3rd_Place', '33482907-657c-493e-b9de-ee8ffd9ff4b5', 'b615674d-f907-43b7-9c95-64b32275fb5e', 'FALL', NULL, NULL, 96, true),
  -- D6 138: Jazmine Lugo over Angie Cojon Mauricio (MD 13-4)
  (191, 73, 'consolation', '5th_Place', '6981d23b-c88e-4984-ae20-2805b6a322fc', '475a6650-3ccd-4b7a-81e9-67e738bbdef5', 'MD', 13, 4, NULL, true),
  -- D6 145: Kiera Gallagher over Samantha Laguna-Cano (Inj. 0:00)
  (191, 74, 'consolation', '3rd_Place', '5cede9fa-ce3f-431d-a107-a941a51834fd', '9ce3e7e5-db0f-4cd2-87fe-31fbaa2fce74', 'INJ', NULL, NULL, NULL, true),
  -- D6 145: Kayleigh Howarth over Joyce Quesada (Fall 0:51)
  (191, 74, 'consolation', '5th_Place', 'd7535c47-a7e3-427c-b873-4539dcdc577b', 'fc07dfb3-1cc8-45c7-b8b8-c25f072fb735', 'FALL', NULL, NULL, 51, true),
  -- D6 152: Celeste Falkovich over Madison Favereaux (Fall 1:11)
  (191, 75, 'consolation', '3rd_Place', '7903abe6-d1f3-4185-9844-ba2f084b8a17', '6bfe68a2-982e-48d6-803a-37b8b9fae706', 'FALL', NULL, NULL, 71, true),
  -- D6 152: Gania Moran over Faith Castro (M. For.)
  (191, 75, 'consolation', '5th_Place', '293e3170-0513-4b8f-b98c-848d0917cf6a', 'ba6f358a-abce-4144-af41-1c866655385b', 'FORF', NULL, NULL, NULL, true),
  -- D6 165: Shila Richardson over Lyneth Cole-Stuckey (Dec 12-9)
  (191, 76, 'consolation', '3rd_Place', 'fc79fc29-b32c-4a76-8fe7-9646dd5884e0', '9ef023b7-7147-44d3-8be2-d582ab2bedc7', 'DEC', 12, 9, NULL, true),
  -- D6 165: Mayra Avalos over Emily Cruz-Saldivar (M. For.)
  (191, 76, 'consolation', '5th_Place', '4f1ec056-0baa-435b-98e1-569f79d69f7e', '77af93eb-ca5f-4880-879e-949613f88f1a', 'FORF', NULL, NULL, NULL, true),
  -- D6 185: Madilyn Rios over Anaheim Alvardo-Martinez (Fall 0:57)
  (191, 77, 'consolation', '3rd_Place', '9a27e819-2f14-4495-8aa0-c9c8da2c06d8', 'df565c90-2f23-4317-ac4a-8b638bf4f4ad', 'FALL', NULL, NULL, 57, true),
  -- D7 100: Victoria Longo over Mia Gallo (Fall 1:35)
  (192, 67, 'consolation', '3rd_Place', 'b59215d2-1198-4f81-9a60-9414bd30c73d', '9697e020-672a-48c1-bce1-64ddf65a046a', 'FALL', NULL, NULL, 95, true),
  -- D7 100: Amairani Marin-Juarez over Leah Rodriguez-Reyes (Fall 0:37)
  (192, 67, 'consolation', '5th_Place', '1734f00e-3c1b-4020-be66-b57f20ccca77', '70996771-a0e4-4e7e-a754-ccd4f8b170fe', 'FALL', NULL, NULL, 37, true),
  -- D7 107: Eileen Guan over Erika Stanley (Fall 0:56)
  (192, 68, 'consolation', '3rd_Place', 'ebca7478-d891-444a-b754-435e7b7a01e2', '59b9cab0-4f57-4961-a2fd-0d2127b06ad5', 'FALL', NULL, NULL, 56, true),
  -- D7 107: Maite Balbuena over Madison Burgos (Fall 1:06)
  (192, 68, 'consolation', '5th_Place', '3f5161ee-ecfa-4e73-bc29-7c35902d931f', 'c6cfbe11-404f-4a55-8f0c-e2255223368f', 'FALL', NULL, NULL, 66, true),
  -- D7 114: Kaory Olvera over Valerie Cicero (Fall 4:27)
  (192, 69, 'consolation', '3rd_Place', '01949198-6079-4c8c-842b-2bc8e1b83d73', '180b1311-96cd-4e0e-b784-aeb35c144116', 'FALL', NULL, NULL, 267, true),
  -- D7 114: Francis Peraza over Emily Cuomo (Fall 3:30)
  (192, 69, 'consolation', '5th_Place', '113b8292-3096-4c9e-aaf0-a15e333cbac2', '5fb3b83d-669f-4a20-9dec-8df3df328a29', 'FALL', NULL, NULL, 210, true),
  -- D7 120: Julia Berk over Elizabeth Moshos (Fall 0:47)
  (192, 70, 'consolation', '3rd_Place', 'a381ab66-b3f3-4348-88ed-44b464c11015', '966e101f-bad5-4363-ba3d-2b21bea152f9', 'FALL', NULL, NULL, 47, true),
  -- D7 120: Lily Didomenico over Lily Shah (Fall 4:22)
  (192, 70, 'consolation', '5th_Place', '48408e19-0ef8-49e9-8fb2-4b9e53692138', '638b68ab-8b2e-43f8-a572-027bb6d46117', 'FALL', NULL, NULL, 262, true),
  -- D7 126: Layla Dadzie over Ryleigh Lynch (Dec 5-1)
  (192, 71, 'consolation', '3rd_Place', '6ce3b1bd-8a9c-449a-ae85-28cc9a1f0c3a', 'e9d67542-f960-4358-943a-2b7327adf431', 'DEC', 5, 1, NULL, true),
  -- D7 126: Mia Albertelli over Mahwish Khan (Fall 0:54)
  (192, 71, 'consolation', '5th_Place', '2bbe7ee7-a61e-40e8-8656-67d9b75775b9', 'b5840594-21ba-4d84-9d8f-d4b7d497c1ae', 'FALL', NULL, NULL, 54, true),
  -- D7 132: Sophia Sgalambro over Delaney Kiernan (Dec 7-2)
  (192, 72, 'consolation', '3rd_Place', '18979084-262a-45d9-bef9-3f43c6f2de34', '195e5ad4-fb6c-4adf-a7f6-701d08b1bb10', 'DEC', 7, 2, NULL, true),
  -- D7 132: Izabella Quintela over Natali Cabrera (For.)
  (192, 72, 'consolation', '5th_Place', '8823ed5f-5701-49bc-8377-4ff8af87e9ee', 'd660aa59-833b-492e-83de-a18a3a530266', 'FORF', NULL, NULL, NULL, true),
  -- D7 138: Jill Falzon over Kelin DeJesus (Fall 0:22)
  (192, 73, 'consolation', '3rd_Place', '12dc6bac-05b6-4ff3-8d69-71cc46c4e05f', '7b711e30-4506-4cc0-aab6-f46e075b22c5', 'FALL', NULL, NULL, 22, true),
  -- D7 138: Valeria Lopez-Lemus over Vanessa Taborda (Dec 9-6)
  (192, 73, 'consolation', '5th_Place', 'd0ef5a4b-9ecc-434d-a95d-8ae2796c64a6', 'eeeb4d97-c4f4-48fd-9939-8a36d77df3ca', 'DEC', 9, 6, NULL, true),
  -- D7 145: Kaylee Chiapa Bendito over Arianna Villa-Harper (Fall 2:22)
  (192, 74, 'consolation', '3rd_Place', 'be50e3d4-b67b-4334-8c8a-9538e006b815', 'b6dc2378-8c83-4fe0-b257-a310a81a82a8', 'FALL', NULL, NULL, 142, true),
  -- D7 145: Michelle Donohue over Liv Jackson (Fall 3:55)
  (192, 74, 'consolation', '5th_Place', 'e49d85a5-e7f7-46b1-a35d-3f1cabe17155', 'fe6c7007-9d4d-4594-bd4c-bc60eca97461', 'FALL', NULL, NULL, 235, true),
  -- D7 152: Zaire Romero over Isabella Kay (Fall 5:27)
  (192, 75, 'consolation', '3rd_Place', 'cea90775-b160-4bdf-b5c2-8d47535544c0', '9ff61882-4843-4dce-928e-b536d88dfdf1', 'FALL', NULL, NULL, 327, true),
  -- D7 152: Heidi Listopad over Amelia Ricardo (Fall 0:42)
  (192, 75, 'consolation', '5th_Place', '84e1b837-5209-4e40-9fc5-70badc556e4c', '361d7197-875a-44f0-9d73-1a7780cf528e', 'FALL', NULL, NULL, 42, true),
  -- D7 165: Faith Marie Soto over Abigail O`Neill (Fall 1:24)
  (192, 76, 'consolation', '3rd_Place', '2fb90e90-1540-4e97-8f77-00f9e885808a', '4fe45eb7-1bd0-4dc1-ae8c-c16538f62595', 'FALL', NULL, NULL, 84, true),
  -- D7 165: Kayla Cesiano over Kiana Sherwood (Fall 3:09)
  (192, 76, 'consolation', '5th_Place', '5eb2f8bf-622c-430f-b40b-85756b841271', '93f4c3d1-56ba-4e0d-b0b0-ead241b30ada', 'FALL', NULL, NULL, 189, true),
  -- D7 185: Michayla Smith over Judy Abdalate (Dec 4-2)
  (192, 77, 'consolation', '3rd_Place', 'c2dc43f7-ae25-43d2-82e3-b0e9b7920c08', '3475bc8c-ffd5-4a5a-9e46-0d7adbd848da', 'DEC', 4, 2, NULL, true),
  -- D7 185: Mia Marin-Torralba over Marisol Torra (M. For.)
  (192, 77, 'consolation', '5th_Place', '2c66f401-022e-4cf2-adbc-ec6a87107a86', 'fb34096e-14e2-4c61-9c43-3550c2306145', 'FORF', NULL, NULL, NULL, true),
  -- D7 235: Gabriella Estrada over Rachel Erlich (Fall 4:23)
  (192, 78, 'consolation', '3rd_Place', '89a55222-4510-4d65-8a41-38e89491ca98', 'c9d4d978-d357-48ac-b228-fceeba8845d1', 'FALL', NULL, NULL, 263, true),
  -- D7 235: Michell Barrios over (bye) (Bye)
  (192, 78, 'consolation', '5th_Place', '2cc6de16-04f8-41c6-8a51-dee91f555464', NULL, 'BYE', NULL, NULL, NULL, true),
  -- D8 100: Emma Merritt over Khrissy Oliveira (Fall 3:29)
  (193, 67, 'consolation', '3rd_Place', 'b0c60686-2446-4c98-959b-83dc2b69dfc1', 'a1fe5d73-2c03-403e-af51-db626f81126c', 'FALL', NULL, NULL, 209, true),
  -- D8 100: Cristal Burdier over Sophie Katz (Fall 3:14)
  (193, 67, 'consolation', '5th_Place', 'b04d5194-4008-45a9-9d2c-e181788129ee', '1e69daaf-54b9-4bb9-8cd8-ca590376e6e9', 'FALL', NULL, NULL, 194, true),
  -- D8 107: Danielle Silva De Jesus over Arielle Babineau (Fall 3:17)
  (193, 68, 'consolation', '3rd_Place', '9233fc2a-03d5-4653-9342-0c9ad4350153', '4d1c324b-62c1-4c62-a4d3-db96a9f8abdc', 'FALL', NULL, NULL, 197, true),
  -- D8 107: Xinlan Xu over Olivia Boone (Fall 3:01)
  (193, 68, 'consolation', '5th_Place', 'b948a722-e479-4bdd-8d15-3825ec613d26', '55a80d45-a885-4dde-bc7f-221b3e55fa4d', 'FALL', NULL, NULL, 181, true),
  -- D8 114: Stella Bove over Leslie Velecela (Fall 4:23)
  (193, 69, 'consolation', '3rd_Place', 'b3df5b3a-faa9-4fce-997e-73fee9bc0a0f', '93c2d24b-6ac8-42ef-8bf0-7dc91f340caa', 'FALL', NULL, NULL, 263, true),
  -- D8 114: Hannah Jang over Nyla Bartuck (Fall 0:54)
  (193, 69, 'consolation', '5th_Place', '44c049d5-6a46-4088-b951-416469f40b21', '1c09eda2-d3d7-4911-8674-5387dab885b8', 'FALL', NULL, NULL, 54, true),
  -- D8 120: Sophia Guzikowski over Valeria Trujillo (TB-1 5-4)
  (193, 70, 'consolation', '3rd_Place', 'd4b4f323-03d6-4781-91ad-6cab97a86319', '82fc9c85-c899-419d-8445-70e9ef4f8779', 'TB-1', 5, 4, NULL, true),
  -- D8 120: Lucianna Plantamura over Lexi Schumann (Fall 1:44)
  (193, 70, 'consolation', '5th_Place', '32efefd8-52b1-4490-b311-5e8250d5e2d2', '1ec38e04-1b58-4ead-8a4b-963518b08b38', 'FALL', NULL, NULL, 104, true),
  -- D8 126: Rodaina Elshafey over Ashley Clark (Fall 0:20)
  (193, 71, 'consolation', '3rd_Place', 'ce9b7c77-b598-4b07-85ce-28ed84a79bbc', 'd0ec201b-803a-4de3-9f1c-67d3ae5f85b0', 'FALL', NULL, NULL, 20, true),
  -- D8 126: Ahaana Budhiraja over Phoebe Callahan (Fall 4:27)
  (193, 71, 'consolation', '5th_Place', 'bd0fe0d4-f121-4cc1-93db-d0b1d79e623c', '629f26ce-1f73-4067-837c-d742892fc1ce', 'FALL', NULL, NULL, 267, true),
  -- D8 132: Naysha Rivera over Deema Saleh (Fall 1:23)
  (193, 72, 'consolation', '3rd_Place', '65d55526-eb9e-4e3d-8d83-cab8d000d7a0', 'fc819f5a-7535-42ff-a4d6-945a93fcd5a8', 'FALL', NULL, NULL, 83, true),
  -- D8 132: Jaylyn Jarrett over Alexxa Henriquez (Fall 0:44)
  (193, 72, 'consolation', '5th_Place', '8a7a5d1c-fe4b-417b-b378-febf012bb3bb', '63725311-48d2-48be-ba89-6ebc43693d40', 'FALL', NULL, NULL, 44, true),
  -- D8 138: Caroline Samayoa Alencar over Ashley Huitz-Gonzalez (Fall 1:07)
  (193, 73, 'consolation', '3rd_Place', '6cc3a4cc-f269-4018-b740-ba47c524063c', '9e803d85-87f2-498c-b992-dc8df31c2001', 'FALL', NULL, NULL, 67, true),
  -- D8 138: Britney Rocha over Angie Fuentes (Fall 4:59)
  (193, 73, 'consolation', '5th_Place', 'ac2ef6c9-f620-4aaa-bf3c-9eb129bd0d01', '25cbe8c3-2dc1-4380-b356-18c3b1d9846e', 'FALL', NULL, NULL, 299, true),
  -- D8 145: Emma Rollins over Julie Toribio (Fall 1:36)
  (193, 74, 'consolation', '3rd_Place', '19293710-f2bf-4bfc-bc26-46b708be1498', '636b6507-9353-4896-93d5-c24862fee795', 'FALL', NULL, NULL, 96, true),
  -- D8 145: Nelcy Guzman over Hailey Hawkes (Fall 3:57)
  (193, 74, 'consolation', '5th_Place', '549fb2cf-5b44-4017-bba2-910bbe7443f4', '0e237971-c702-4d3f-a07c-4e4684b52d00', 'FALL', NULL, NULL, 237, true),
  -- D8 152: Jordan Chan over Angeles Tule (Dec 5-3)
  (193, 75, 'consolation', '3rd_Place', 'e823112b-f150-4262-999f-17dfadd91791', 'c60d1d2a-1888-4266-9f02-b44a444c00ff', 'DEC', 5, 3, NULL, true),
  -- D8 152: McKenzie Bellack over Ganna Lystiuk (For.)
  (193, 75, 'consolation', '5th_Place', '1bf3e525-2391-4200-9e1c-084d4df89d3e', '6f301c1d-d8b8-4ac6-b5d1-2d42d1aee664', 'FORF', NULL, NULL, NULL, true),
  -- D8 165: Danielle Narmah over Theodora Milchanoski (Fall 3:36)
  (193, 76, 'consolation', '3rd_Place', 'e9d36115-146a-466b-b5c4-51220e41a780', 'b3a951cb-0199-4222-bbf1-c182b888fab8', 'FALL', NULL, NULL, 216, true),
  -- D8 165: Francesca Pignata over Katie Huitz-Gonzalez (For.)
  (193, 76, 'consolation', '5th_Place', '631e5bc4-6b2d-4720-9839-d30120a79255', 'c47f54ba-3757-489c-9e13-23f6792f419c', 'FORF', NULL, NULL, NULL, true),
  -- D8 185: Emilyn Cardona over Tianna Kee (Fall 1:02)
  (193, 77, 'consolation', '3rd_Place', '4ef32600-286d-47af-852e-de96641ddad5', 'dfb772a5-2f1b-4ce8-940b-cdb853bd73c6', 'FALL', NULL, NULL, 62, true),
  -- D8 235: Katie Barrios over Camila Figueroa (Fall 4:26)
  (193, 78, 'consolation', '3rd_Place', '2f67e180-7d5f-4251-b284-f6bbcbb835e8', 'a7b610a6-9535-4d91-a111-19d7e6eb49c8', 'FALL', NULL, NULL, 266, true),
  -- D8 235: Kayla Kerr over Fransinne Louis (Fall 3:18)
  (193, 78, 'consolation', '5th_Place', 'e392928b-d2f3-47d0-9121-64e0096a171e', 'c324ee9d-1173-4a9a-89a0-d2b48f31fda0', 'FALL', NULL, NULL, 198, true),
  -- D9 100: Charlotte Moorcroft over Lyra Salerno (Fall 2:20)
  (194, 67, 'consolation', '3rd_Place', 'e77eafcf-c0fa-4051-8f27-0efe92f4c9f2', 'e84e6b10-c980-4130-a064-087bda11edfd', 'FALL', NULL, NULL, 140, true),
  -- D9 100: Cindy Garcia over Yennilet Diaz (Fall 0:53)
  (194, 67, 'consolation', '5th_Place', 'c8dc2ea3-0e4f-42c3-baa5-e60ca5eb27c5', '0cd8201a-15c6-4da3-8922-ad5f10e535bc', 'FALL', NULL, NULL, 53, true),
  -- D9 107: Sephora Jean over Haylen Vega (Fall 1:35)
  (194, 68, 'consolation', '3rd_Place', '7d5a70b7-765c-469e-989a-39242349dbf2', '8e12f258-6b0d-4ab9-b0c1-b8115d82ceac', 'FALL', NULL, NULL, 95, true),
  -- D9 107: Keira Villatoro over Yuridia Figueroa Bravo (MD 9-1)
  (194, 68, 'consolation', '5th_Place', '5edaf9bf-c500-4a98-99af-3f9923d9609e', '4e950020-f24e-4cb8-a708-c2d7d537fda2', 'MD', 9, 1, NULL, true),
  -- D9 114: Neldju Alfred over Madysen White (Fall 3:29)
  (194, 69, 'consolation', '3rd_Place', 'b63db618-8a2f-475a-a883-639686765f34', 'b2b55a3b-5bc7-4a52-9082-0d509ab67ce3', 'FALL', NULL, NULL, 209, true),
  -- D9 114: Jaylah Perez over Emma MacDonald (M. For.)
  (194, 69, 'consolation', '5th_Place', '57de6dd6-f75e-475d-babd-88e7dd7f2f7e', '7822e50e-40df-4ff9-a6b8-0096cef8924a', 'FORF', NULL, NULL, NULL, true),
  -- D9 120: Genesis Erroa over Layla Rivera (Fall 1:54)
  (194, 70, 'consolation', '3rd_Place', 'bac29001-eb5a-44f1-8afd-090607bf9591', 'cb69f6a4-7e24-4293-a570-fa6f7bdc3cf9', 'FALL', NULL, NULL, 114, true),
  -- D9 120: Ariana Dugo over Ka`mani Turner (Fall 1:21)
  (194, 70, 'consolation', '5th_Place', 'da8e40f8-7f9a-436a-89b2-fad1a53e6811', '693acfbc-9fd1-46ef-a150-8672e5f715e7', 'FALL', NULL, NULL, 81, true),
  -- D9 126: Jaelyn Villalobos over Yadira Rivera (Fall 3:14)
  (194, 71, 'consolation', '3rd_Place', '3c6e76d9-c62b-49fc-96e0-a8ca3e44be0f', '23b4fd98-8c3d-44a0-b912-a720f6236f50', 'FALL', NULL, NULL, 194, true),
  -- D9 126: Erin Welch over Ashley Ruiz (MD 13-2)
  (194, 71, 'consolation', '5th_Place', '65e2496f-ebd8-4f38-a666-2b9f6c3ab054', 'd25f534f-173e-4b1b-8410-255338c0bf98', 'MD', 13, 2, NULL, true),
  -- D9 132: Gianna Robinson over Isabella Panfili (Fall 2:46)
  (194, 72, 'consolation', '3rd_Place', '56e9bf11-6c63-4f41-aa2f-e9012f4f3a46', 'ea402e67-177d-41c2-8537-db5c0f741524', 'FALL', NULL, NULL, 166, true),
  -- D9 132: Samantha Garcia over Anna Molina Paredes (Fall 1:43)
  (194, 72, 'consolation', '5th_Place', 'e743b9f6-f21d-47d7-9743-083619145390', '739870c8-65e1-405a-a82d-280cdca09171', 'FALL', NULL, NULL, 103, true),
  -- D9 138: Rowan Lacy-Cancel over Morgan Jennings (M. For.)
  (194, 73, 'consolation', '3rd_Place', '63c0deb1-fece-4af7-8bb6-ca9f30849a2f', '570e72c6-85d5-4ba3-86bd-5030f501cb9d', 'FORF', NULL, NULL, NULL, true),
  -- D9 138: Yarel Argueta over ElleCe McGinley (M. For.)
  (194, 73, 'consolation', '5th_Place', 'a6de7088-1a10-4807-a885-0f645debefdf', 'ebfe304a-5f06-4d87-9b6c-9e1f6809b5b7', 'FORF', NULL, NULL, NULL, true),
  -- D9 145: Taylor Curatola over Ashley Monti (Dec 8-3)
  (194, 74, 'consolation', '3rd_Place', 'ec40f61c-1716-4cf4-83fe-5e81f49de96e', '3eb24113-69ec-4585-bea8-9ad7de2d3b6d', 'DEC', 8, 3, NULL, true),
  -- D9 145: Ava Smith over Mia Rodriguez (Fall 1:19)
  (194, 74, 'consolation', '5th_Place', '354fce2b-9e2a-4500-8f33-194e149528bb', '558ed4d0-9c8c-40d0-8288-400d1518cf4c', 'FALL', NULL, NULL, 79, true),
  -- D9 152: Riley Thorne over Ashley Read (Fall 2:57)
  (194, 75, 'consolation', '3rd_Place', '5e7bdd2a-5988-4a91-abd1-59b5da75c934', '3511f36b-1981-427f-b1b6-acf1e8ad3998', 'FALL', NULL, NULL, 177, true),
  -- D9 152: Milene Rios Ordonez over Galani Mu`Allam (Fall 1:32)
  (194, 75, 'consolation', '5th_Place', 'b9c6a72c-8857-4063-9006-36536f3d2872', 'b2866c91-7164-463e-81bc-0d089610ed43', 'FALL', NULL, NULL, 92, true),
  -- D9 165: Juliette Gonzalez-Torres over Jade Palomarez (Fall 3:12)
  (194, 76, 'consolation', '3rd_Place', '370f1fba-d446-4d72-a42e-5d20695a723b', '8e60b1a8-4d06-404c-a812-d7890ae2a0e7', 'FALL', NULL, NULL, 192, true),
  -- D9 165: Angelina Santiago over Iliana Cervantes-Aguilar (Fall 0:13)
  (194, 76, 'consolation', '5th_Place', '377ac0e9-831a-48e0-932d-b457721a19f1', '25b06388-1d49-4402-b3d5-93f60f03699b', 'FALL', NULL, NULL, 13, true),
  -- D9 185: Morayo Illori over Daniella Nava Perez (M. For.)
  (194, 77, 'consolation', '3rd_Place', '637bf438-7df4-4840-a4a1-15e9cb264b61', '72924b90-fb87-47a1-8b23-28c90d2321b2', 'FORF', NULL, NULL, NULL, true),
  -- D9 185: Kissandra Rizo over Maria Belardo (Fall 1:52)
  (194, 77, 'consolation', '5th_Place', 'e0ef6659-a795-4924-b852-7395ee29057e', 'e5ed0802-66c7-40d4-bba0-e52f374602e1', 'FALL', NULL, NULL, 112, true),
  -- D9 235: Melerys Rivera Robles over Jakelin Mendoza (Dec 11-9)
  (194, 78, 'consolation', '3rd_Place', '25d216d9-b182-4a46-af6d-19b3d4303ed6', 'd56f9fec-af5d-4031-a979-ef5d2d26077a', 'DEC', 11, 9, NULL, true),
  -- D9 235: Ximena Inclan Bengochea over (bye) (Bye)
  (194, 78, 'consolation', '5th_Place', '237e6185-07eb-42cd-a853-72cea788253a', NULL, 'BYE', NULL, NULL, NULL, true),
  -- D10 100: Elizabeth Negth over Yasemin Avci (Fall 2:16)
  (195, 67, 'consolation', '3rd_Place', 'd4a9facc-ee84-4d02-acb9-57cabd72a56c', 'e8433395-c0dc-4ef3-b416-f6516254442b', 'FALL', NULL, NULL, 136, true),
  -- D10 100: Chloe Rodriguez over Giovanna Foster (Fall 2:38)
  (195, 67, 'consolation', '5th_Place', '1d5f5884-383a-4bf1-a8a2-f90f7d26be63', 'a7b2cdd6-db7d-443d-8dc1-bfecd17d86ea', 'FALL', NULL, NULL, 158, true),
  -- D10 107: Julianna Rice over Josalyn Hurlburt (TF-1.5 5:21 (24-9))
  (195, 68, 'consolation', '3rd_Place', '7b37145c-ce09-4b8f-952c-2ba9c2950865', '79d10e84-b1bd-49c7-a92a-007a9fa2885b', 'TF-1.5', 24, 9, 321, true),
  -- D10 107: Annlimary Montalvo over Bryanna Alves-Domingos (Fall 1:10)
  (195, 68, 'consolation', '5th_Place', '6a05167c-8e0c-446a-b33e-2d6d0bbb656d', '0809133d-0a45-4652-af76-a336c424e31e', 'FALL', NULL, NULL, 70, true),
  -- D10 114: Olivia Kennedy over Analia Spicer-Vargas (Fall 3:26)
  (195, 69, 'consolation', '3rd_Place', '551648e5-fe90-4e2a-8ba5-0dc16488b2f8', '2bf310a5-c7f4-441d-8b57-33874b51cacc', 'FALL', NULL, NULL, 206, true),
  -- D10 114: Tierney Butler over Junin Roberts (Fall 1:44)
  (195, 69, 'consolation', '5th_Place', '8280a741-cdf7-4eaa-93ce-1dd01060752d', '6d5260d7-1400-46dc-bb33-f5d7e48caaef', 'FALL', NULL, NULL, 104, true),
  -- D10 120: Lara Paiva over Nina Deery (Fall 4:38)
  (195, 70, 'consolation', '3rd_Place', 'b3156038-679d-4c53-8faf-590143e18727', '5cf9f69d-60a8-444a-bb1f-1d49e90bd6f4', 'FALL', NULL, NULL, 278, true),
  -- D10 120: Reese Harduk over Anahi Corona-Morales (Dec 6-0)
  (195, 70, 'consolation', '5th_Place', 'efa14639-cd69-42c3-8bff-c443c3aaaf53', '27492645-2ef5-4a8a-a14b-9b36212e7490', 'DEC', 6, 0, NULL, true),
  -- D10 126: Noelle Dugas over Hailey Price (Fall 1:26)
  (195, 71, 'consolation', '3rd_Place', 'a60da10d-553b-45b3-ac86-f6587d24a934', '2cc6809c-d799-4ad9-8666-a7b7f58ede97', 'FALL', NULL, NULL, 86, true),
  -- D10 126: Kimberly Sarita over Madelyn Wickersham (Fall 0:42)
  (195, 71, 'consolation', '5th_Place', 'd652ac6c-9a3e-4494-a7f7-33a5021d2441', '63f04b93-9339-452c-bb4b-dade81bbb728', 'FALL', NULL, NULL, 42, true),
  -- D10 132: Emersyn Mathews over Chelsea Ochoa (Dec 3-0)
  (195, 72, 'consolation', '3rd_Place', 'fef2dfa2-308b-4f99-9c68-1dfb672ee701', 'fa1aac38-6b39-40d1-8d27-264d8df01241', 'DEC', 3, 0, NULL, true),
  -- D10 132: Taylor Grinnan over Reese Lindemann (Fall 1:51)
  (195, 72, 'consolation', '5th_Place', '28e97729-7d41-4347-af16-16c50ee21b00', '6a741bdc-c904-4187-bc2d-ac9360411b8a', 'FALL', NULL, NULL, 111, true),
  -- D10 138: Elizabeth Warren over Chaziti Montano (TF-1.5 4:46 (15-0))
  (195, 73, 'consolation', '3rd_Place', '499f6e0e-ee1e-41c6-80ac-9e9249ba569e', 'aada6be8-d0cf-4297-8980-451418108bd6', 'TF-1.5', 15, 0, 286, true),
  -- D10 138: Juliette Appolonia over Javieleis Vazquez (Fall 1:34)
  (195, 73, 'consolation', '5th_Place', '252a171f-2900-416f-8867-d93efffad0bf', '44c40ae3-f7ab-42b8-b6ed-9064bb40fa7a', 'FALL', NULL, NULL, 94, true),
  -- D10 145: Kathryn Green over Catalina Moncayo (Fall 2:55)
  (195, 74, 'consolation', '3rd_Place', 'cecf5376-85a5-4f99-bbfc-a8f480a352f1', '8c3aa024-0027-4c04-bf32-ae0194877e23', 'FALL', NULL, NULL, 175, true),
  -- D10 145: Luana Gondinho over Lauren Parone (Fall 4:55)
  (195, 74, 'consolation', '5th_Place', '14184d91-6b1d-4239-adfa-a66c05d9d01c', '535eeaff-a2ed-4bb1-9d14-591a332943b3', 'FALL', NULL, NULL, 295, true),
  -- D10 152: Lailah Bolton over Emanuelly Souza (Fall 5:58)
  (195, 75, 'consolation', '3rd_Place', '084571ab-18ea-456d-9f3c-559cd1c4d8b3', '0e4013af-3e3f-4061-b13d-132a48aaffbc', 'FALL', NULL, NULL, 358, true),
  -- D10 152: Kennedy Cervenak over Reagan Hoppock (Dec 7-2)
  (195, 75, 'consolation', '5th_Place', '666c510a-5e69-4888-a374-e9e89bc55ad4', '0d671964-e016-4f8c-b5b5-5984bb49f6c9', 'DEC', 7, 2, NULL, true),
  -- D10 165: Olivia Wronski over Vasthie Pierre-Louis (Fall 4:00)
  (195, 76, 'consolation', '3rd_Place', 'e30022d2-dd1e-4199-9571-495e2239f36c', 'f8350213-5f9e-4022-8ff0-459b6ecfe275', 'FALL', NULL, NULL, 240, true),
  -- D10 165: Chloe Halgas over Jordan Royce (Fall 3:40)
  (195, 76, 'consolation', '5th_Place', 'd2e492dd-97b5-49a1-8005-46b1c27fb3ed', '1be73e33-6e50-493d-9ec0-7767d9fb0d02', 'FALL', NULL, NULL, 220, true),
  -- D10 185: Denise Valencia over Oreoluwa Adeyami (Fall 1:28)
  (195, 77, 'consolation', '3rd_Place', '2d601513-f22c-45c9-bdad-2b0f34255d2c', 'd6c1e480-7fde-41fd-b05b-6e43c48e0da8', 'FALL', NULL, NULL, 88, true),
  -- D10 185: Ayanah Richards over Taylor Gaddy (Fall 3:05)
  (195, 77, 'consolation', '5th_Place', '25e1001b-e3e7-45d5-9a64-b08ec866da6e', '22fa4bb1-4192-4a09-b0fb-ac434467c91c', 'FALL', NULL, NULL, 185, true),
  -- D10 235: Na`ilah Miller over Ecrin Zivali (Fall 5:34)
  (195, 78, 'consolation', '3rd_Place', 'beed1609-e307-4f8b-b3bb-21f224c65c2d', '2430377c-abc2-4540-8a23-280b12fc8ba0', 'FALL', NULL, NULL, 334, true),
  -- D10 235: Bella Kandel over Patience Pittman (For.)
  (195, 78, 'consolation', '5th_Place', '888d0d17-029e-411a-9e50-b5af1500d2dd', 'e5878a83-bde5-485f-88bd-0b1a5066f803', 'FORF', NULL, NULL, NULL, true),
  -- D11 100: Isabella Robles over Laci Saunders (MD 11-1)
  (196, 67, 'consolation', '3rd_Place', 'fb8edc4d-24b0-4c25-9d32-2bd8a5b904fe', '0b2966e7-be59-4c00-bd69-5a952419711e', 'MD', 11, 1, NULL, true),
  -- D11 100: Maya Pasternak over Adriana Connelly (Inj. 0:00)
  (196, 67, 'consolation', '5th_Place', '8a851879-6a6d-4962-ac2e-bf0582f9b34a', 'dd452a6c-55b0-4e55-bd5e-d6d65039d6e9', 'INJ', NULL, NULL, NULL, true),
  -- D11 107: Malayah Calm over Alyssa Cantillo (TF-1.5 4:07 (17-2))
  (196, 68, 'consolation', '3rd_Place', 'f0003f5b-b39f-45d9-ac1a-fed59ba6e503', 'bc4fd12b-37d4-4826-9936-929723ec0435', 'TF-1.5', 17, 2, 247, true),
  -- D11 107: Adelynn Zemp over Zoe Torraya (Fall 4:29)
  (196, 68, 'consolation', '5th_Place', '92196461-6e64-48c2-a397-da0970d2a083', 'a60cdb9f-b5f2-4e57-ba3d-13d42e4c23f7', 'FALL', NULL, NULL, 269, true),
  -- D11 114: Anyae Munson-Young over Maripaz Ramos (Fall 0:00)
  (196, 69, 'consolation', '3rd_Place', 'a1f4daa0-e68c-4cf4-9223-2a0b65ba1245', '7d1aa5d6-4dd6-49e7-bcf0-ed7914247a90', 'FALL', NULL, NULL, 0, true),
  -- D11 114: Sophia Park over Adelaide Arvo (Dec 12-8)
  (196, 69, 'consolation', '5th_Place', 'a68d97e1-bb2b-43bb-9dd1-f553a98e80a6', 'dd83c2aa-4f59-4d5a-a350-e7e796a1f001', 'DEC', 12, 8, NULL, true),
  -- D11 120: Sofia DeRosa over Kylie Hastings (Fall 0:42)
  (196, 70, 'consolation', '3rd_Place', '6b757c22-0519-4447-b0ff-91a00200980b', '20085d2a-fea6-48e6-a6af-7c30aa56069d', 'FALL', NULL, NULL, 42, true),
  -- D11 120: Regan Borrelli over Julianna Sabec (Fall 4:30)
  (196, 70, 'consolation', '5th_Place', 'da88908b-36b0-4d47-af44-c2765a52e7a0', '817f7090-e6f9-4f21-8851-9ad874b121d1', 'FALL', NULL, NULL, 270, true),
  -- D11 126: Nathalia Tran over Victoria Strasser (Fall 0:51)
  (196, 71, 'consolation', '3rd_Place', 'a5697aef-05b1-47ed-bdf1-e454f11363ca', '4d6e3f17-9642-4cac-a7bc-e9b5fb0089db', 'FALL', NULL, NULL, 51, true),
  -- D11 126: Alison Chewning over Sadie Clayton (Inj. 0:00)
  (196, 71, 'consolation', '5th_Place', '37d9119a-7a17-4468-a5b6-0880576373f2', '994e915e-8b42-416f-807d-da12c88d9160', 'INJ', NULL, NULL, NULL, true),
  -- D11 132: Abigail Nachurski over Jaylene Clark (Fall 1:28)
  (196, 72, 'consolation', '3rd_Place', '27376391-5376-4e69-926f-a53476403cdb', '35eb03b0-8214-4672-833a-e6b91d0c7e9a', 'FALL', NULL, NULL, 88, true),
  -- D11 132: Malia Landolt over Evolet Espinosa-Gomez (Dec 5-1)
  (196, 72, 'consolation', '5th_Place', 'bdb2c28e-5269-4f12-9f6b-8a4beb628765', '5a792ad1-5b7f-4250-97c9-3c987adb9bf3', 'DEC', 5, 1, NULL, true),
  -- D11 138: Danielle Sharp over Olivia Viviano (Fall 0:46)
  (196, 73, 'consolation', '3rd_Place', '3be9e691-736b-4659-9cfc-fd238117aeb5', '918276cd-d3cb-4e59-a361-1d56898210dd', 'FALL', NULL, NULL, 46, true),
  -- D11 138: Ninoschka Drisdom over Elizabeth Frament (Fall 1:17)
  (196, 73, 'consolation', '5th_Place', '6587196b-8644-40c4-9786-6cf20b5f4bfb', '0e8e83f6-70ba-4a6a-8d6e-a7030e14e0d4', 'FALL', NULL, NULL, 77, true),
  -- D11 145: Lilliana Bedle over Madeline Boyd (Dec 5-1)
  (196, 74, 'consolation', '3rd_Place', '5ac578b6-05cc-48e5-bf94-f575b3ef2bef', '077c76ea-1d47-4e8d-9a4d-69954d290a98', 'DEC', 5, 1, NULL, true),
  -- D11 145: Deja Cofield over Brooke Twohig (Inj. 0:00)
  (196, 74, 'consolation', '5th_Place', '278de1be-18c6-4b1d-b5e8-4cde0cc3a58f', '5ce31add-7400-4cc7-90ad-312d3a241589', 'INJ', NULL, NULL, NULL, true),
  -- D11 152: Gianna Abbruzzese over Ja`Mia Martin (Fall 1:57)
  (196, 75, 'consolation', '3rd_Place', '72b27407-c57c-4033-b21a-1727bd6c9133', '539ab33f-4e59-4a5c-9656-9fe123bab684', 'FALL', NULL, NULL, 117, true),
  -- D11 152: Shirlynn Morales over Ruby Love (Fall 1:44)
  (196, 75, 'consolation', '5th_Place', 'f10a8dc8-60e9-47df-a6cc-444132b973e2', '092669c7-530a-4301-835c-0800b401fdbb', 'FALL', NULL, NULL, 104, true),
  -- D11 165: TinaMarie Robinson over Aileah Hernandez-Siete (Fall 2:48)
  (196, 76, 'consolation', '3rd_Place', '9c67fd68-4e03-4297-ad37-9d38673a8da2', '02b15954-60b0-4380-9f81-1410adeca130', 'FALL', NULL, NULL, 168, true),
  -- D11 165: Wonder Senesie over Anijah Roberts (Fall 2:32)
  (196, 76, 'consolation', '5th_Place', 'fd537659-45ef-4933-be0e-2e7387ab8657', '86940f70-9e05-4e95-8c72-bc128a6039ca', 'FALL', NULL, NULL, 152, true),
  -- D11 185: Haliey Reyes over Ryleigh Crain (Dec 7-6)
  (196, 77, 'consolation', '3rd_Place', '79d20f27-e29d-4389-8a14-e6782c2be427', '63897cfa-4555-4a48-a5f0-685cb727c323', 'DEC', 7, 6, NULL, true),
  -- D11 185: Audra Marcinkiewicz over angelina matarazzo (Inj. 0:00)
  (196, 77, 'consolation', '5th_Place', '1654e50c-22cb-4171-b665-6366dc7cbaf4', '73196428-e715-4591-84eb-67376563f82e', 'INJ', NULL, NULL, NULL, true),
  -- D11 235: Aniyah Parker Taylor over Essence Bishop (Dec 3-1)
  (196, 78, 'consolation', '3rd_Place', '315d1553-e2ad-49f4-baad-b01a2d9c073a', 'fb40ba7e-4d0f-45a7-8687-e96017ca5170', 'DEC', 3, 1, NULL, true),
  -- D11 235: Nahla Widgeon over Brazil Smith (Fall 0:45)
  (196, 78, 'consolation', '5th_Place', 'ed9a22c9-5af8-4ff8-ab48-6797021ad214', 'ca139a5f-e8d2-41fb-a935-bb68861ad913', 'FALL', NULL, NULL, 45, true),
  -- D12 100: lily Cohen over Alayna McElroy (Fall 2:44)
  (197, 67, 'consolation', '3rd_Place', '6262a879-4e4f-4066-b132-e9588eb65bbc', '26306518-d9b4-451b-abdd-264e6bd3cf9a', 'FALL', NULL, NULL, 164, true),
  -- D12 100: Gina Haubrich over Elaine Luoma (For.)
  (197, 67, 'consolation', '5th_Place', '4bf9691c-2939-481a-b109-bb2a809680d0', '970b37dc-10fe-49b8-8ae0-7839047877ef', 'FORF', NULL, NULL, NULL, true),
  -- D12 107: Palina Zavuholnik over Ava Baldino (Fall 5:19)
  (197, 68, 'consolation', '3rd_Place', '811ada0f-05e2-4d1a-9022-be6ef963ebb5', '641bd326-b974-4953-b0ac-94e4d57f26ca', 'FALL', NULL, NULL, 319, true),
  -- D12 107: Anyileini Valdaz over Tessa Palumbo (Fall 1:30)
  (197, 68, 'consolation', '5th_Place', '45cac7c8-ffbc-4eca-a1fc-9fd9d5d48fca', '8b8c87ab-74e2-4abb-9d80-ee8e6984484b', 'FALL', NULL, NULL, 90, true),
  -- D12 114: Savanah Valliere over Brianna Roeder (Fall 1:38)
  (197, 69, 'consolation', '3rd_Place', '9392320f-7ab9-43e8-ae38-beb154e665fc', '35e5eb9e-2776-44de-98e7-8ceb8c67059d', 'FALL', NULL, NULL, 98, true),
  -- D12 114: Gianna Petracci over Ava Ritz (Fall 5:59)
  (197, 69, 'consolation', '5th_Place', '418f4421-bfa2-41f9-956b-23bd37c6914a', 'bb76cdf9-6b8a-4e46-b046-5748fe8b2bdc', 'FALL', NULL, NULL, 359, true),
  -- D12 120: Lilyana Zwillinger over Katalina Marquez (Fall 3:01)
  (197, 70, 'consolation', '3rd_Place', '0fa8daf4-d53a-4542-8b62-9bfc0885c096', '1c251837-f4e2-4ed4-8b31-73bfd1a5e618', 'FALL', NULL, NULL, 181, true),
  -- D12 120: Alexandria Chase over Jacenia Centeno (Fall 0:59)
  (197, 70, 'consolation', '5th_Place', 'cca0bad1-f8c3-4b7b-a2a3-c9fd1f733831', '36af02d1-49d3-4858-b0c1-d96efe2b7ee1', 'FALL', NULL, NULL, 59, true),
  -- D12 126: Olivia Guzman over Rosalie Sharp (Fall 1:00)
  (197, 71, 'consolation', '3rd_Place', '94e1dd04-dec4-45df-9715-105cb33676dc', 'f2545954-2d88-4c9a-8f54-fa211f2a1ec6', 'FALL', NULL, NULL, 60, true),
  -- D12 126: Aleena Chevere over River Wojcik (MD 15-5)
  (197, 71, 'consolation', '5th_Place', 'aad8a5b4-e28b-4949-9333-0da4fb5aa2cd', '867f412d-9686-4f23-bcdb-5c2ca18deb06', 'MD', 15, 5, NULL, true),
  -- D12 132: Mariah Witmer over Keylin Lopez (Fall 3:42)
  (197, 72, 'consolation', '3rd_Place', '91e8e7a4-29a5-4ce0-a402-70e30f2a9529', '98027fff-0ad3-47b7-908a-922478ba6ad9', 'FALL', NULL, NULL, 222, true),
  -- D12 132: Alivia Whitmore over Abigail Matalbert (Fall 5:39)
  (197, 72, 'consolation', '5th_Place', 'd9e96930-2245-4a72-8448-6b5be7c2d479', '10c6df82-ed6d-4974-a69a-687bf3852bad', 'FALL', NULL, NULL, 339, true),
  -- D12 138: Haley Batista over Camila Melendez (Dec 7-0)
  (197, 73, 'consolation', '3rd_Place', '7518f892-2cac-49cc-a9eb-02fc3c7a2f4d', '8d08d8ff-fef9-4d8b-b07e-d861ae49867b', 'DEC', 7, 0, NULL, true),
  -- D12 138: Summer Sassi over McKenna Thomas (Fall 1:34)
  (197, 73, 'consolation', '5th_Place', '0b24efb7-439c-45ff-a4bf-ed149fe3fe38', 'a6fde2c6-3474-44e5-be66-b59034ab23d0', 'FALL', NULL, NULL, 94, true),
  -- D12 145: Isabella Scittina over Veronica Rojas (Fall 1:04)
  (197, 74, 'consolation', '3rd_Place', 'aff5b16b-5912-4866-8dd0-72005b88fc0b', 'c15c3913-7633-481e-aa6d-c3badc924e33', 'FALL', NULL, NULL, 64, true),
  -- D12 145: Alina Williams over Yerlian Charon (Fall 0:46)
  (197, 74, 'consolation', '5th_Place', 'ed1408dd-2c59-4777-898d-81459714b808', 'c3418b70-d168-4bad-9ec6-04dafd6c0fba', 'FALL', NULL, NULL, 46, true),
  -- D12 152: Kathleen Grimley over Roubelina Buensuceso (Dec 5-0)
  (197, 75, 'consolation', '3rd_Place', '73b9cf8f-5c15-46cd-9a43-8fa80dedab95', 'e23cdc7d-1640-4ff8-9669-ef0ba65a391d', 'DEC', 5, 0, NULL, true),
  -- D12 152: Mackenzi Cerchiaro over Samantha Vicente (Fall 0:54)
  (197, 75, 'consolation', '5th_Place', '35651bc6-4205-4d4f-8120-ab76911f4dca', '25a39d6e-307d-4f45-b343-47f1d6a433f7', 'FALL', NULL, NULL, 54, true),
  -- D12 165: Cayden Lacorte over Isabella Grant (Fall 2:38)
  (197, 76, 'consolation', '3rd_Place', '785c50ff-bf5a-402d-9efe-33a8fa40002d', '5450ad46-7df0-44bc-91b0-386da3aac7e3', 'FALL', NULL, NULL, 158, true),
  -- D12 165: Ranae Scurry over Mia Simone Walker (Dec 10-5)
  (197, 76, 'consolation', '5th_Place', '71641ae6-ccce-4a24-8d66-09ea2fc538b3', 'ba54674a-dbb3-43f5-a43f-958a06275fd9', 'DEC', 10, 5, NULL, true),
  -- D12 185: Masye Washington over Samaiya Figueroa (Fall 2:21)
  (197, 77, 'consolation', '3rd_Place', 'c553f25c-a761-4071-acc0-6e5400745a6a', '3d8dd950-5bb2-421d-9465-e955836891f5', 'FALL', NULL, NULL, 141, true),
  -- D12 185: Destiny Cabarcas Rincon over Forfeit Forfeit (For.)
  (197, 77, 'consolation', '5th_Place', '505ae68b-01c5-4cb3-abed-95ca2bde66c1', NULL, 'FORF', NULL, NULL, NULL, true),
  -- D12 235: Briella Davies over Zamyiah Tokley (Fall 1:10)
  (197, 78, 'consolation', '3rd_Place', 'f0b692ae-f377-41c7-9398-3b1da01f43e0', 'd5bb4044-6e97-48f3-b57f-678fed4332ee', 'FALL', NULL, NULL, 70, true),
  -- D12 235: Amelia Lyons over Johanna Hence (Fall 2:49)
  (197, 78, 'consolation', '5th_Place', '37e87b1b-c338-42fd-9598-d8c8b8aeb6fd', '6979cc02-be63-4fc7-8100-90985205ddaa', 'FALL', NULL, NULL, 169, true);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 283 THEN RAISE EXCEPTION 'expected 283 bouts, got %', n; END IF;
END $$;
