-- docs/migrations/20260917_cliffside_ridgefield_s1_fix.sql
--
-- Resolves data issues with the Cliffside Park / Ridgefield Memorial season 1
-- co-op situation and permanently removes two empty/incorrect school records.
--
-- Background:
--   School 365 ("Cliffside Park/Ridgefield Memorial") was a co-op shell.
--   The original school_coops seed used 365 as coop_school_id with 364 as a
--   member, so school_wrestlers(365,...) was called but postseason data lives
--   under school_id=364. Prior cleanup migration was fully rolled back.
--   School 381 (Mary Help of Christians Academy) is a girls-only school with
--   no wrestling program — all associated data is orphaned/incorrect.
--
-- This migration:
--   1.  Clears all school_coops / inactive_school_seasons / wrestler_name_aliases
--       rows for shells 365 and 381 (rolled back from prior attempt)
--   2.  Moves all legitimate school 365 data → school 364 (Cliffside Park)
--   3.  Deletes all orphaned data for school 381
--   4.  Deletes both shell schools (365, 381)
--   5.  Marks Ridgefield Memorial (357) inactive for season 1 boys
--   6.  Adds correct school_coops entry: coop=364, member=357, season 1 boys
--   7.  Remaps Beast of East tournament_bouts from 357 → 737 (Ridgefield CT)
--       and removes the incorrect school_alias

-- ══════════════════════════════════════════════════════════════════════════════
-- PART A: Remove shell school 365 (Cliffside Park/Ridgefield Memorial)
-- ══════════════════════════════════════════════════════════════════════════════

-- Junction / metadata tables — delete the shell entries
DELETE FROM school_coops
  WHERE coop_school_id = 365 OR member_school_id = 365;
DELETE FROM inactive_school_seasons  WHERE school_id = 365;
DELETE FROM wrestler_name_aliases    WHERE school_id = 365;
DELETE FROM school_aliases           WHERE school_id = 365;
DELETE FROM school_names             WHERE school_id = 365;
DELETE FROM school_conferences       WHERE school_id = 365;
DELETE FROM school_districts         WHERE school_id = 365;
DELETE FROM school_regions           WHERE school_id = 365;
DELETE FROM boys_schools             WHERE school_id = 365;
DELETE FROM girls_schools            WHERE school_id = 365;
DELETE FROM boys_school_profiles     WHERE school_id = 365;
DELETE FROM boys_school_conferences  WHERE school_id = 365;
DELETE FROM boys_school_districts    WHERE school_id = 365;
DELETE FROM boys_school_regions      WHERE school_id = 365;
DELETE FROM girls_school_profiles    WHERE school_id = 365;
DELETE FROM girls_school_conferences WHERE school_id = 365;
DELETE FROM girls_school_districts   WHERE school_id = 365;
DELETE FROM girls_school_regions     WHERE school_id = 365;
DELETE FROM conference_standings     WHERE school_id = 365;
DELETE FROM confirmed_schools        WHERE school_id = 365;
DELETE FROM roster_grade_import      WHERE school_id = 365;
DELETE FROM microcheck_task_log       WHERE school_id = 365;
DELETE FROM wrestler_school_history  WHERE school_id = 365;

-- Move real wrestling data to school 364 (Cliffside Park)
UPDATE tournament_bouts
  SET wrestler1_school_id = 364, wrestler1_school_raw = 'Cliffside Park'
  WHERE wrestler1_school_id = 365;
UPDATE tournament_bouts
  SET wrestler2_school_id = 364, wrestler2_school_raw = 'Cliffside Park'
  WHERE wrestler2_school_id = 365;
UPDATE tournament_bouts_girls
  SET wrestler1_school_id = 364 WHERE wrestler1_school_id = 365;
UPDATE tournament_bouts_girls
  SET wrestler2_school_id = 364 WHERE wrestler2_school_id = 365;
UPDATE tournament_entries
  SET school_id = 364 WHERE school_id = 365;
UPDATE tournament_placements
  SET school_id = 364 WHERE school_id = 365;
UPDATE in_season_tournament_team_scores
  SET school_id = 364 WHERE school_id = 365;
UPDATE in_season_tournament_participants
  SET school_id = 364 WHERE school_id = 365;
UPDATE in_season_tournament_participants_girls
  SET school_id = 364 WHERE school_id = 365;
