-- docs/migrations/20261106_manieri_qf_forfeit.sql
--
-- Boys 2025-26 District 5, 113: Luke Manieri (Montville) won his quarterfinal by forfeit "over
-- Unknown (For.)" (TrackWrestling's Montville team page, pasted by Kyle 2026-11-06). The season
-- export (Match Data/2026 District Match Data.py) left that line out, so the bout was never stored
-- and the scoring rules saw a bye to the semifinal. TrackWrestling scores it as a forfeit win over
-- a filler entry ("Unknown"): Montville's official 157 needs it (rules gave 155).
-- Stored like the other District 5 quarterfinal forfeits: no loser, forfeit_opponent = 'filler'.
-- Run in the Supabase SQL editor.

BEGIN;

INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, score_raw, validated, forfeit_opponent)
SELECT 144, 54, 'championship', 'QF', '75c42d21-8ba9-48d3-b7cb-601b1bf4e63b', NULL, 'FORF', NULL, NULL, NULL, NULL, true, 'filler'
WHERE NOT EXISTS (SELECT 1 FROM matches WHERE tournament_id = 144 AND round = 'QF' AND winner_entry_id = '75c42d21-8ba9-48d3-b7cb-601b1bf4e63b');

COMMIT;

-- Verify: Montville (school 75) at District 5 2025-26 = 157, the official total
SELECT points FROM tw_boys_school_points(144) WHERE school_id = 75;
