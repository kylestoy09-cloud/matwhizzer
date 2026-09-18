-- docs/migrations/20260915_delete_school_385.sql
--
-- Delete school 385 (Morris Hills-Morris Knolls combined record).
-- Artifact from the old 3-school co-op model. Real girls data moved to
-- school 76 (Morris Hills, the correct girls co-op host).
-- Executed incrementally via Supabase SQL editor.

UPDATE dual_meet_matches_girls SET school_a_id = 76 WHERE school_a_id = 385;
UPDATE dual_meet_matches_girls SET school_b_id = 76 WHERE school_b_id = 385;
UPDATE dual_meets_girls SET team1_school_id = 76 WHERE team1_school_id = 385;
UPDATE dual_meets_girls SET team2_school_id = 76 WHERE team2_school_id = 385;
UPDATE tournament_bouts_girls SET wrestler1_school_id = 76 WHERE wrestler1_school_id = 385;
UPDATE tournament_bouts_girls SET wrestler2_school_id = 76 WHERE wrestler2_school_id = 385;
UPDATE dual_meets SET team1_school_id = 76 WHERE team1_school_id = 385;
UPDATE dual_meets SET team2_school_id = 76 WHERE team2_school_id = 385;
UPDATE dual_meet_matches SET school_a_id = 76 WHERE school_a_id = 385;
UPDATE dual_meet_matches SET school_b_id = 76 WHERE school_b_id = 385;
UPDATE tournament_bouts SET wrestler1_school_id = 76 WHERE wrestler1_school_id = 385;
UPDATE tournament_bouts SET wrestler2_school_id = 76 WHERE wrestler2_school_id = 385;
UPDATE tournament_entries SET school_id = 76 WHERE school_id = 385;
UPDATE tournament_placements SET school_id = 76 WHERE school_id = 385;
UPDATE in_season_tournament_participants SET school_id = 76 WHERE school_id = 385;
UPDATE in_season_tournament_participants_girls SET school_id = 76 WHERE school_id = 385;
UPDATE in_season_tournament_seeds SET school_id = 76 WHERE school_id = 385;
UPDATE in_season_tournament_seeds_girls SET school_id = 76 WHERE school_id = 385;
UPDATE in_season_tournament_team_scores SET school_id = 76 WHERE school_id = 385;
UPDATE in_season_tournaments SET location_school_id = 76 WHERE location_school_id = 385;
UPDATE in_season_tournaments_girls SET location_school_id = 76 WHERE location_school_id = 385;
UPDATE wrestler_school_history SET school_id = 76 WHERE school_id = 385;
UPDATE pending_wrestler_transfers SET current_school_id = 76 WHERE current_school_id = 385;
UPDATE pending_wrestler_transfers SET suspected_school_id = 76 WHERE suspected_school_id = 385;
DELETE FROM school_names WHERE school_id = 385;
DELETE FROM inactive_school_seasons WHERE school_id = 385;
DELETE FROM school_coops WHERE coop_school_id = 385 OR member_school_id = 385;
DELETE FROM school_aliases WHERE school_id = 385;
DELETE FROM confirmed_schools WHERE school_id = 385;
DELETE FROM roster_grade_import WHERE school_id = 385;
DELETE FROM individual_rankings WHERE school_id = 385;
DELETE FROM playoff_seeds WHERE school_id = 385;
DELETE FROM wrestler_name_aliases WHERE school_id = 385;
DELETE FROM schools WHERE id = 385;