UPDATE in_season_tournament_seeds
  SET school_id = 364 WHERE school_id = 365;
UPDATE in_season_tournament_seeds_girls
  SET school_id = 364 WHERE school_id = 365;
UPDATE dual_meets
  SET team1_school_id = 364 WHERE team1_school_id = 365;
UPDATE dual_meets
  SET team2_school_id = 364 WHERE team2_school_id = 365;
UPDATE dual_meets
  SET criteria_winner_school_id = 364 WHERE criteria_winner_school_id = 365;
UPDATE dual_meets_girls
  SET team1_school_id = 364 WHERE team1_school_id = 365;
UPDATE dual_meets_girls
  SET team2_school_id = 364 WHERE team2_school_id = 365;
UPDATE dual_meets_girls
  SET criteria_winner_school_id = 364 WHERE criteria_winner_school_id = 365;
UPDATE dual_meet_matches
  SET school_a_id = 364 WHERE school_a_id = 365;
UPDATE dual_meet_matches
  SET school_b_id = 364 WHERE school_b_id = 365;
UPDATE dual_meet_matches_girls
  SET school_a_id = 364 WHERE school_a_id = 365;
UPDATE dual_meet_matches_girls
  SET school_b_id = 364 WHERE school_b_id = 365;
UPDATE precomputed_team_scores
  SET school_id = 364 WHERE school_id = 365;
UPDATE individual_rankings
  SET school_id = 364 WHERE school_id = 365;
UPDATE power_points
  SET school_id = 364 WHERE school_id = 365;
UPDATE playoff_seeds
  SET school_id = 364 WHERE school_id = 365;
UPDATE tournament_bracket_slots
  SET top_school_id = 364 WHERE top_school_id = 365;
UPDATE tournament_bracket_slots
  SET bottom_school_id = 364 WHERE bottom_school_id = 365;
UPDATE individual_rankings
  SET school_id = 364 WHERE school_id = 365;

-- Delete school 365
DELETE FROM schools WHERE id = 365;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART B: Remove shell school 381 (Mary Help of Christians — girls-only)
-- All data is orphaned/incorrect — delete everything referencing 381
-- ══════════════════════════════════════════════════════════════════════════════

DELETE FROM school_coops
  WHERE coop_school_id = 381 OR member_school_id = 381;
DELETE FROM inactive_school_seasons         WHERE school_id = 381;
DELETE FROM wrestler_name_aliases           WHERE school_id = 381;
DELETE FROM school_aliases                  WHERE school_id = 381;
DELETE FROM school_names                    WHERE school_id = 381;
DELETE FROM school_conferences              WHERE school_id = 381;
DELETE FROM school_districts               WHERE school_id = 381;
DELETE FROM school_regions                  WHERE school_id = 381;
DELETE FROM boys_schools                    WHERE school_id = 381;
DELETE FROM girls_schools                   WHERE school_id = 381;
DELETE FROM boys_school_profiles            WHERE school_id = 381;
DELETE FROM boys_school_conferences         WHERE school_id = 381;
DELETE FROM boys_school_districts           WHERE school_id = 381;
DELETE FROM boys_school_regions             WHERE school_id = 381;
DELETE FROM girls_school_profiles           WHERE school_id = 381;
DELETE FROM girls_school_conferences        WHERE school_id = 381;
DELETE FROM girls_school_districts          WHERE school_id = 381;
DELETE FROM girls_school_regions            WHERE school_id = 381;
DELETE FROM conference_standings            WHERE school_id = 381;
DELETE FROM confirmed_schools               WHERE school_id = 381;
DELETE FROM roster_grade_import             WHERE school_id = 381;
DELETE FROM microcheck_task_log              WHERE school_id = 381;
DELETE FROM wrestler_school_history         WHERE school_id = 381;
DELETE FROM precomputed_team_scores         WHERE school_id = 381;
DELETE FROM individual_rankings             WHERE school_id = 381;
DELETE FROM power_points                    WHERE school_id = 381;
DELETE FROM playoff_seeds                   WHERE school_id = 381;
DELETE FROM in_season_tournament_team_scores     WHERE school_id = 381;
DELETE FROM in_season_tournament_participants    WHERE school_id = 381;
DELETE FROM in_season_tournament_participants_girls WHERE school_id = 381;
DELETE FROM in_season_tournament_seeds           WHERE school_id = 381;
DELETE FROM in_season_tournament_seeds_girls     WHERE school_id = 381;
DELETE FROM dual_meets                      WHERE team1_school_id = 381 OR team2_school_id = 381 OR criteria_winner_school_id = 381;
DELETE FROM dual_meets_girls                WHERE team1_school_id = 381 OR team2_school_id = 381 OR criteria_winner_school_id = 381;
DELETE FROM dual_meet_matches               WHERE school_a_id = 381 OR school_b_id = 381;
DELETE FROM dual_meet_matches_girls         WHERE school_a_id = 381 OR school_b_id = 381;
DELETE FROM tournament_bouts                WHERE wrestler1_school_id = 381 OR wrestler2_school_id = 381;
DELETE FROM tournament_bouts_girls          WHERE wrestler1_school_id = 381 OR wrestler2_school_id = 381;
DELETE FROM tournament_bracket_slots        WHERE top_school_id = 381 OR bottom_school_id = 381;
DELETE FROM tournament_placements           WHERE school_id = 381;
-- matches and placements reference tournament_entries — must go first
DELETE FROM matches
  WHERE winner_entry_id IN (SELECT id FROM tournament_entries WHERE school_id = 381)
     OR loser_entry_id  IN (SELECT id FROM tournament_entries WHERE school_id = 381);
