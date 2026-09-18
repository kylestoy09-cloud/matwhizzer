-- Merges two pairs of duplicate OOS schools.
--
-- Mt. St. Charles Academy: 602 (keep) ← 852 (drop)
-- St. Marks:               619 (keep) ← 695 (drop)
--
-- Tables with data on the dropped school IDs:
--   852: tournament_bouts, tournament_placements, wrestler_name_aliases, school_aliases
--   695: tournament_bouts, in_season_tournament_team_scores, school_aliases

BEGIN;

-- ── Mt. St. Charles Academy: keep 602, drop 852 ──────────────────────────────

UPDATE tournament_bouts       SET wrestler1_school_id = 602 WHERE wrestler1_school_id = 852;
UPDATE tournament_bouts       SET wrestler2_school_id = 602 WHERE wrestler2_school_id = 852;
UPDATE tournament_placements  SET school_id = 602           WHERE school_id = 852;
UPDATE wrestler_name_aliases  SET school_id = 602           WHERE school_id = 852;

-- school_aliases: drop 852 rows that already exist on 602 before reassigning
DELETE FROM school_aliases sa
WHERE sa.school_id = 852
  AND EXISTS (
    SELECT 1 FROM school_aliases sa2
    WHERE sa2.school_id = 602 AND sa2.alias = sa.alias
  );
UPDATE school_aliases SET school_id = 602 WHERE school_id = 852;

DELETE FROM schools WHERE id = 852;

-- ── St. Marks: keep 619, drop 695 ────────────────────────────────────────────

UPDATE tournament_bouts                  SET wrestler1_school_id = 619 WHERE wrestler1_school_id = 695;
UPDATE tournament_bouts                  SET wrestler2_school_id = 619 WHERE wrestler2_school_id = 695;
UPDATE in_season_tournament_team_scores  SET school_id = 619           WHERE school_id = 695;

DELETE FROM school_aliases sa
WHERE sa.school_id = 695
  AND EXISTS (
    SELECT 1 FROM school_aliases sa2
    WHERE sa2.school_id = 619 AND sa2.alias = sa.alias
  );
UPDATE school_aliases SET school_id = 619 WHERE school_id = 695;

DELETE FROM schools WHERE id = 695;

COMMIT;
