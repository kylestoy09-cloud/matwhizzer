-- docs/migrations/20261111_split_peter_terranova.sql
--
-- Two boys named Peter Terranova share one profile (a7427d2e-3ea3-45fa-8be0-145db8849bb6): Delbarton School (82) at 132,
-- a state qualifier, and Edison (178) at 126, a sophomore in 2025-26. On 2026-01-03 both wrestled for their own
-- schools on the same day. Kyle (2026-11-11): two wrestlers, split them. The Delbarton wrestler keeps the profile
-- (grade Jr, class of 2027); the Edison wrestler gets a new one (So in 2025-26, so class of 2028, 126) and every
-- row at school 178 moves to it: 26 dual bouts, 7 in-season tournament bouts, 1 district entry (tournament 157),
-- the Edison name alias and the Edison roster row. Backup: docs/migrations/backups/20261111_split_peter_terranova.json.
-- Run in the Supabase SQL editor. Ratings, leaderboards and Snap Shots are rebuilt afterwards.

BEGIN;

INSERT INTO wrestlers (id, first_name, last_name, gender, is_oos, main_weight, grade, graduation_year)
VALUES ('0ff75f06-e3ab-4c6b-8c48-22284f781e9c', 'Peter', 'Terranova', 'M', false, '126', 'So', 2028);

UPDATE dual_meet_matches SET wrestler_a_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' WHERE wrestler_a_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' AND school_a_id = 178;
UPDATE dual_meet_matches SET wrestler_b_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' WHERE wrestler_b_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' AND school_b_id = 178;
UPDATE dual_meet_matches SET winner_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c'
WHERE winner_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' AND ((wrestler_a_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c') OR (wrestler_b_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c'));

UPDATE tournament_bouts SET wrestler1_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' WHERE wrestler1_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' AND wrestler1_school_id = 178;
UPDATE tournament_bouts SET wrestler2_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' WHERE wrestler2_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' AND wrestler2_school_id = 178;

UPDATE tournament_entries SET wrestler_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' WHERE wrestler_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' AND school_id = 178;

UPDATE wrestler_name_aliases SET wrestler_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' WHERE id = 10261 AND wrestler_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' AND school_id = 178;

UPDATE roster_grade_import SET wrestler_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' WHERE id = '0289260f-66cf-4592-b97a-58acaaf3dcdc' AND wrestler_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6';

UPDATE wrestlers SET main_weight = '132' WHERE id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6';

COMMIT;

-- Verify: expected new = 26 duals, 7 tournament bouts, 1 entry, 1 alias; old = 5 duals, 10 tournament bouts, 6 entries, 1 alias
SELECT 'new' AS who,
  (SELECT count(*) FROM dual_meet_matches WHERE '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' IN (wrestler_a_id, wrestler_b_id)) AS duals,
  (SELECT count(*) FROM tournament_bouts WHERE '0ff75f06-e3ab-4c6b-8c48-22284f781e9c' IN (wrestler1_id, wrestler2_id)) AS tournament_bouts,
  (SELECT count(*) FROM tournament_entries WHERE wrestler_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c') AS entries,
  (SELECT count(*) FROM wrestler_name_aliases WHERE wrestler_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c') AS aliases
UNION ALL
SELECT 'old',
  (SELECT count(*) FROM dual_meet_matches WHERE 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' IN (wrestler_a_id, wrestler_b_id)),
  (SELECT count(*) FROM tournament_bouts WHERE 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' IN (wrestler1_id, wrestler2_id)),
  (SELECT count(*) FROM tournament_entries WHERE wrestler_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6'),
  (SELECT count(*) FROM wrestler_name_aliases WHERE wrestler_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6');

-- ROLLBACK (before ratings are rebuilt):
--   UPDATE dual_meet_matches SET wrestler_a_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' WHERE wrestler_a_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
--   UPDATE dual_meet_matches SET wrestler_b_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' WHERE wrestler_b_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
--   UPDATE dual_meet_matches SET winner_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' WHERE winner_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
--   UPDATE tournament_bouts SET wrestler1_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' WHERE wrestler1_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
--   UPDATE tournament_bouts SET wrestler2_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' WHERE wrestler2_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
--   UPDATE tournament_entries SET wrestler_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' WHERE wrestler_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
--   UPDATE wrestler_name_aliases SET wrestler_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' WHERE wrestler_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
--   UPDATE roster_grade_import SET wrestler_id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6' WHERE wrestler_id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
--   UPDATE wrestlers SET main_weight = '126' WHERE id = 'a7427d2e-3ea3-45fa-8be0-145db8849bb6'; DELETE FROM wrestlers WHERE id = '0ff75f06-e3ab-4c6b-8c48-22284f781e9c';
