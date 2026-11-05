-- docs/migrations/20261105_restore_lost_district_bouts.sql
--
-- Restores 10 boys 2025-26 district bouts that were in the database on 2026-03-21
-- (source_of_truth_matches.csv, original ids) and were deleted later with their entries,
-- by something not recorded anywhere. Wrestlers: Ryan Kim (Fort Lee, D8 165), Peter
-- Terranova (Edison, D18 126), Julian Sanchez (WW-P North, D19 215), Owen Williams
-- (Manchester Twp, D26 106), Aidan Johnson (Gloucester City, D28 138), Anthony Russo
-- (Red Bank Catholic, D32 150).
--
-- Service-role rows (scripts/restore_lost_district_bouts_20261105.mts; ids in
-- docs/migrations/backups/20261105_restore_lost_district_bouts_inserted.json):
--   tournament_entries x1 (Anthony Russo, D32 150 seed 1); placements x2 (Kim 2nd, Russo 2nd).
-- The service role has no grant on matches, so this file inserts the bouts.
-- Run it in the Supabase SQL editor.

INSERT INTO matches
  (id, tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id,
   win_type, winner_score, loser_score, fall_time_seconds, score_raw, validated)
VALUES
    ('62acc552-4f86-44bd-9e17-f605e3de5dd1', 147, 62, 'championship', 'QF', 'd3e8a854-4f2c-47f9-9371-8dd9efa5e053', '4a1eb024-2a14-446a-85d1-8c7e58a11ba9', 'FALL', NULL, NULL, 284, 'Fall 4:44', true),  -- District 8 165: Ryan Kim (Fort Lee) QF: Ryan Kim over Huzafia Abdulkadr
    ('ada6a31d-d66d-4f5f-ab34-02149ec998c4', 147, 62, 'championship', 'SF', 'd3e8a854-4f2c-47f9-9371-8dd9efa5e053', '5686562b-24ea-49ee-9f2a-b3122a8996a3', 'FALL', NULL, NULL, 93, 'Fall 1:33', true),  -- District 8 165: Ryan Kim (Fort Lee) SF: Ryan Kim over Angelo Di Blasio
    ('9972db3a-c532-4907-954d-44ac3e8aeb9f', 147, 62, 'championship', 'F', 'fdfb4a28-e7a3-48ef-8b31-bda0182d1b7d', 'd3e8a854-4f2c-47f9-9371-8dd9efa5e053', 'FALL', NULL, NULL, 49, 'Fall 0:49', true),  -- District 8 165: Ryan Kim (Fort Lee) F: Reid Clausi over Ryan Kim
    ('58c4a8c8-758a-4eb3-b191-50d1a367ac4b', 157, 56, 'championship', 'QF', '4f6261ed-cc12-4bc6-824e-2c7f95294f91', 'd78cd7e2-df0f-4653-89a6-3730c2dc64f8', 'FALL', NULL, NULL, 169, 'Fall 2:49', true),  -- District 18 126: Peter Terranova (Edison) QF: Michael Hernandez over Peter Terranova
    ('9066296e-85ae-4300-a1c6-d551f418b6bc', 158, 65, 'championship', 'QF', 'bae9e0a3-a29c-4a81-9e49-bd21ab472b7f', '7baaa515-e4dd-4397-888f-00dc9f14a1c6', 'FALL', NULL, NULL, 294, 'Fall 4:54', true),  -- District 19 215: Julian Sanchez (West Windsor-Plainsboro N) QF: Evan Canica over Julian Sanchez
    ('244c6e83-383a-41b2-bee2-31e4b704a53f', 165, 53, 'championship', 'QF', 'b697708e-02b7-4360-aaac-5c79b7602840', '18f1eb6d-2789-49e8-89ed-adec7b319feb', 'FALL', NULL, NULL, 51, 'Fall 0:51', true),  -- District 26 106: Owen Williams (Manchester Township) QF: Greyson Ruhland over Owen Williams
    ('f2681bdb-631a-4073-a63d-4e1de285b3c4', 167, 58, 'championship', 'QF', 'aafda517-efc3-4858-a48d-c319e09009b0', '0582439b-86ce-4394-bbf7-781fe8fb0f38', 'FALL', NULL, NULL, 111, 'Fall 1:51', true),  -- District 28 138: Aidan Johnson (Gloucester City JR/SR) QF: Trenton Landell over Aidan Johnson
    ('7ae5eb4d-3a0b-4ee7-aea8-4defbdca046e', 171, 60, 'championship', 'QF', '575bd87d-735b-43a4-a6df-5c985642eff1', '5fc0f89c-95b2-43e6-baa7-f58d38d5b303', 'TF-1.5', NULL, NULL, 77, NULL, true),  -- District 32 150: Anthony Russo (Red Bank Catholic Hs) QF: Anthony Russo over Ziyon Moore
    ('2c55d02c-c798-4824-a92a-b8b4a4a12447', 171, 60, 'championship', 'SF', '575bd87d-735b-43a4-a6df-5c985642eff1', 'e12ab40d-6ea6-4361-b67a-638acf45702e', 'TF-1.5', NULL, NULL, 163, NULL, true),  -- District 32 150: Anthony Russo (Red Bank Catholic Hs) SF: Anthony Russo over Gavyn Henderson
    ('b40a60ad-fa96-4783-a4fb-7bfe3cc18361', 171, 60, 'championship', 'F', '8f80f013-c03e-4d6c-9222-7d9a9719c90c', '575bd87d-735b-43a4-a6df-5c985642eff1', 'DEC', 5, 1, NULL, '5-1', true)   -- District 32 150: Anthony Russo (Red Bank Catholic Hs) F: Gabe Tosto over Anthony Russo
ON CONFLICT (id) DO NOTHING;

-- Verify: expect 10 rows
SELECT t.name, m.round, m.win_type, m.score_raw
FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE m.id IN ('62acc552-4f86-44bd-9e17-f605e3de5dd1', 'ada6a31d-d66d-4f5f-ab34-02149ec998c4', '9972db3a-c532-4907-954d-44ac3e8aeb9f', '58c4a8c8-758a-4eb3-b191-50d1a367ac4b', '9066296e-85ae-4300-a1c6-d551f418b6bc', '244c6e83-383a-41b2-bee2-31e4b704a53f', 'f2681bdb-631a-4073-a63d-4e1de285b3c4', '7ae5eb4d-3a0b-4ee7-aea8-4defbdca046e', '2c55d02c-c798-4824-a92a-b8b4a4a12447', 'b40a60ad-fa96-4783-a4fb-7bfe3cc18361')
ORDER BY t.id, m.round;

-- ROLLBACK: DELETE FROM matches WHERE id IN (the 10 ids above); then delete the
-- service-role rows by the ids in the backup file.
