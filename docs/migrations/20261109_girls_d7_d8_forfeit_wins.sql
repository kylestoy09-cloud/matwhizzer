-- Girls 2025-26 Districts 7 and 8: forfeit wins over a filler entry that were never loaded (2026-11-09)
--
-- The TrackWrestling export (Whizzer Upload/Match Data/2026 Girls District Data.py) lists 18 wins like
-- "Tanvi Madisetti (Lawrence Senior) won by forfeit over E Forfeit (Team Forfeit) (For.)" that have no stored bout.
-- A forfeit over a filler entry is a contested win (advancement plus 2 bonus; docs/reviews/
-- trackwrestling_team_scoring.md), and the other districts store theirs as FORF with no loser; these follow.
-- Checked across all 12 districts by scripts/build_girls_district_forfeits.mts: none of the stored forfeit wins
-- is a bye in the export ("won by forfeit over ()", an empty slot, is a forfeit, as District 4's are).
-- ROLLBACK: DELETE FROM matches WHERE (tournament_id, weight_class_id, round::text, winner_entry_id) IN (the list below)
--           AND win_type = 'FORF' AND loser_entry_id IS NULL;
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE win_type = 'FORF' AND loser_entry_id IS NULL
             AND (tournament_id, weight_class_id, round::text, winner_entry_id) IN (
               (192, 72, 'QF', 'f7c63551-2cdc-41f6-9dbe-555c42f3f831'::uuid),
               (192, 78, 'QF', '563199bd-f56f-46f2-8bd6-eba823e4362b'::uuid),
               (192, 78, 'QF', '2cc6de16-04f8-41c6-8a51-dee91f555464'::uuid),
               (192, 78, 'QF', 'b9bc1146-a470-4dbd-bf68-e208d9d81f5a'::uuid),
               (193, 74, 'QF', '636b6507-9353-4896-93d5-c24862fee795'::uuid),
               (193, 76, 'QF', 'b3a951cb-0199-4222-bbf1-c182b888fab8'::uuid),
               (193, 77, 'QF', '248aa0a5-f52c-479a-b5ee-991eed3f26c3'::uuid),
               (193, 77, 'QF', 'dfb772a5-2f1b-4ce8-940b-cdb853bd73c6'::uuid),
               (193, 77, 'QF', '4ef32600-286d-47af-852e-de96641ddad5'::uuid),
               (193, 77, 'QF', '6e996635-3d26-4763-a552-0880036be840'::uuid),
               (193, 78, 'QF', 'fe799dfa-8067-48ff-ba8d-645056179d21'::uuid),
               (193, 78, 'QF', '986b8535-03c2-47e0-84d2-c4a84e9ee185'::uuid),
               (193, 74, 'C1', '0e237971-c702-4d3f-a07c-4e4684b52d00'::uuid),
               (193, 76, 'C1', 'c47f54ba-3757-489c-9e13-23f6792f419c'::uuid),
               (193, 78, 'C1', 'a7b610a6-9535-4d91-a111-19d7e6eb49c8'::uuid),
               (193, 78, 'C1', '2f67e180-7d5f-4251-b284-f6bbcbb835e8'::uuid),
               (193, 77, 'C3', '4ef32600-286d-47af-852e-de96641ddad5'::uuid),
               (193, 77, 'C3', 'dfb772a5-2f1b-4ce8-940b-cdb853bd73c6'::uuid)
             )) THEN
    RAISE EXCEPTION 'some of these forfeit wins already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, validated)
  VALUES
    -- D7 132 QF: Janiya Orihuela (North Brunswick Township) 29-9 won by forfeit over A Forfeit (-) 0-1 (For.)
    (192, 72, 'championship', 'QF', 'f7c63551-2cdc-41f6-9dbe-555c42f3f831', NULL, 'FORF', true),
    -- D7 235 QF: Yuliana Hryn (Old Bridge) 26-6 won by forfeit over A Forfeit (-) 0-1 (For.)
    (192, 78, 'championship', 'QF', '563199bd-f56f-46f2-8bd6-eba823e4362b', NULL, 'FORF', true),
    -- D7 235 QF: Michell Barrios (North Brunswick Township) 17-17 won by forfeit over A Forfeit (-) 0-1 (For.)
    (192, 78, 'championship', 'QF', '2cc6de16-04f8-41c6-8a51-dee91f555464', NULL, 'FORF', true),
    -- D7 235 QF: Jana Abdalate (Hillsborough) 23-12 won by forfeit over A Forfeit (-) 0-1 (For.)
    (192, 78, 'championship', 'QF', 'b9bc1146-a470-4dbd-bf68-e208d9d81f5a', NULL, 'FORF', true),
    -- D8 145 QF: Julie Toribio (Notre Dame) 24-10 won by forfeit over I Forfeit (Team Forfeit) 0-2 (For.)
    (193, 74, 'championship', 'QF', '636b6507-9353-4896-93d5-c24862fee795', NULL, 'FORF', true),
    -- D8 165 QF: Theodora Milchanoski (Hopewell Valley Hs) 17-11 won by forfeit over A Forfeit (Team Forfeit) 0-2 (For.)
    (193, 76, 'championship', 'QF', 'b3a951cb-0199-4222-bbf1-c182b888fab8', NULL, 'FORF', true),
    -- D8 185 QF: Tanvi Madisetti (Lawrence Senior) 29-3 won by forfeit over E Forfeit (Team Forfeit) 2-2 (For.)
    (193, 77, 'championship', 'QF', '248aa0a5-f52c-479a-b5ee-991eed3f26c3', NULL, 'FORF', true),
    -- D8 185 QF: Tianna Kee (Ocean Township) 3-6 won by forfeit over B Forfeit (Team Forfeit) 0-2 (For.)
    (193, 77, 'championship', 'QF', 'dfb772a5-2f1b-4ce8-940b-cdb853bd73c6', NULL, 'FORF', true),
    -- D8 185 QF: Emilyn Cardona (Trenton Central) 13-16 won by forfeit over C Forfeit (Team Forfeit) 1-3 (For.)
    (193, 77, 'championship', 'QF', '4ef32600-286d-47af-852e-de96641ddad5', NULL, 'FORF', true),
    -- D8 185 QF: Angelina Manso (Manalapan) 11-9 won by forfeit over D Forfeit (Team Forfeit) 0-2 (For.)
    (193, 77, 'championship', 'QF', '6e996635-3d26-4763-a552-0880036be840', NULL, 'FORF', true),
    -- D8 235 QF: Gabrielle Sanon-Jules (Hightstown) 18-2 won by forfeit over G Forfeit (Team Forfeit) 0-2 (For.)
    (193, 78, 'championship', 'QF', 'fe799dfa-8067-48ff-ba8d-645056179d21', NULL, 'FORF', true),
    -- D8 235 QF: Ashley Perez (Freehold Borough) 21-3 won by forfeit over F Forfeit (Team Forfeit) 0-2 (For.)
    (193, 78, 'championship', 'QF', '986b8535-03c2-47e0-84d2-c4a84e9ee185', NULL, 'FORF', true),
    -- D8 145 C1: Hailey Hawkes (Lawrence Senior) 10-19 won by forfeit over I Forfeit (Team Forfeit) 0-2 (For.)
    (193, 74, 'consolation', 'C1', '0e237971-c702-4d3f-a07c-4e4684b52d00', NULL, 'FORF', true),
    -- D8 165 C1: Katie Huitz-Gonzalez (Trenton Central) 15-12 won by forfeit over A Forfeit (Team Forfeit) 0-2 (For.)
    (193, 76, 'consolation', 'C1', 'c47f54ba-3757-489c-9e13-23f6792f419c', NULL, 'FORF', true),
    -- D8 235 C1: Camila Figueroa (Lawrence Senior) 18-10 won by forfeit over G Forfeit (Team Forfeit) 0-2 (For.)
    (193, 78, 'consolation', 'C1', 'a7b610a6-9535-4d91-a111-19d7e6eb49c8', NULL, 'FORF', true),
    -- D8 235 C1: Katie Barrios (Trenton Central) 19-9 won by forfeit over F Forfeit (Team Forfeit) 0-2 (For.)
    (193, 78, 'consolation', 'C1', '2f67e180-7d5f-4251-b284-f6bbcbb835e8', NULL, 'FORF', true),
    -- D8 185 C3: Emilyn Cardona (Trenton Central) 13-16 won by forfeit over E Forfeit (Team Forfeit) 2-2 (For.)
    (193, 77, 'consolation', 'C3', '4ef32600-286d-47af-852e-de96641ddad5', NULL, 'FORF', true),
    -- D8 185 C3: Tianna Kee (Ocean Township) 3-6 won by forfeit over C Forfeit (Team Forfeit) 1-3 (For.)
    (193, 77, 'consolation', 'C3', 'dfb772a5-2f1b-4ce8-940b-cdb853bd73c6', NULL, 'FORF', true);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 18 THEN RAISE EXCEPTION 'expected 18 forfeit wins, added %', n; END IF;
