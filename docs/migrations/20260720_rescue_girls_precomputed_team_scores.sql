-- =============================================================================
-- MIGRATION: 20260720_rescue_girls_precomputed_team_scores.sql
-- =============================================================================
-- Emergency rescue: restores precomputed_team_scores rows for 8 girls schools
-- that were deleted by Step 2 of 20260719_girls_tournament_entries_school_id.sql
--
-- Root cause: The Step 2 DELETE correctly removed stale rows keyed by raw
-- school_context_raw names (e.g. 'Jackson Township H.S.') with school_id=NULL.
-- However, CLAUDE.md's note "the RPC recomputes live" is incorrect for
-- top_postseason_team_scores — it reads ONLY from precomputed_team_scores with
-- no live fallback. Deleting rows permanently removes schools from the
-- Postseason Point Leaders leaderboard until rows are re-inserted.
--
-- Step 1 of the prior migration (UPDATE tournament_entries SET school_id=X) was
-- already applied. The scoring RPCs now return the 8 schools with correct
-- school_ids and display_names. This migration re-inserts their rows.
--
-- Target school_ids:
--   370  Jackson Township
--   32   High Point
--   260  Kingsway
--   263  Rancocas Valley
--   190  Hunterdon Central
--   216  Trenton
--   391  Passaic Tech
--   259  Gloucester
--
-- Scope: girls (gender='F'), season_id=2 only.
-- Does NOT touch boys rows or other seasons.
-- Does NOT delete any existing rows.
--
-- Tournament types inserted (matching existing data convention):
--   girls_districts  — from tournaments WHERE tournament_type='districts' AND gender='F'
--   girls_regions    — from tournaments WHERE tournament_type='girls_regions'
--   girls_state      — from tournaments WHERE tournament_type='girls_state'
-- =============================================================================

BEGIN;

DO $$
DECLARE
  rec        record;
  r          record;
  target_ids integer[] := ARRAY[370, 32, 260, 263, 190, 216, 391, 259];
BEGIN

  -- ── Girls Districts ───────────────────────────────────────────────────────
  FOR rec IN
    SELECT id AS tournament_id, district_id, season_id
    FROM   tournaments
    WHERE  tournament_type = 'districts'
      AND  gender           = 'F'
      AND  district_id     IS NOT NULL
      AND  season_id        = 2
  LOOP
    FOR r IN
      SELECT * FROM district_team_score(rec.district_id, 'F', rec.season_id)
      WHERE school_id = ANY(target_ids)
    LOOP
      INSERT INTO precomputed_team_scores
        (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      VALUES
        (rec.tournament_id, r.school_id, r.school_name, r.total_points, rec.season_id, 'girls_districts');
    END LOOP;
  END LOOP;

  -- ── Girls Regions ─────────────────────────────────────────────────────────
  -- girls_region_team_score takes the region number as the suffix of the
  -- tournament name after 'Girl_s Regions r'  (e.g. 'Girl_s Regions r2' → '2')
  FOR rec IN
    SELECT id AS tournament_id, name AS tournament_name, season_id
    FROM   tournaments
    WHERE  tournament_type = 'girls_regions'
      AND  season_id        = 2
  LOOP
    FOR r IN
      SELECT * FROM girls_region_team_score(
        REPLACE(rec.tournament_name, 'Girl_s Regions r', ''),
        rec.season_id
      )
      WHERE school_id = ANY(target_ids)
    LOOP
      INSERT INTO precomputed_team_scores
        (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      VALUES
        (rec.tournament_id, r.school_id, r.school_name, r.total_points, rec.season_id, 'girls_regions');
    END LOOP;
  END LOOP;

  -- ── Girls State ───────────────────────────────────────────────────────────
  FOR rec IN
    SELECT id AS tournament_id, season_id
    FROM   tournaments
    WHERE  tournament_type = 'girls_state'
      AND  season_id        = 2
  LOOP
    FOR r IN
      SELECT * FROM state_team_score('F', rec.season_id)
      WHERE school_id = ANY(target_ids)
    LOOP
      INSERT INTO precomputed_team_scores
        (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      VALUES
        (rec.tournament_id, r.school_id, r.school_name, r.total_points, rec.season_id, 'girls_state');
    END LOOP;
  END LOOP;

END;
$$;

COMMIT;


-- =============================================================================
-- VERIFY (run after applying)
-- Expect 8 rows, all with district_points > 0 and total_points > 0.
-- Jackson Township should be near the top (77 state pts alone).
-- =============================================================================
--
-- SELECT school_name, school_id,
--        district_points, region_points, state_points, total_points
-- FROM   top_postseason_team_scores('F', 2)
-- WHERE  school_id IN (370, 32, 260, 263, 190, 216, 391, 259)
-- ORDER  BY total_points DESC;
--
-- Expected minimum rows: 8
-- Expected Jackson Township total_points: significantly higher than 0


-- =============================================================================
-- ROLLBACK
-- Removes only the rows inserted by this migration (keyed by school_id + season).
-- Safe to run if the INSERT produced incorrect data.
-- =============================================================================
--
-- BEGIN;
-- DELETE FROM precomputed_team_scores
-- WHERE  school_id = ANY(ARRAY[370, 32, 260, 263, 190, 216, 391, 259])
--   AND  season_id = 2;
-- COMMIT;
