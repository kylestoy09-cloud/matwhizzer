-- docs/migrations/20261106_mericle_region1_r1.sql
--
-- Boys 2024-25 Region 1, 285: Champ. Round 1 - Gavin Mericle (High Point Regional) won by fall over
-- Sean Brown (Newton) (Fall 1:29) (Match Data/2025 Region Data.py; TrackWrestling's High Point team
-- page, pasted by Kyle 2026-11-06). The 2026-03-20 load never stored it: Newton's Sean Brown shares a
-- name with Sparta's, and his 2024-25 entries had been lost (the district ones were restored
-- 2026-11-05). The scoring rules gave Mericle a bye there instead of the win: High Point 103 vs the
-- official 105. His region entry was recreated by the service role (f07d5360-bf94-401e-b200-ac2b3a713043).
-- Run in the Supabase SQL editor.

BEGIN;

INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, score_raw, validated, forfeit_opponent)
SELECT 125, 66, 'championship', 'R2', '38c5ec6f-3c2e-487a-9fb6-9879996ee95c', 'f07d5360-bf94-401e-b200-ac2b3a713043', 'FALL', NULL, NULL, 89, 'Fall 1:29', true, NULL
WHERE NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = 125 AND round = 'R2' AND winner_entry_id = '38c5ec6f-3c2e-487a-9fb6-9879996ee95c');

COMMIT;

-- Verify: High Point (school 32) at Region 1 2024-25 = 105, the official total
SELECT points FROM tw_boys_school_points(125) WHERE school_id = 32;