DELETE FROM placements
  WHERE entry_id IN (SELECT id FROM tournament_entries WHERE school_id = 381);
DELETE FROM tournament_entries              WHERE school_id = 381;

DELETE FROM schools WHERE id = 381;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART C: Season 1 co-op metadata for Cliffside Park / Ridgefield Memorial
-- ══════════════════════════════════════════════════════════════════════════════

-- Mark Ridgefield Memorial inactive for season 1 boys
-- (competed as part of Cliffside Park's co-op, no independent program)
INSERT INTO inactive_school_seasons (school_id, season_id, gender)
VALUES (357, 1, 'M')
ON CONFLICT DO NOTHING;

-- Correct co-op record: Cliffside Park (364) is the coop school,
-- Ridgefield Memorial (357) is the member for season 1 boys.
INSERT INTO school_coops (coop_school_id, member_school_id, season, gender, is_primary)
VALUES (364, 357, 1, 'M', false);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART D: Fix Beast of East bouts misattributed to Ridgefield Memorial (357)
-- ══════════════════════════════════════════════════════════════════════════════

-- "Ridgefield" at Beast of East = Ridgefield CT (school 737, is_nj=false)
-- The alias (357, 'Ridgefield') caused mis-attribution during import.
UPDATE tournament_bouts tb
SET wrestler1_school_id = 737,
    wrestler1_school_raw = 'Ridgefield'
WHERE tb.wrestler1_school_id = 357
  AND EXISTS (
    SELECT 1 FROM in_season_tournaments ist
    WHERE ist.id = tb.in_season_tournament_id
      AND ist.name ILIKE '%beast%'
  );

UPDATE tournament_bouts tb
SET wrestler2_school_id = 737,
    wrestler2_school_raw = 'Ridgefield'
WHERE tb.wrestler2_school_id = 357
  AND EXISTS (
    SELECT 1 FROM in_season_tournaments ist
    WHERE ist.id = tb.in_season_tournament_id
      AND ist.name ILIKE '%beast%'
  );

-- Remove the incorrect alias
DELETE FROM school_aliases WHERE school_id = 357 AND alias = 'Ridgefield';

-- ══════════════════════════════════════════════════════════════════════════════
-- Verification
-- ══════════════════════════════════════════════════════════════════════════════
-- Schools 365 and 381 gone (expect 0):
--   SELECT id FROM schools WHERE id IN (365, 381);
--
-- Co-op entry added (expect 1 row):
--   SELECT * FROM school_coops WHERE coop_school_id = 364 AND season = 1;
--
-- Ridgefield Memorial inactive s1 boys (expect 1 row):
--   SELECT * FROM inactive_school_seasons WHERE school_id = 357 AND season_id = 1;
--
-- No Beast of East bouts for 357 (expect 0):
--   SELECT COUNT(*) FROM tournament_bouts tb
--   JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
--   WHERE (tb.wrestler1_school_id = 357 OR tb.wrestler2_school_id = 357)
--     AND ist.name ILIKE '%beast%';