END $$;

-- Verify: District 7 4, District 8 14
SELECT t.name, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE m.win_type = 'FORF' AND m.loser_entry_id IS NULL AND (m.tournament_id, m.weight_class_id, m.round::text, m.winner_entry_id) IN (
  (192, 72, 'QF', 'f7c63551-2cdc-41f6-9dbe-555c42f3f831'::uuid),
  (192, 78, 'QF', '563199bd-f56f-46f2-8bd6-eba823e4362b'::uuid),
  (192, 78, 'QF', '2cc6de16-04f8-41c6-8a51-dee91f555464'::uuid),
  (192, 78, 'QF', 'b9bc1146-a470-4dbd-bf68-e208d9d81f5a'::uuid),
  (193, 74, 'QF', '636b6507-9353-4896-93d5-c24862fee795'::uuid),
  (193, 76, 'QF', 'b3a951cb-0199-4222-bbf1-c182b888fab8'::uuid),
  (193, 77, 'QF', '248aa0a5-f52c-479a-b5ee-991eed3f26c3'::uuid),
  (193, 77, 'QF', 'dfb772a5-2f1b-4ce8-940b-cdb853bd73c6'::uuid),
  (193, 77, 'QF', '4ef32600-286d-47af-852e-de96641ddad5'::uuid),
  (193, 77, 'QF', '6e996635-3d26-4763-a552-0880036be840'::uuid),
  (193, 78, 'QF', 'fe799dfa-8067-48ff-ba8d-645056179d21'::uuid),
  (193, 78, 'QF', '986b8535-03c2-47e0-84d2-c4a84e9ee185'::uuid),
  (193, 74, 'C1', '0e237971-c702-4d3f-a07c-4e4684b52d00'::uuid),
  (193, 76, 'C1', 'c47f54ba-3757-489c-9e13-23f6792f419c'::uuid),
  (193, 78, 'C1', 'a7b610a6-9535-4d91-a111-19d7e6eb49c8'::uuid),
  (193, 78, 'C1', '2f67e180-7d5f-4251-b284-f6bbcbb835e8'::uuid),
  (193, 77, 'C3', '4ef32600-286d-47af-852e-de96641ddad5'::uuid),
  (193, 77, 'C3', 'dfb772a5-2f1b-4ce8-940b-cdb853bd73c6'::uuid)
) GROUP BY t.name ORDER BY t.name;
