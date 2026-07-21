-- ============================================================
-- MIGRATION: 20260717_rewrite_scoring_rpcs_use_school_id.sql
-- DESCRIPTION: Rewrite 8 scoring RPCs to aggregate by
--   tournament_entries.school_id (a manually verified FK)
--   instead of school_context_raw + school_names name matching.
--   Also repopulates precomputed_team_scores from the new RPC
--   output, replacing the old two-hop text-matching backfill.
-- APPLIED: pending — paste into Supabase SQL editor, review
--   verification query output first, then apply Part 2.
-- ============================================================
--
-- ── FUNCTIONS CHANGED (8) ────────────────────────────────────
--   district_team_score(integer, gender_type, smallint)
--   region_team_score(integer, gender_type, smallint)
--   girls_region_team_score(text, smallint)
--   state_team_score(gender_type, smallint)
--   district_team_pts(integer, gender_type, smallint)
--   region_team_pts(integer, gender_type, smallint)
--   girls_region_team_pts(text, smallint)
--   state_team_pts(gender_type, smallint)
--
-- ── FUNCTIONS NOT AFFECTED ───────────────────────────────────
--   tw_win_bonus, tw_round_base, tw_loss_bonus,
--   tw_placement_bonus, tw_wrestler_points — pure math helpers,
--   no school reference; unchanged.
--   girls_region_team_score(text) — single-param overload (no
--   season arg) created by create_girls_rpcs.py; different
--   signature; this migration uses DROP IF EXISTS with the
--   explicit (text, smallint) signature so the single-param
--   overload is NOT touched.
--   state_team_score(gender_type) — same: single-param overload
--   not touched; DROP IF EXISTS targets (gender_type, smallint).
--   All other RPCs in pg_proc (district_placements,
--   girls_region_bracket, girls_region_dominance, etc.) are
--   unrelated and unaffected.
-- ============================================================

-- ── PART 1: Rewrite scoring RPCs ─────────────────────────────
-- Apply this first, run the verification query below, then
-- apply Part 2 (repopulation) once results look correct.

BEGIN;

-- ── 1a. district_team_score ───────────────────────────────────
-- Output shape: adds school_id integer (was always null before;
-- app's TeamScoreRow already declared it number | null).
-- school text now returns school_id::text (unique, used as
-- React key; school_name is the display value).

DROP FUNCTION IF EXISTS district_team_score(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION district_team_score(
  p_district integer,
  p_gender   gender_type DEFAULT 'M',
  p_season   smallint    DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
    || ' Districts District ' || p_district
    AND season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  v_level := CASE WHEN p_gender = 'M' THEN 'district' ELSE 'district_32' END;

  RETURN QUERY
  SELECT te.school_id::text            AS school,
         s.display_name                AS school_name,
         te.school_id                  AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM   tournament_entries te
  JOIN   schools s ON s.id = te.school_id
  WHERE  te.tournament_id = v_tid
    AND  te.school_id IS NOT NULL
  GROUP  BY te.school_id, s.display_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER  BY total_points DESC;
END;
$$;

-- ── 1b. region_team_score ─────────────────────────────────────
-- school_lookup CTE now picks school_id from the district entry
-- (same priority ordering as before, just on school_id not raw).

DROP FUNCTION IF EXISTS region_team_score(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION region_team_score(
  p_region integer,
  p_gender gender_type DEFAULT 'M',
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE  name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
    || ' Regions r' || p_region
    AND season_id = p_season;

  v_level := CASE WHEN p_gender = 'M' THEN 'region_16' ELSE 'region_32' END;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM   tournament_entries te2
    JOIN   tournaments t2 ON t2.id = te2.tournament_id
    WHERE  te2.school_id IS NOT NULL
      AND  t2.season_id  = p_season
      AND  t2.gender     = p_gender
    ORDER  BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts'                     THEN 0
           WHEN t2.tournament_type IN ('regions', 'girls_regions')   THEN 1
           ELSE 2 END
  )
  SELECT sl.school_id::text            AS school,
         s.display_name                AS school_name,
         sl.school_id                  AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM   tournament_entries te
  JOIN   school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN   schools s        ON s.id           = sl.school_id
  WHERE  te.tournament_id = v_tid
  GROUP  BY sl.school_id, s.display_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER  BY total_points DESC;
END;
$$;

-- ── 1c. girls_region_team_score ───────────────────────────────
-- DROP targets (text, smallint) only — leaves the single-param
-- overload girls_region_team_score(text) untouched.

DROP FUNCTION IF EXISTS girls_region_team_score(text, smallint);
CREATE OR REPLACE FUNCTION girls_region_team_score(
  p_region text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE  name      = 'Girl_s Regions r' || p_region
    AND  season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM   tournament_entries te2
    JOIN   tournaments t2 ON t2.id = te2.tournament_id
    WHERE  te2.school_id IS NOT NULL
      AND  t2.season_id  = p_season
      AND  t2.gender     = 'F'
    ORDER  BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts'                     THEN 0
           WHEN t2.tournament_type IN ('regions', 'girls_regions')   THEN 1
           ELSE 2 END
  )
  SELECT sl.school_id::text            AS school,
         s.display_name                AS school_name,
         sl.school_id                  AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, 'region_32')), 1) AS total_points
  FROM   tournament_entries te
  JOIN   school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN   schools s        ON s.id           = sl.school_id
  WHERE  te.tournament_id = v_tid
  GROUP  BY sl.school_id, s.display_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, 'region_32')) > 0
  ORDER  BY total_points DESC;
