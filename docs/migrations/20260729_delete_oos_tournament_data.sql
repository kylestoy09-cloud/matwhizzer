-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260729_delete_oos_tournament_data.sql
--
-- Full wipe of all OOS tournament data, OOS schools, OOS school aliases, and
-- OOS wrestlers so everything can be reimported cleanly with the fixed parser.
--
-- Run each STEP one at a time in Supabase SQL editor.
-- STEP 1 is diagnostic — run it first and verify before proceeding.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── STEP 1: Diagnostic — see what will be deleted ────────────────────────────

SELECT id, name, season, start_date, tournament_type
FROM in_season_tournaments
WHERE tournament_type = 'outside'
ORDER BY start_date;


-- ── STEP 2: Delete bouts for OOS tournaments ─────────────────────────────────

DELETE FROM tournament_bouts
WHERE in_season_tournament_id IN (
  SELECT id FROM in_season_tournaments WHERE tournament_type = 'outside'
);


-- ── STEP 3: Delete placements for OOS tournaments ────────────────────────────

DELETE FROM tournament_placements
WHERE in_season_tournament_id IN (
  SELECT id FROM in_season_tournaments WHERE tournament_type = 'outside'
);


-- ── STEP 4: Delete OOS tournament records ────────────────────────────────────

DELETE FROM in_season_tournaments WHERE tournament_type = 'outside';


-- ── STEP 5: Delete wrestler aliases for OOS schools ──────────────────────────
-- Do this BEFORE deleting OOS schools (school_id FK).

DELETE FROM wrestler_name_aliases
WHERE school_id IN (SELECT id FROM schools WHERE is_nj = false);


-- ── STEP 6: Delete OOS school aliases ────────────────────────────────────────
-- These get rebuilt automatically on reimport when user confirms each school.

DELETE FROM school_aliases WHERE alias_type = 'oos';


-- ── STEP 7: Delete OOS schools ───────────────────────────────────────────────

DELETE FROM schools WHERE is_nj = false;


-- ── STEP 8: Delete OOS wrestlers ─────────────────────────────────────────────
-- Bouts/placements already deleted in steps 2-3, so no FK conflicts.

DELETE FROM wrestlers WHERE is_oos = true;


-- ── STEP 9: Verify ───────────────────────────────────────────────────────────

SELECT
  (SELECT COUNT(*) FROM in_season_tournaments WHERE tournament_type = 'outside') AS oos_tournaments,
  (SELECT COUNT(*) FROM schools WHERE is_nj = false)                              AS oos_schools,
  (SELECT COUNT(*) FROM school_aliases WHERE alias_type = 'oos')                  AS oos_school_aliases,
  (SELECT COUNT(*) FROM wrestlers WHERE is_oos = true)                             AS oos_wrestlers;
-- All four columns should be 0.
