-- docs/migrations/20261024_girls_power_points_2025_26.sql
--
-- Girls 2025-26 official standings and Power Points ("Whizzer Upload/2025-26
-- Girls Data/2026 final standings girls.rtf"). Girls PP come in three lists:
-- North Jersey, South Jersey, and Non-classified (schools that don't compete
-- for team titles — record and PP are display-only, no playoffs).
--
-- 1. power_points.overall_ties — girls official records include ties
--    (e.g. Elizabeth 12-6-1). Boys rows stay 0.
-- 2. power_points.pp_group — 'north' | 'south' | 'non_classified' for girls;
--    NULL for boys.
-- 3. 273 girls rows for season 2026. Names matched with matchSchoolNames
--    (gender F, season 2026): all 73 North/South exact. Skipped 36
--    Non-classified rows: 35 with no school record (34 are 0-0; Mary Help of
--    Christians 1-0) plus 0-0 duplicates of a matched school (Saddle Brook →
--    Lodi/Saddle Brook 379, Monmouth Academy → 384, Princeton Charter → 174).
--    Peddie (0-1) → The Peddie School (603).
--    meets_counted = min(W+L+T, 9), same cap as the Past Seasons importer.
--
-- Run in the Supabase SQL editor.

ALTER TABLE power_points ADD COLUMN IF NOT EXISTS overall_ties integer NOT NULL DEFAULT 0;
ALTER TABLE power_points ADD COLUMN IF NOT EXISTS pp_group text;
ALTER TABLE power_points DROP CONSTRAINT IF EXISTS power_points_pp_group_check;
ALTER TABLE power_points ADD CONSTRAINT power_points_pp_group_check
  CHECK (pp_group IS NULL OR pp_group IN ('north', 'south', 'non_classified'));

DO $$
DECLARE n integer;
BEGIN
  DELETE FROM power_points WHERE season_id = 2026 AND gender = 'F';

  INSERT INTO power_points (school_id, season_id, gender, pp_group, overall_wins, overall_losses, overall_ties, power_points, meets_counted)
  SELECT v.school_id, 2026, 'F', v.pp_group, v.w, v.l, v.t, v.pp, LEAST(v.w + v.l + v.t, 9)
  FROM (VALUES
  (32, 'north', 14, 4, 0, 32),  -- N1 High Point
  (76, 'north', 19, 4, 0, 30.89),  -- N2 Morris Hills
  (18, 'north', 16, 5, 0, 30.22),  -- N3 Ramsey
  (24, 'north', 12, 5, 0, 29.44),  -- N4 Newton
  (391, 'north', 23, 7, 0, 28.89),  -- N5 Passaic Tech
  (56, 'north', 15, 5, 0, 28.78),  -- N6 Mount Olive
  (4, 'north', 10, 8, 0, 27.89),  -- N7 Jefferson
  (50, 'north', 14, 5, 0, 27.56),  -- N8 Clifton
  (123, 'north', 12, 6, 1, 27.33),  -- N9 Elizabeth
  (126, 'north', 14, 1, 0, 27.14),  -- N10 Scotch Plains-Fanwood
  (393, 'north', 15, 2, 0, 27.11),  -- N11 Ridgefield Park
  (120, 'north', 14, 6, 0, 26.78),  -- N12 Bayonne
  (135, 'north', 10, 5, 0, 26.78),  -- N12 North Hunterdon
  (27, 'north', 16, 7, 0, 26.67),  -- N14 Vernon
  (182, 'north', 14, 6, 0, 26.11),  -- N15 Perth Amboy
  (152, 'north', 14, 8, 0, 26.11),  -- N15 Linden
  (109, 'north', 12, 7, 1, 26),  -- N17 West Orange
  (114, 'north', 4, 3, 0, 26),  -- N17 Morristown
  (81, 'north', 4, 9, 0, 25.56),  -- N19 Bloomfield
  (78, 'north', 8, 8, 0, 25.11),  -- N20 Parsippany Hills
  (143, 'north', 11, 9, 0, 24.56),  -- N21 North Plainfield
  (67, 'north', 9, 11, 0, 24),  -- N22 Warren Hills
  (58, 'north', 4, 8, 0, 23.2),  -- N23 Passaic
  (121, 'north', 1, 2, 0, 23),  -- N24 Columbia
  (51, 'north', 4, 9, 0, 23),  -- N24 Elmwood Park
  (28, 'north', 6, 16, 0, 22.78),  -- N26 Wallkill Valley
  (145, 'north', 6, 12, 0, 22.33),  -- N27 Somerville
  (7, 'north', 4, 14, 0, 22),  -- N28 Phillipsburg
  (364, 'north', 3, 6, 0, 21.57),  -- N29 Cliffside Park
  (190, 'north', 3, 14, 0, 21.56),  -- N30 Hunterdon Central
  (103, 'north', 7, 7, 0, 21.29),  -- N31 Kearny
  (141, 'north', 1, 9, 0, 21.2),  -- N32 Delaware Valley
  (52, 'north', 3, 8, 0, 20.56),  -- N33 Fair Lawn
  (14, 'north', 2, 12, 0, 19.86),  -- N34 Mahwah
  (155, 'north', 7, 9, 0, 19.14),  -- N35 Rahway
  (62, 'north', 4, 15, 0, 18),  -- N36 Lenape Valley
  (125, 'north', 3, 10, 0, 15.4),  -- N37 Roselle Park
  (370, 'south', 19, 0, 0, 33.11),  -- S1 Jackson Township
  (259, 'south', 18, 3, 0, 32.67),  -- S2 Gloucester
  (247, 'south', 20, 4, 0, 31.89),  -- S3 Central Regional
  (162, 'south', 18, 5, 1, 29.44),  -- S4 North Brunswick
  (158, 'south', 18, 3, 0, 28.44),  -- S5 East Brunswick
  (260, 'south', 10, 5, 0, 28.33),  -- S6 Kingsway
  (188, 'south', 14, 5, 0, 28),  -- S7 Hillsborough
  (163, 'south', 16, 8, 1, 27.56),  -- S8 Old Bridge
  (303, 'south', 9, 7, 0, 27.11),  -- S9 Williamstown
  (263, 'south', 16, 4, 0, 27),  -- S10 Rancocas Valley
  (216, 'south', 15, 8, 0, 26.89),  -- S11 Trenton
  (296, 'south', 9, 5, 0, 26.89),  -- S11 Eastern
  (242, 'south', 14, 6, 0, 26.67),  -- S13 Pennsauken
  (231, 'south', 12, 4, 0, 26.33),  -- S14 Hamilton West
  (233, 'south', 12, 5, 0, 26.22),  -- S15 Howell
  (290, 'south', 9, 4, 0, 25.89),  -- S16 Delsea
  (193, 'south', 13, 10, 0, 25),  -- S17 Marlboro
  (271, 'south', 9, 8, 0, 24.78),  -- S18 Lenape
  (210, 'south', 19, 4, 0, 24.44),  -- S19 Lawrence
  (208, 'south', 13, 2, 0, 24.29),  -- S20 Steinert
  (238, 'south', 11, 2, 0, 24),  -- S21 Collingswood
  (250, 'south', 6, 9, 0, 23.44),  -- S22 Manchester Township
  (252, 'south', 5, 9, 0, 23.44),  -- S22 Southern
  (184, 'south', 8, 12, 0, 23.11),  -- S24 Raritan
  (287, 'south', 13, 7, 0, 23),  -- S25 Buena
  (258, 'south', 9, 14, 0, 23),  -- S25 Delran
  (305, 'south', 8, 6, 0, 22),  -- S27 Clayton
  (230, 'south', 3, 10, 0, 21.25),  -- S28 Ewing
  (257, 'south', 9, 10, 0, 20.33),  -- S29 Cinnaminson
  (267, 'south', 6, 10, 0, 19.11),  -- S30 Cherry Hill East
  (215, 'south', 5, 9, 0, 18.33),  -- S31 Robbinsville
  (227, 'south', 4, 6, 0, 17.25),  -- S32 Bordentown
  (199, 'south', 6, 7, 0, 17.17),  -- S33 Freehold Borough
  (245, 'south', 0, 7, 0, 16.2),  -- S34 West Deptford
  (232, 'south', 6, 5, 0, 16),  -- S35 Hightstown
  (256, 'south', 5, 9, 0, 13),  -- S36 Westampton Tech
  (5, 'non_classified', 5, 4, 0, 26),  -- NC1 Lakeland
  (321, 'non_classified', 4, 6, 0, 25),  -- NC2 Becton
  (236, 'non_classified', 3, 0, 0, 23),  -- NC3 Audubon
  (139, 'non_classified', 1, 0, 0, 23),  -- NC3 Bernards
  (131, 'non_classified', 5, 0, 0, 23),  -- NC3 Bridgewater-Raritan
  (1, 'non_classified', 4, 0, 0, 23),  -- NC3 Cresskill
  (200, 'non_classified', 2, 0, 0, 23),  -- NC3 Freehold Township
  (83, 'non_classified', 1, 0, 0, 23),  -- NC3 Lyndhurst
  (220, 'non_classified', 1, 0, 0, 23),  -- NC3 Manasquan
  (272, 'non_classified', 1, 0, 0, 23),  -- NC3 Maple Shade
  (75, 'non_classified', 1, 0, 0, 23),  -- NC3 Montville
  (261, 'non_classified', 1, 0, 0, 23),  -- NC3 Moorestown
  (221, 'non_classified', 1, 0, 0, 23),  -- NC3 Neptune
  (115, 'non_classified', 2, 0, 0, 23),  -- NC3 Newark Academy
  (25, 'non_classified', 1, 0, 0, 23),  -- NC3 North Warren
  (285, 'non_classified', 2, 0, 0, 23),  -- NC3 Ocean City
  (15, 'non_classified', 2, 0, 0, 23),  -- NC3 Pascack Hills
  (46, 'non_classified', 2, 0, 0, 23),  -- NC3 Passaic Valley
  (74, 'non_classified', 1, 0, 0, 23),  -- NC3 Paterson Kennedy
  (223, 'non_classified', 2, 0, 0, 23),  -- NC3 Point Pleasant Beach
  (8, 'non_classified', 1, 0, 0, 23),  -- NC3 River Dell
  (128, 'non_classified', 2, 0, 0, 23),  -- NC3 Westfield
  (187, 'non_classified', 1, 0, 0, 23),  -- NC3 Woodbridge
  (374, 'non_classified', 1, 0, 0, 23),  -- NC3 Keyport
  (144, 'non_classified', 1, 0, 0, 23),  -- NC3 Pingry
  (49, 'non_classified', 3, 0, 0, 23),  -- NC3 Tenafly
  (38, 'non_classified', 1, 0, 0, 23),  -- NC3 Wayne Hills
  (180, 'non_classified', 3, 0, 1, 23),  -- NC3 Metuchen
  (151, 'non_classified', 4, 1, 0, 23),  -- NC3 J.P. Stevens
  (383, 'non_classified', 5, 2, 0, 23),  -- NC3 Middlesex
  (279, 'non_classified', 2, 1, 0, 23),  -- NC3 Egg Harbor
  (3, 'non_classified', 2, 1, 0, 23),  -- NC3 Emerson Boro
  (211, 'non_classified', 2, 1, 0, 23),  -- NC3 Long Branch
  (133, 'non_classified', 2, 1, 0, 23),  -- NC3 Millburn
  (105, 'non_classified', 4, 2, 0, 23),  -- NC3 Montclair
  (85, 'non_classified', 2, 1, 0, 23),  -- NC3 Newark Collegiate
  (16, 'non_classified', 2, 1, 0, 23),  -- NC3 Pascack Valley
  (12, 'non_classified', 2, 1, 0, 23),  -- NC3 Glen Rock
  (53, 'non_classified', 3, 2, 0, 23),  -- NC3 Garfield
  (299, 'non_classified', 3, 2, 0, 23),  -- NC3 Overbrook
  (276, 'non_classified', 1, 1, 0, 23),  -- NC3 Absegami
  (30, 'non_classified', 1, 1, 0, 23),  -- NC3 Butler
  (288, 'non_classified', 2, 2, 0, 23),  -- NC3 Cedar Creek
  (289, 'non_classified', 1, 1, 0, 23),  -- NC3 Cumberland
  (189, 'non_classified', 1, 1, 0, 23),  -- NC3 Holmdel
  (382, 'non_classified', 1, 1, 0, 23),  -- NC3 Matawan
  (284, 'non_classified', 2, 2, 0, 23),  -- NC3 Oakcrest
  (293, 'non_classified', 1, 1, 0, 23),  -- NC3 Pennsville
  (196, 'non_classified', 2, 2, 0, 23),  -- NC3 Rutgers Prep
  (166, 'non_classified', 2, 2, 0, 23),  -- NC3 Spotswood
  (397, 'non_classified', 2, 2, 0, 23),  -- NC3 Summit
  (107, 'non_classified', 1, 1, 0, 23),  -- NC3 Verona
  (179, 'non_classified', 4, 5, 0, 23),  -- NC3 Highland Park
  (244, 'non_classified', 3, 4, 0, 23),  -- NC3 Sterling
  (63, 'non_classified', 3, 5, 0, 23),  -- NC3 Mountain Lakes
  (100, 'non_classified', 3, 6, 0, 23),  -- NC3 Belleville
  (84, 'non_classified', 1, 2, 0, 23),  -- NC3 Madison
  (45, 'non_classified', 2, 4, 0, 23),  -- NC3 Manchester Regional
  (160, 'non_classified', 1, 2, 0, 23),  -- NC3 Middletown South
  (222, 'non_classified', 2, 4, 0, 23),  -- NC3 Ocean Township
  (309, 'non_classified', 1, 2, 0, 23),  -- NC3 Paulsboro
  (146, 'non_classified', 1, 2, 0, 23),  -- NC3 Voorhees
  (235, 'non_classified', 1, 2, 0, 23),  -- NC3 Wall
  (29, 'non_classified', 1, 2, 0, 23),  -- NC3 West Milford
  (304, 'non_classified', 1, 2, 0, 23),  -- NC3 Winslow
  (44, 'non_classified', 2, 5, 0, 23),  -- NC3 Leonia
  (198, 'non_classified', 1, 3, 0, 23),  -- NC3 Colts Neck
  (251, 'non_classified', 1, 3, 0, 23),  -- NC3 Pinelands
  (164, 'non_classified', 2, 7, 1, 23),  -- NC3 South Brunswick
  (101, 'non_classified', 1, 3, 0, 23),  -- NC3 Glen Ridge
  (273, 'non_classified', 3, 10, 0, 23),  -- NC3 Pemberton
  (177, 'non_classified', 2, 8, 1, 23),  -- NC3 West Windsor-Plainsboro South
  (165, 'non_classified', 2, 7, 0, 23),  -- NC3 South River
  (369, 'non_classified', 1, 4, 0, 23),  -- NC3 Highland
  (265, 'non_classified', 1, 4, 0, 23),  -- NC3 Willingboro
  (254, 'non_classified', 2, 12, 0, 23),  -- NC3 Toms River North
  (86, 'non_classified', 1, 7, 0, 23),  -- NC3 Orange
  (234, 'non_classified', 0, 12, 1, 23),  -- NC3 St. Thomas Aquinas
  (110, 'non_classified', 0, 3, 0, 23),  -- NC3 Belvidere
  (70, 'non_classified', 0, 3, 0, 23),  -- NC3 Boonton
  (322, 'non_classified', 0, 1, 0, 23),  -- NC3 Bound Brook
  (130, 'non_classified', 0, 4, 0, 23),  -- NC3 Brearley
  (207, 'non_classified', 0, 0, 0, 23),  -- NC3 Brick Memorial
  (266, 'non_classified', 0, 0, 0, 23),  -- NC3 Cherokee
  (306, 'non_classified', 0, 0, 0, 23),  -- NC3 Clearview
  (71, 'non_classified', 0, 0, 0, 23),  -- NC3 College Achieve Paterson
  (149, 'non_classified', 0, 0, 0, 23),  -- NC3 Colonia
  (22, 'non_classified', 0, 0, 0, 23),  -- NC3 DePaul
  (307, 'non_classified', 0, 1, 0, 23),  -- NC3 Deptford
  (41, 'non_classified', 0, 2, 0, 23),  -- NC3 Dwight-Morrow
  (42, 'non_classified', 0, 0, 0, 23),  -- NC3 Fort Lee
  (291, 'non_classified', 0, 1, 0, 23),  -- NC3 Gateway
  (239, 'non_classified', 0, 0, 0, 23),  -- NC3 Haddon Heights
  (240, 'non_classified', 0, 0, 0, 23),  -- NC3 Haddon Township
  (113, 'non_classified', 0, 0, 0, 23),  -- NC3 Hanover Park
  (280, 'non_classified', 0, 0, 0, 23),  -- NC3 Holy Spirit
  (73, 'non_classified', 0, 0, 0, 23),  -- NC3 Immaculata
  (132, 'non_classified', 0, 7, 0, 23),  -- NC3 Irvington
  (150, 'non_classified', 0, 0, 0, 23),  -- NC3 Iselin Kennedy
  (33, 'non_classified', 0, 0, 0, 23),  -- NC3 Kinnelon
  (249, 'non_classified', 0, 1, 0, 23),  -- NC3 Lacey
  (282, 'non_classified', 0, 2, 0, 23),  -- NC3 Mainland
  (171, 'non_classified', 0, 4, 0, 23),  -- NC3 Manville
  (283, 'non_classified', 0, 3, 0, 23),  -- NC3 Middle Township
  (292, 'non_classified', 0, 0, 0, 23),  -- NC3 Millville
  (172, 'non_classified', 0, 0, 0, 23),  -- NC3 Monroe
  (134, 'non_classified', 0, 1, 0, 23),  -- NC3 New Providence
  (122, 'non_classified', 0, 2, 0, 23),  -- NC3 Newark East Side
  (95, 'non_classified', 0, 3, 0, 23),  -- NC3 North Bergen
  (388, 'non_classified', 0, 5, 0, 23),  -- NC3 Northern Burlington
  (262, 'non_classified', 0, 0, 0, 23),  -- NC3 Palmyra
  (57, 'non_classified', 0, 0, 0, 23),  -- NC3 Paramus
  (153, 'non_classified', 0, 0, 0, 23),  -- NC3 Paramus Catholic
  (72, 'non_classified', 0, 0, 0, 23),  -- NC3 Paterson Eastside
  (311, 'non_classified', 0, 1, 0, 23),  -- NC3 Pitman
  (224, 'non_classified', 0, 0, 0, 23),  -- NC3 Point Pleasant Boro
  (37, 'non_classified', 0, 3, 0, 23),  -- NC3 Pompton Lakes
  (117, 'non_classified', 0, 0, 0, 23),  -- NC3 Pope John
  (19, 'non_classified', 0, 0, 0, 23),  -- NC3 Ridgewood
  (358, 'non_classified', 0, 1, 0, 23),  -- NC3 Roselle
  (312, 'non_classified', 0, 1, 0, 23),  -- NC3 Salem
  (185, 'non_classified', 0, 1, 0, 23),  -- NC3 Sayreville
  (274, 'non_classified', 0, 0, 0, 23),  -- NC3 Seneca
  (275, 'non_classified', 0, 1, 0, 23),  -- NC3 Shawnee
  (225, 'non_classified', 0, 1, 0, 23),  -- NC3 Shore
  (136, 'non_classified', 0, 2, 0, 23),  -- NC3 South Hunterdon
  (157, 'non_classified', 0, 1, 0, 23),  -- NC3 South Plainfield
  (88, 'non_classified', 0, 0, 0, 23),  -- NC3 St. Mary (Ruth.)
  (48, 'non_classified', 0, 1, 0, 23),  -- NC3 Teaneck
  (301, 'non_classified', 0, 0, 0, 23),  -- NC3 Timber Creek
  (255, 'non_classified', 0, 3, 0, 23),  -- NC3 Toms River South
  (138, 'non_classified', 0, 2, 0, 23),  -- NC3 Union
  (302, 'non_classified', 0, 2, 0, 23),  -- NC3 Washington Township
  (147, 'non_classified', 0, 1, 0, 23),  -- NC3 Watchung Hills
  (68, 'non_classified', 0, 0, 0, 23),  -- NC3 Wayne Valley
  (176, 'non_classified', 0, 1, 0, 23),  -- NC3 West Windsor-Plainsboro North
  (10, 'non_classified', 0, 0, 0, 23),  -- NC3 Westwood
  (228, 'non_classified', 0, 0, 0, 23),  -- NC3 Burlington City
  (159, 'non_classified', 0, 4, 0, 23),  -- NC3 Middletown North
  (96, 'non_classified', 0, 1, 0, 23),  -- NC3 Rutherford
  (118, 'non_classified', 0, 3, 0, 23),  -- NC3 St. Benedicts
  (243, 'non_classified', 0, 0, 0, 23),  -- NC3 St. John Vianney
  (170, 'non_classified', 3, 2, 0, 21),  -- NC144 Hopewell Valley
  (204, 'non_classified', 4, 5, 0, 20.67),  -- NC145 Manalapan
  (286, 'non_classified', 0, 7, 0, 20.5),  -- NC146 Schalick
  (174, 'non_classified', 5, 12, 0, 20.4),  -- NC147 Princeton
  (203, 'non_classified', 4, 14, 0, 20.33),  -- NC148 Lakewood
  (209, 'non_classified', 7, 7, 0, 19.5),  -- NC149 Nottingham
  (154, 'non_classified', 5, 9, 0, 18.67),  -- NC150 Plainfield
  (379, 'non_classified', 3, 7, 0, 17.67),  -- NC151 Lodi
  (308, 'non_classified', 6, 6, 0, 17),  -- NC152 Lindenwold
  (183, 'non_classified', 2, 11, 0, 17),  -- NC152 Piscataway
  (98, 'non_classified', 4, 7, 0, 16.88),  -- NC154 Union City
  (314, 'non_classified', 3, 13, 0, 16),  -- NC155 Demarest
  (169, 'non_classified', 0, 5, 0, 15.67),  -- NC156 Franklin
  (173, 'non_classified', 2, 13, 0, 15.33),  -- NC157 Montgomery
  (106, 'non_classified', 6, 4, 0, 15),  -- NC158 Nutley
  (66, 'non_classified', 1, 2, 0, 15),  -- NC158 Roxbury
  (213, 'non_classified', 6, 20, 0, 15),  -- NC158 Notre Dame
  (148, 'non_classified', 3, 12, 0, 15),  -- NC158 Carteret
  (40, 'non_classified', 3, 4, 0, 14),  -- NC162 Bergenfield
  (61, 'non_classified', 2, 9, 0, 13.86),  -- NC163 Dover
  (181, 'non_classified', 4, 10, 0, 13.6),  -- NC164 New Brunswick
  (214, 'non_classified', 5, 8, 0, 13),  -- NC165 Riverside
  (218, 'non_classified', 1, 7, 0, 13),  -- NC165 Brick Township
  (116, 'non_classified', 3, 9, 0, 12),  -- NC167 North Star Academy
  (195, 'non_classified', 6, 4, 0, 9),  -- NC168 Red Bank Regional
  (226, 'non_classified', 0, 0, 0, 0),  -- NC169 Allentown
  (522, 'non_classified', 0, 0, 0, 0),  -- NC169 Blair
  (229, 'non_classified', 0, 0, 0, 0),  -- NC169 Burlington Township
  (278, 'non_classified', 0, 0, 0, 0),  -- NC169 Camden Catholic
  (268, 'non_classified', 0, 0, 0, 0),  -- NC169 Cherry Hill West
  (93, 'non_classified', 0, 0, 0, 0),  -- NC169 Cranford
  (248, 'non_classified', 0, 0, 0, 0),  -- NC169 Donovan Catholic
  (269, 'non_classified', 0, 0, 0, 0),  -- NC169 Gloucester Catholic
  (102, 'non_classified', 0, 0, 0, 0),  -- NC169 Gov. Livingston
  (112, 'non_classified', 0, 0, 0, 0),  -- NC169 Hackettstown
  (297, 'non_classified', 0, 0, 0, 0),  -- NC169 Hammonton
  (54, 'non_classified', 0, 0, 0, 0),  -- NC169 Hasbrouck Heights
  (31, 'non_classified', 0, 0, 0, 0),  -- NC169 Hawthorne
  (124, 'non_classified', 0, 0, 0, 0),  -- NC169 Hillside
  (94, 'non_classified', 0, 0, 0, 0),  -- NC169 Hoboken
  (201, 'non_classified', 0, 0, 0, 0),  -- NC169 Holy Cross Prep
  (13, 'non_classified', 0, 0, 0, 0),  -- NC169 Indian Hills
  (191, 'non_classified', 0, 0, 0, 0),  -- NC169 Keansburg
  (104, 'non_classified', 0, 0, 0, 0),  -- NC169 Livingston
  (384, 'non_classified', 0, 0, 0, 0),  -- NC169 Monmouth
  (34, 'non_classified', 0, 0, 0, 0),  -- NC169 New Milford
  (310, 'non_classified', 0, 0, 0, 0),  -- NC169 Penns Grove
  (36, 'non_classified', 0, 0, 0, 0),  -- NC169 Pequannock
  (156, 'non_classified', 0, 0, 0, 0),  -- NC169 Ridge
  (294, 'non_classified', 0, 0, 0, 0),  -- NC169 Vineland
  (295, 'non_classified', 0, 0, 0, 0),  -- NC169 Woodstown
  (217, 'non_classified', 0, 0, 0, 0),  -- NC169 Asbury Park
  (315, 'non_classified', 0, 0, 0, 0),  -- NC169 Kittatinny
  (119, 'non_classified', 0, 0, 0, 0),  -- NC169 Whippany Park
  (603, 'non_classified', 0, 1, 0, 0),  -- NC169 Peddie
  (97, 'non_classified', 0, 0, 0, 0),  -- NC169 Secaucus
  (277, 'non_classified', 0, 0, 0, 0),  -- NC169 Atlantic City
  (26, 'non_classified', 0, 0, 0, 0)   -- NC169 Sparta
  ) AS v(school_id, pp_group, w, l, t, pp);

  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Inserted % girls power_points rows', n;
END $$;

-- Verify: expect north 37, south 36, non_classified 200
SELECT pp_group, COUNT(*), SUM(overall_ties) AS ties
FROM power_points WHERE season_id = 2026 AND gender = 'F'
GROUP BY pp_group ORDER BY pp_group;

-- ROLLBACK:
--   DELETE FROM power_points WHERE season_id = 2026 AND gender = 'F';
--   ALTER TABLE power_points DROP CONSTRAINT power_points_pp_group_check;
--   ALTER TABLE power_points DROP COLUMN pp_group, DROP COLUMN overall_ties;