END;
$$;

-- ── 1d. state_team_score ──────────────────────────────────────
-- DROP targets (gender_type, smallint) only — leaves the
-- single-param overload state_team_score(gender_type) untouched.

DROP FUNCTION IF EXISTS state_team_score(gender_type, smallint);
CREATE OR REPLACE FUNCTION state_team_score(
  p_gender gender_type DEFAULT 'M',
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE  name      = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
    AND  season_id = p_season;

  v_level := CASE WHEN p_gender = 'M' THEN 'state_32' ELSE 'state_8' END;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM   tournament_entries te2
    JOIN   tournaments t2 ON t2.id = te2.tournament_id
    WHERE  te2.school_id IS NOT NULL
      AND  t2.season_id  = p_season
      AND  t2.gender     = p_gender
    ORDER  BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts'                     THEN 0
           WHEN t2.tournament_type IN ('regions', 'girls_regions')   THEN 1
           ELSE 2 END
  )
  SELECT sl.school_id::text            AS school,
         s.display_name                AS school_name,
         sl.school_id                  AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM   tournament_entries te
  JOIN   school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN   schools s        ON s.id           = sl.school_id
  WHERE  te.tournament_id = v_tid
  GROUP  BY sl.school_id, s.display_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER  BY total_points DESC;
END;
$$;

-- ── 1e. district_team_pts ─────────────────────────────────────

