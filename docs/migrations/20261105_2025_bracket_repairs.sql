-- docs/migrations/20261105_2025_bracket_repairs.sql
--
-- Boys 2024-25 bracket repairs from TrackWrestling's 2024-25 export (scripts/fix_2025_brackets_20261105.mts).
-- 1. 0 finals stored as 3rd-place matches (the export labels District 10's and Region 2's
--    finals "3rd Place Match") become finals. Their placements were corrected to 1st / 2nd by the
--    service role.
-- 2. 26 district bouts the 2026-03-20 load never stored (shared-name wrestlers, nickname names,
--    forfeits over filler entries). 10 entries were recreated by the service role (ids in
--    backups/20261105_2025_bracket_repairs_inserted.json).
-- Run in the Supabase SQL editor. All or nothing.

BEGIN;



INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, score_raw, validated, forfeit_opponent) VALUES
  (95, 66, 'championship', 'QF', '2539447d-1101-4beb-aff5-f8aa21a29133', 'bdd7b6e5-d5e3-4e0b-89ff-fc443e1a3133', 'FALL', NULL, NULL, 174, 'Fall 2:54', true, NULL),  -- D3 285 QF: Quarterfinal - Sean Brown (Newton) 22-13 won by fall over Anthony Bua (Depaul Catholic) 6-13 (Fall 2:54)
  (95, 66, 'championship', 'SF', '3e6f8df7-d17d-4dfb-8332-5697a32e7f8a', '2539447d-1101-4beb-aff5-f8aa21a29133', 'FALL', NULL, NULL, 298, 'Fall 4:58', true, NULL),  -- D3 285 SF: Semifinal - Bradley Kearney (Kittatinny Regional Jr/Sr) 16-11 won by fall over Sean Brown (Newton) 22-13 (Fall
  (95, 66, 'consolation', '3rd_Place', '2539447d-1101-4beb-aff5-f8aa21a29133', '6b8f8fa7-b678-46a8-a946-0d5aa7ec48b5', 'FALL', NULL, NULL, 327, 'Fall 5:27', true, NULL),  -- D3 285 3rd_Place: 3rd Place Match - Sean Brown (Newton) 22-13 won by fall over Zyon Taylor (Vernon Township) 10-9 (Fall 5:27)
  (96, 57, 'championship', 'QF', 'e8a7572b-de12-46af-bd9f-126c2c0bc08d', '75dd5bab-ce82-4732-8b35-4986a062d050', 'FALL', NULL, NULL, 80, 'Fall 1:20', true, NULL),  -- D4 132 QF: Quarterfinal - Nick Bastante (West Essex Regional) 31-5 won by fall over Adam Youssef (Kinnelon) 2-13 (Fall 1:
  (96, 57, 'championship', 'QF', '769415ad-87fc-4d65-9ed6-5ad7af69bbfc', 'c74f7cf8-36e0-4921-b452-cca0da6b8e22', 'MD', 9, 0, NULL, '9-0', true, NULL),  -- D4 132 QF: Quarterfinal - Justin Iannelli (Northern Highlands Regional Sc) 21-12 won by major decision over Matthew Mulli
  (97, 57, 'championship', 'R2', '25682996-d4de-4e19-bd90-b8f674c2a109', '93585341-bd04-4a6e-abba-659516a8698b', 'FALL', NULL, NULL, 358, 'Fall 5:58', true, NULL),  -- D5 132 R2: Champ. Round 1 - Alex Bowden (Leonia/Palisades Park) 4-8 won by fall over Andrew Martin (Dwight Morrow) 4-10 (
  (98, 54, 'championship', 'QF', 'b6f73a4c-584c-458d-86a8-7f0128178d81', '5492cd55-5768-41d8-b148-0674eca0f67c', 'TF-1.5', NULL, NULL, 152, NULL, true, NULL),  -- D6 113 QF: Quarterfinal - Jack Bacigalupo (Mt. Olive) 16-17 won by tech fall over Joseph Paretti (Elmwood Park) 7-18 (TF-
  (101, 53, 'championship', 'QF', '821541bf-6288-42e6-975d-7b426a324297', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D9 106 QF: Quarterfinal - Peter Terranova (Delbarton School) 26-6 won by forfeit over A Forfeit (Forfeit) 0-1 (For.)
  (101, 53, 'championship', 'QF', 'ab0ff596-7712-4d5a-9a6a-8ba56d871b50', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D9 106 QF: Quarterfinal - Aidan Reilly (West Morris ( Mendham)) 29-6 won by forfeit over B Forfeit (Forfeit) 0-1 (For.)
  (101, 54, 'championship', 'QF', 'a4e2d85c-664b-4739-8151-a66547d9e356', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D9 113 QF: Quarterfinal - Cameron Sontz (Delbarton School) 31-0 won by forfeit over C Forfeit (Forfeit) 0-1 (For.)
  (101, 55, 'championship', 'QF', '62116e28-6e33-43eb-8897-a39fe3599688', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D9 120 QF: Quarterfinal - Tommy Marchetti (Delbarton School) 25-7 won by forfeit over G Forfeit (Forfeit) 0-1 (For.)
  (101, 58, 'championship', 'QF', 'ed3f0ec1-fcc7-4bc9-a007-b20f6c578287', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D9 138 QF: Quarterfinal - Chase Quenault (Delbarton School) 25-9 won by forfeit over D Forfeit (Forfeit) 0-1 (For.)
  (101, 58, 'championship', 'QF', '80e74059-9f51-4c2a-94a6-9a71404425b7', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D9 138 QF: Quarterfinal - Mason Pierce (Randolph Hs) 21-11 won by forfeit over E Forfeit (Forfeit) 0-1 (For.)
  (101, 63, 'championship', 'QF', 'cbddb146-6e01-46fa-8284-ea1f7cc504c4', 'bdec3874-18b1-44bb-b25b-174755a4ce0c', 'FALL', NULL, NULL, 173, 'Fall 2:53', true, NULL),  -- D9 175 QF: Quarterfinal - Greg Dixon (Barringer Hs) 5-4 won by fall over Tyler Davis (Randolph Hs) 16-16 (Fall 2:53)
  (101, 66, 'championship', 'QF', '58394170-6ac6-48b2-9807-97ab61fc9e28', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D9 285 QF: Quarterfinal - Gabriel McCulloch (Bloomfield) 31-5 won by forfeit over F Forfeit (Forfeit) 0-1 (For.)
  (104, 61, 'championship', 'R2', '044a753b-2f7f-4638-af2e-8ed8de47ca3e', '2a206811-b204-4f03-be2a-bf57bb8f1a37', 'FALL', NULL, NULL, 86, 'Fall 1:26', true, NULL),  -- D12 157 R2: Champ. Round 1 - Sebastian Eaton (Newark Academy) 7-16 won by fall over Joel Martinez (East Orange Campus) 3-6
  (107, 54, 'championship', 'QF', '45e02f50-070e-49e4-8844-d56bf9a6215d', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D15 113 QF: Quarterfinal - Jacob Richardson (Watchung Hills Regional) 4-2 won by forfeit over A FF () 0-1 (For.)
  (107, 58, 'championship', 'QF', 'c2cfacb4-b9b2-4453-897a-ef5b0105957c', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D15 138 QF: Quarterfinal - Michael Hasson (Delaware Valley Regional) 27-8 won by forfeit over a FF () 0-1 (For.)
  (107, 59, 'championship', 'QF', 'dae4dd52-e0ce-4303-aaaf-626e25c5ba3e', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D15 144 QF: Quarterfinal - Max Ventura (Pingry School) 26-12 won by forfeit over A FF () 0-1 (For.)
  (107, 61, 'championship', 'QF', '5aa05ae8-aaa5-4ff6-a726-91e675735cdd', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D15 157 QF: Quarterfinal - Luke Sinkewicz (Delaware Valley Regional) 27-5 won by forfeit over a FF () 0-1 (For.)
  (107, 62, 'championship', 'QF', 'dce11c3f-e960-440f-8fe1-2e61d467594f', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D15 165 QF: Quarterfinal - Kwabena Morgan (Bound Brook HS) 26-8 won by forfeit over a FF () 0-1 (For.)
  (107, 63, 'championship', 'QF', '1b181cce-4f54-4897-8ad3-59cc3cd5c644', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D15 175 QF: Quarterfinal - Jack Griffin (Middlesex/Dunellen) 27-9 won by forfeit over a FF () 0-1 (For.)
  (107, 64, 'championship', 'QF', '939a360e-83e0-4f9f-8e59-3b5fe5475e58', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'),  -- D15 190 QF: Quarterfinal - Sean O`Neill (Somerville) 25-4 won by forfeit over a FF () 0-1 (For.)
  (109, 63, 'championship', 'QF', 'd1234f6c-099e-4476-9577-7bbc36b3ac61', 'da066dcf-a6d4-41cf-822a-953998eb85a5', 'TF-1.5', NULL, NULL, 115, NULL, true, NULL),  -- D17 175 QF: Quarterfinal - Daniel Benbrook (Middletown North) 33-2 won by tech fall over Jayden Williams (South Brunswick)
  (116, 65, 'championship', 'QF', '866bf126-0dd0-4d90-9491-6052520d324e', '6c139705-94f6-4d5e-91cc-c24dd7c92df8', 'FALL', NULL, NULL, 290, 'Fall 4:50', true, NULL),  -- D24 215 QF: Quarterfinal - Kaleb Fisher (Burlington Township) 20-14 won by fall over Christopher Lopez (Hamilton West) 12-
  (118, 62, 'championship', 'QF', '98d3e682-d74a-481e-8ac8-834e82ef3ba7', '986514b5-20fe-4436-90f7-5df25893f61c', 'TF-1.5', NULL, NULL, 270, NULL, true, NULL);  -- D26 165 QF: Quarterfinal - Jacob Greenberg (Pinelands Regional) 31-4 won by tech fall over Daniel Jimenez (Toms River Nort

COMMIT;

-- Verify: District 10 and Region 2 have 14 finals each
SELECT t.name, count(*) FILTER (WHERE m.round = 'F') AS finals
FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE t.season_id = 2025 AND t.gender = 'M' AND t.name IN ('Boy_s Districts District 10', 'Boy_s Regions r2')
GROUP BY t.name;
