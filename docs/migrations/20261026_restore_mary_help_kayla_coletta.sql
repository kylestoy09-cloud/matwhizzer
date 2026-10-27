-- docs/migrations/20261026_restore_mary_help_kayla_coletta.sql
--
-- Restores school 381 Mary Help of Christians Academy and Kayla Coletta's
-- 2024-25 and 2025-26 data. Part B of 20260917_cliffside_ridgefield_s1_fix.sql
-- deleted the school as "girls-only, no wrestling program, all associated data
-- orphaned/incorrect" and removed every row referencing 381 to get past the
-- foreign keys. That erased Kayla Coletta (107): District 2 runner-up, Region 1
-- semifinalist and state 8th place in 2025-26, a 2024-25 North Region 1 run,
-- 17 in-season tournament bouts, and Mary Help's 1-0 dual (Garfield, 01/15/2026).
-- No backup was taken; nothing else was lost (checked against the 2026-03-21
-- exports and the 2026-09-12 hammer log).
--
-- Applied with scripts/restore_mary_help_kayla_coletta.mts (service role), from:
--   source_of_truth_entries.csv / _matches.csv / _team_scores.csv (2026-03-21):
--     4 entries and 13 matches, original ids
--   placements: district 2nd (source_of_truth_placements.csv); state 8th
--     (9/17 FK error named her state entry in placements; 107 places 1-7 present)
--   wrestler_match_score_log (2026-09-12): ids, opponents, dates of the 17 bouts;
--     rounds and results from the Track exports
--
-- Service-role rows (inserted ids in
-- docs/migrations/backups/20261026_restore_mary_help_kayla_coletta.json):
--   schools 381 (girls side only: no boys rows, it has no boys program) and
--   "William Penn Charter School" (OOS, for a Overbrook jamboree bout);
--   girls_schools, girls_school_profiles, girls_school_districts (2026, D2),
--   girls_school_regions (2026, 10 — same as Paramus Catholic), school_names
--   (MHCA); tournament_entries x4; placements x2; tournament_bouts_girls x17;
--   dual_meets_girls + 1 bout (partial, counts toward record); power_points
--   (non_classified 1-0, 23 PP); precomputed_team_scores x4 (20 / 22 / 15 / 6.5);
--   wrestler_name_aliases x1.
--
-- The service role has no grant on matches, so this file inserts the 13
-- postseason matches. Run it in the Supabase SQL editor.

INSERT INTO matches
  (id, tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id,
   win_type, winner_score, loser_score, fall_time_seconds, score_raw, validated)
VALUES
    ('237f5b59-3498-469b-a466-d69e4d2fe9e6', 135, 68, 'championship', 'R2', '62f75caa-5359-45da-a4bc-71854229e6b5', '4ca2de2b-3847-455b-8c67-4bcbd343f925', 'DEC', 11, 8, NULL, NULL, true),
    ('6682d2c2-e915-4cf6-92f6-132f9952b7f4', 135, 68, 'championship', 'QF', '62f75caa-5359-45da-a4bc-71854229e6b5', '0f592a54-aee6-40f1-884a-4fce533dd778', 'FALL', NULL, NULL, 204, NULL, true),
    ('326eed5f-5f6a-4933-9d3f-4c57aed326cd', 135, 68, 'championship', 'SF', 'a889e3ee-1da8-4e1e-a371-9dc227e813ba', '62f75caa-5359-45da-a4bc-71854229e6b5', 'FALL', NULL, NULL, 42, NULL, true),
    ('0414f10d-6cc0-4736-be1d-a52474c9027b', 135, 68, 'consolation', 'C4', '62f75caa-5359-45da-a4bc-71854229e6b5', '5acd1f67-001e-464b-bbb7-c4a9d23bbb40', 'FALL', NULL, NULL, 271, NULL, true),
    ('e6795109-c388-4ff3-b4f9-738324eb9517', 187, 68, 'championship', 'QF', '30d4df64-a15c-40ab-9907-6d465cf833df', 'c371c4a8-0c8f-4d0d-95d0-307029b4215c', 'FALL', NULL, NULL, 72, NULL, true),
    ('0ecb6136-5089-4421-a0c5-da419d107d13', 187, 68, 'championship', 'SF', '30d4df64-a15c-40ab-9907-6d465cf833df', 'c22d5399-f136-424c-9bc3-cca995880ed3', 'DEC', 7, 3, NULL, NULL, true),
    ('bd39b159-e3cd-4e33-8e1e-086650737eac', 187, 68, 'championship', 'F', '7343024d-72d3-4864-8e9a-f2646409d10d', '30d4df64-a15c-40ab-9907-6d465cf833df', 'FALL', NULL, NULL, 19, NULL, true),
    ('80fc4278-d885-40c7-9332-368afc45552e', 181, 68, 'championship', 'QF', '37e62b6c-5a6d-4cbd-b9f0-4206cfb125fa', '96770c5c-fa51-4d68-8479-31fa6b58bd64', 'FALL', NULL, NULL, 182, 'Fall 3:02', true),
    ('1110a50e-2232-4d7d-9d15-79ca7e05864a', 181, 68, 'championship', 'SF', 'f90c8976-1644-492c-b594-6dac951a8692', '37e62b6c-5a6d-4cbd-b9f0-4206cfb125fa', 'FALL', NULL, NULL, 133, 'Fall 2:13', true),
    ('412312dd-8c91-4b77-b14b-a84195430340', 185, 68, 'championship', 'R1', '0d569475-1b84-445f-90ec-5f4e06f4633d', 'd4470f4a-0eab-4c3f-aa4c-4aac80bab9c5', 'MD', 13, 2, NULL, '13-2', true),
    ('3eb936ac-37a7-4daa-814f-26fc90b3d406', 185, 68, 'consolation', 'C1', 'd4470f4a-0eab-4c3f-aa4c-4aac80bab9c5', '1fc06386-8378-4db5-8fd5-91188ba80575', 'TF-1.5', 15, 0, 360, '15-0', true),
    ('fcf15399-ba04-42c1-8315-36b0b0ab41dd', 185, 68, 'consolation', 'C2', 'd4470f4a-0eab-4c3f-aa4c-4aac80bab9c5', '4f78bcbd-72ad-416b-aba0-ca624f75a18a', 'FALL', NULL, NULL, 228, 'Fall 3:48', true),
    ('8b972a9f-191f-4520-b4dd-4e6e02e651c2', 185, 68, 'consolation', 'C3', 'c156007a-d7e0-498b-941f-3cb508d92dda', 'd4470f4a-0eab-4c3f-aa4c-4aac80bab9c5', 'FALL', NULL, NULL, 181, 'Fall 3:01', true)
ON CONFLICT (id) DO NOTHING;

-- Verify: expect 13 matches and her 4 entries (2024-25 region, 2025-26 district/region/state)
SELECT t.name, m.round, m.win_type,
       CASE WHEN m.winner_entry_id = e.id THEN 'W' ELSE 'L' END AS result
FROM tournament_entries e
JOIN matches m ON e.id IN (m.winner_entry_id, m.loser_entry_id)
JOIN tournaments t ON t.id = m.tournament_id
WHERE e.wrestler_id = 'f2efe0e6-36cd-412b-b576-d1f50bae9992'
ORDER BY t.season_id, t.id, m.round;

-- ROLLBACK: DELETE FROM matches WHERE id IN (the 13 ids above); then delete the
-- service-role rows by the ids in the backup file, in reverse order.