DROP FUNCTION IF EXISTS district_team_pts(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION district_team_pts(
  p_district integer,
  p_gender   gender_type DEFAULT 'M',
  p_season   smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id uuid, wrestler_name text,
  school text, school_name text, school_id integer,
  weight integer, team_points numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE  name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
    || ' Districts District ' || p_district
    AND season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  v_level := CASE WHEN p_gender = 'M' THEN 'district' ELSE 'district_32' END;

  RETURN QUERY
  SELECT te.wrestler_id,
         w.first_name || ' ' || w.last_name AS wrestler_name,
         te.school_id::text                 AS school,
         s.display_name                     AS school_name,
         te.school_id                       AS school_id,
         wc.weight::integer,
         ROUND(tw_wrestler_points(te.id, v_tid, v_level), 1) AS team_points
  FROM   tournament_entries te
  JOIN   wrestlers w    ON w.id  = te.wrestler_id
  JOIN   weight_classes wc ON wc.id = te.weight_class_id
  JOIN   schools s      ON s.id  = te.school_id
  WHERE  te.tournament_id = v_tid
    AND  te.school_id IS NOT NULL
    AND  tw_wrestler_points(te.id, v_tid, v_level) > 0
  ORDER  BY team_points DESC;
END;
$$;

-- ── 1f. region_team_pts ───────────────────────────────────────

DROP FUNCTION IF EXISTS region_team_pts(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION region_team_pts(
  p_region integer,
  p_gender gender_type DEFAULT 'M',
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id uuid, wrestler_name text,
  school text, school_name text, school_id integer,
  weight integer, team_points numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE  name      = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
    || ' Regions r' || p_region
    AND  season_id = p_season;

  v_level := CASE WHEN p_gender = 'M' THEN 'region_16' ELSE 'region_32' END;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM   tournament_entries te2
    JOIN   tournaments t2 ON t2.id = te2.tournament_id
    WHERE  te2.school_id IS NOT NULL
      AND  t2.season_id  = p_season
      AND  t2.gender     = p_gender
    ORDER  BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts'                     THEN 0
           WHEN t2.tournament_type IN ('regions', 'girls_regions')   THEN 1
           ELSE 2 END
  )
  SELECT te.wrestler_id,
         w.first_name || ' ' || w.last_name AS wrestler_name,
         sl.school_id::text                 AS school,
         s.display_name                     AS school_name,
         sl.school_id                       AS school_id,
         wc.weight::integer,
         ROUND(tw_wrestler_points(te.id, v_tid, v_level), 1) AS team_points
  FROM   tournament_entries te
  JOIN   wrestlers w      ON w.id  = te.wrestler_id
  JOIN   weight_classes wc ON wc.id = te.weight_class_id
  JOIN   school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN   schools s        ON s.id           = sl.school_id
  WHERE  te.tournament_id = v_tid
    AND  tw_wrestler_points(te.id, v_tid, v_level) > 0
  ORDER  BY team_points DESC;
END;
$$;

-- ── 1g. girls_region_team_pts ─────────────────────────────────

DROP FUNCTION IF EXISTS girls_region_team_pts(text, smallint);
CREATE OR REPLACE FUNCTION girls_region_team_pts(
  p_region text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  wrestler_id uuid, wrestler_name text,
  school text, school_name text, school_id integer,
  weight integer, team_points numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE  name      = 'Girl_s Regions r' || p_region
    AND  season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM   tournament_entries te2
    JOIN   tournaments t2 ON t2.id = te2.tournament_id
    WHERE  te2.school_id IS NOT NULL
      AND  t2.season_id  = p_season
      AND  t2.gender     = 'F'
    ORDER  BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts'                     THEN 0
           WHEN t2.tournament_type IN ('regions', 'girls_regions')   THEN 1
           ELSE 2 END
  )
  SELECT te.wrestler_id,
         w.first_name || ' ' || w.last_name AS wrestler_name,
         sl.school_id::text                 AS school,
         s.display_name                     AS school_name,
         sl.school_id                       AS school_id,
         wc.weight::integer,
         ROUND(tw_wrestler_points(te.id, v_tid, 'region_32'), 1) AS team_points
  FROM   tournament_entries te
  JOIN   wrestlers w      ON w.id  = te.wrestler_id
  JOIN   weight_classes wc ON wc.id = te.weight_class_id
  JOIN   school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN   schools s        ON s.id           = sl.school_id
  WHERE  te.tournament_id = v_tid
    AND  tw_wrestler_points(te.id, v_tid, 'region_32') > 0
  ORDER  BY team_points DESC;
END;
$$;

-- ── 1h. state_team_pts ────────────────────────────────────────

DROP FUNCTION IF EXISTS state_team_pts(gender_type, smallint);
CREATE OR REPLACE FUNCTION state_team_pts(
  p_gender gender_type DEFAULT 'M',
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id uuid, wrestler_name text,
  school text, school_name text, school_id integer,
  weight integer, team_points numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE  name      = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
    AND  season_id = p_season;

  v_level := CASE WHEN p_gender = 'M' THEN 'state_32' ELSE 'state_8' END;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM   tournament_entries te2
    JOIN   tournaments t2 ON t2.id = te2.tournament_id
    WHERE  te2.school_id IS NOT NULL
      AND  t2.season_id  = p_season
      AND  t2.gender     = p_gender
    ORDER  BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts'                     THEN 0
           WHEN t2.tournament_type IN ('regions', 'girls_regions')   THEN 1
           ELSE 2 END
  )
  SELECT te.wrestler_id,
         w.first_name || ' ' || w.last_name AS wrestler_name,
         sl.school_id::text                 AS school,
         s.display_name                     AS school_name,
         sl.school_id                       AS school_id,
         wc.weight::integer,
         ROUND(tw_wrestler_points(te.id, v_tid, v_level), 1) AS team_points
  FROM   tournament_entries te
  JOIN   wrestlers w      ON w.id  = te.wrestler_id
  JOIN   weight_classes wc ON wc.id = te.weight_class_id
  JOIN   school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN   schools s        ON s.id           = sl.school_id
  WHERE  te.tournament_id = v_tid
    AND  tw_wrestler_points(te.id, v_tid, v_level) > 0
  ORDER  BY team_points DESC;
END;
$$;

COMMIT;


-- ============================================================
-- VERIFICATION QUERY
-- Run this AFTER applying Part 1 above but BEFORE Part 2.
-- Shows what the new RPCs return for Cherry Hill schools
-- versus what is currently in precomputed_team_scores.
-- Expected: school 363 should have zero boys_districts rows
-- in the NEW column; school 268 should have them.
-- ============================================================

/*
WITH target_ids AS (
  SELECT unnest(ARRAY[267, 268, 363]) AS sid
),

-- Find every district tournament that any of these schools entered
relevant_districts AS (
  SELECT DISTINCT t.district_id, t.gender, t.season_id
  FROM   tournament_entries te
  JOIN   tournaments t ON t.id = te.tournament_id
  JOIN   target_ids ti ON ti.sid = te.school_id
  WHERE  t.tournament_type = 'districts'
    AND  t.district_id IS NOT NULL
),

-- Call the new district_team_score for each relevant district,
-- collect only rows for our three target schools
new_rpc AS (
  SELECT
    rd.season_id,
    CASE WHEN rd.gender = 'M' THEN 'boys_districts' ELSE 'girls_districts' END AS tournament_type,
    r.school_id,
    r.school_name,
    r.total_points
  FROM relevant_districts rd
  CROSS JOIN LATERAL
    district_team_score(rd.district_id, rd.gender, rd.season_id::smallint) r
  WHERE r.school_id IN (SELECT sid FROM target_ids)
)

-- Side-by-side: new RPC vs current DB
SELECT 'NEW_RPC'    AS source, school_id, school_name, tournament_type, season_id, total_points FROM new_rpc
UNION ALL
SELECT 'CURRENT_DB' AS source, school_id, school_name, tournament_type, season_id, total_points
FROM   precomputed_team_scores
WHERE  school_id IN (SELECT sid FROM target_ids)
ORDER  BY school_id, tournament_type, season_id, source;
*/


-- ============================================================
-- PART 2: Repopulate precomputed_team_scores
-- Apply ONLY after verifying Part 1 output looks correct.
-- This replaces every row in precomputed_team_scores using
-- the rewritten RPCs; school_id is now authoritative.
-- ============================================================

/*
BEGIN;

DELETE FROM precomputed_team_scores;

DO $$
DECLARE
  rec record;
  r   record;
BEGIN

  -- ── Districts ──────────────────────────────────────────────
  FOR rec IN
    SELECT id AS tournament_id,
           district_id,
           gender,
           season_id
    FROM   tournaments
    WHERE  tournament_type = 'districts'
      AND  district_id IS NOT NULL
  LOOP
    FOR r IN
      SELECT * FROM district_team_score(
        rec.district_id,
        rec.gender::gender_type,
        rec.season_id::smallint
      )
    LOOP
      INSERT INTO precomputed_team_scores
        (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      VALUES (
        rec.tournament_id,
        r.school_id,
        r.school_name,
        r.total_points,
        rec.season_id,
        CASE WHEN rec.gender = 'M' THEN 'boys_districts' ELSE 'girls_districts' END
      );
    END LOOP;
  END LOOP;

  -- ── Boys regions ───────────────────────────────────────────
  FOR rec IN
    SELECT id AS tournament_id,
           region_id,
           gender,
           season_id
    FROM   tournaments
    WHERE  tournament_type = 'regions'
      AND  region_id IS NOT NULL
  LOOP
    FOR r IN
      SELECT * FROM region_team_score(
        rec.region_id,
        rec.gender::gender_type,
        rec.season_id::smallint
      )
    LOOP
      INSERT INTO precomputed_team_scores
        (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      VALUES (
        rec.tournament_id,
        r.school_id,
        r.school_name,
        r.total_points,
        rec.season_id,
        'regions'
      );
    END LOOP;
  END LOOP;

  -- ── Girls regions ──────────────────────────────────────────
  -- girls_region_team_score takes the region as the suffix of
  -- the tournament name after 'Girl_s Regions r'.
  FOR rec IN
    SELECT id   AS tournament_id,
           name AS tournament_name,
           season_id
    FROM   tournaments
    WHERE  tournament_type = 'girls_regions'
  LOOP
    FOR r IN
      SELECT * FROM girls_region_team_score(
        REPLACE(rec.tournament_name, 'Girl_s Regions r', ''),
        rec.season_id::smallint
      )
    LOOP
      INSERT INTO precomputed_team_scores
        (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      VALUES (
        rec.tournament_id,
        r.school_id,
        r.school_name,
        r.total_points,
        rec.season_id,
        'girls_regions'
      );
    END LOOP;
  END LOOP;

  -- ── Boys state ─────────────────────────────────────────────
  FOR rec IN
    SELECT id AS tournament_id, gender, season_id
    FROM   tournaments
    WHERE  tournament_type = 'boys_state'
  LOOP
    FOR r IN
      SELECT * FROM state_team_score('M'::gender_type, rec.season_id::smallint)
    LOOP
      INSERT INTO precomputed_team_scores
        (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      VALUES (
        rec.tournament_id,
        r.school_id,
        r.school_name,
        r.total_points,
        rec.season_id,
        'boys_state'
      );
    END LOOP;
  END LOOP;

  -- ── Girls state ────────────────────────────────────────────
  FOR rec IN
    SELECT id AS tournament_id, gender, season_id
    FROM   tournaments
    WHERE  tournament_type = 'girls_state'
  LOOP
    FOR r IN
      SELECT * FROM state_team_score('F'::gender_type, rec.season_id::smallint)
    LOOP
      INSERT INTO precomputed_team_scores
        (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      VALUES (
        rec.tournament_id,
        r.school_id,
        r.school_name,
        r.total_points,
        rec.season_id,
        'girls_state'
      );
    END LOOP;
  END LOOP;

END;
$$;

COMMIT;
*/


-- ============================================================
-- ROLLBACK (Part 1 — restore old function bodies)
-- If Part 1 causes problems before Part 2 is applied,
-- re-run update_team_scoring.py to restore the old bodies.
-- If Part 2 has already been applied, restore precomputed_team_scores
-- from a backup or re-run the old scoring pipeline.
-- ============================================================
