-- =============================================================================
-- MIGRATION: 20260717_critical_tier_school_id_migration.sql
-- =============================================================================
-- Batch: CRITICAL tier — 10 functions (team scoring / standings correctness)
-- Pattern: GROUP BY school_context_raw + JOIN school_names → GROUP BY school_id
--          + JOIN schools ON s.id = te.school_id
--
-- Reference fix already applied: school_directory() — see 20260717_rewrite_scoring_rpcs...sql
-- All return types gain school_id integer (matches school_directory pattern).
-- Functions changing their return type require DROP + CREATE (Postgres restriction).
-- No per-function grants exist; all inherit from public schema (anon=U, authenticated=U).
--
-- Apply order: run all 10 blocks top to bottom in a single SQL editor session.
-- Each function's section is self-contained.  The ROLLBACK block (commented) beneath
-- each section lets Paul revert any single function without touching the others.
-- =============================================================================


-- =============================================================================
-- 1. district_team_score(integer, gender_type, smallint)
-- What: team point totals for a single district tournament via tw_wrestler_points()
-- Bug:  GROUP BY te.school_context_raw splits merged schools; NULL-SCR entries dropped
-- Fix:  GROUP BY te.school_id + JOIN schools
-- =============================================================================

-- ROLLBACK — uncomment and run to revert only this function:
/*
DROP FUNCTION IF EXISTS public.district_team_score(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_team_score(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, total_points numeric)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
    || ' Districts District ' || p_district
  AND season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  v_level := CASE WHEN p_gender = 'M' THEN 'district' ELSE 'district_32' END;

  RETURN QUERY
  SELECT te.school_context_raw AS school,
         sn.school_name,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE te.tournament_id = v_tid
    AND te.school_context_raw IS NOT NULL
    AND te.school_context_raw != ''
  GROUP BY te.school_context_raw, sn.school_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;
*/

DROP FUNCTION IF EXISTS public.district_team_score(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_team_score(
  p_district integer,
  p_gender   gender_type DEFAULT 'M'::gender_type,
  p_season   smallint    DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
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
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  JOIN schools s ON s.id = te.school_id
  WHERE te.tournament_id = v_tid
    AND te.school_id IS NOT NULL
  GROUP BY s.id, s.display_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;


-- =============================================================================
-- 2. region_team_score(integer, gender_type, smallint)
-- What: team point totals for a region tournament via tw_wrestler_points()
-- Bug:  school_lookup CTE keys on school_context_raw; GROUP BY SCR
-- Fix:  school_lookup CTE keys on school_id; GROUP BY school_id
-- =============================================================================

-- ROLLBACK:
/*
DROP FUNCTION IF EXISTS public.region_team_score(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.region_team_score(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, total_points numeric)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Regions r' || p_region
  AND season_id = p_season;

  v_level := CASE WHEN p_gender = 'M' THEN 'region_16' ELSE 'region_32' END;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_context_raw IS NOT NULL AND te2.school_context_raw != ''
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0
           WHEN t2.tournament_type IN ('regions','girls_regions') THEN 1
           ELSE 2 END
  )
  SELECT sl.school_context_raw AS school,
         sn.school_name,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN school_names sn ON sn.abbreviation = sl.school_context_raw
  WHERE te.tournament_id = v_tid
  GROUP BY sl.school_context_raw, sn.school_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;
*/

DROP FUNCTION IF EXISTS public.region_team_score(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.region_team_score(
  p_region integer,
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Regions r' || p_region
  AND season_id = p_season;

  v_level := CASE WHEN p_gender = 'M' THEN 'region_16' ELSE 'region_32' END;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0
           WHEN t2.tournament_type IN ('regions','girls_regions') THEN 1
           ELSE 2 END
  )
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN schools s ON s.id = sl.school_id
  WHERE te.tournament_id = v_tid
  GROUP BY s.id, s.display_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;


-- =============================================================================
-- 3. state_team_score(gender_type)   — legacy overload, no season param
-- What: all-time state team scores using inline match-point formula (not tw_wrestler_points)
-- Bug:  school_lookup CTE on SCR; GROUP BY SCR; LIMIT 8
-- Fix:  school_lookup CTE on school_id
-- =============================================================================

-- ROLLBACK:
/*
DROP FUNCTION IF EXISTS public.state_team_score(gender_type);
CREATE OR REPLACE FUNCTION public.state_team_score(p_gender gender_type DEFAULT 'M'::gender_type)
 RETURNS TABLE(school text, school_name text, total_points numeric)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END AND gender = p_gender),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_context_raw IS NOT NULL AND t2.name NOT LIKE '%States%'
    ORDER BY te2.wrestler_id, CASE WHEN t2.name LIKE '%Regions%' THEN 0 ELSE 1 END
  )
  SELECT sl.school_context_raw AS school, sn.school_name,
    ROUND(SUM(
      CASE WHEN m.bracket_side='championship'::bracket_side THEN
        CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 3.0
             WHEN m.win_type::text LIKE 'TF%' THEN 2.5
             WHEN m.win_type='MD'::win_type THEN 2.0 ELSE 1.0 END
      ELSE
        CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 2.5
             WHEN m.win_type::text LIKE 'TF%' THEN 2.0
             WHEN m.win_type='MD'::win_type THEN 1.5 ELSE 0.5 END
      END
    ), 1) AS total_points
  FROM matches m JOIN t ON m.tournament_id=t.id
  JOIN tournament_entries te ON te.id=m.winner_entry_id
  JOIN school_lookup sl ON sl.wrestler_id=te.wrestler_id
  LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
  WHERE m.validated=true AND m.win_type IS NOT NULL AND sl.school_context_raw IS NOT NULL
  GROUP BY sl.school_context_raw, sn.school_name
  ORDER BY total_points DESC LIMIT 8
$function$;
*/

DROP FUNCTION IF EXISTS public.state_team_score(gender_type);
CREATE OR REPLACE FUNCTION public.state_team_score(p_gender gender_type DEFAULT 'M'::gender_type)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
      AND gender = p_gender
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL AND t2.name NOT LIKE '%States%'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.name LIKE '%Regions%' THEN 0 ELSE 1 END
  )
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         ROUND(SUM(
           CASE WHEN m.bracket_side = 'championship'::bracket_side THEN
             CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 3.0
                  WHEN m.win_type::text LIKE 'TF%' THEN 2.5
                  WHEN m.win_type = 'MD'::win_type THEN 2.0 ELSE 1.0 END
           ELSE
             CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 2.5
                  WHEN m.win_type::text LIKE 'TF%' THEN 2.0
                  WHEN m.win_type = 'MD'::win_type THEN 1.5 ELSE 0.5 END
           END
         ), 1) AS total_points
  FROM matches m
  JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN schools s ON s.id = sl.school_id
  WHERE m.validated = true AND m.win_type IS NOT NULL
  GROUP BY s.id, s.display_name
  ORDER BY total_points DESC
  LIMIT 8
$function$;


-- =============================================================================
-- 4. state_team_score(gender_type, smallint)   — season-aware overload
-- What: state team scores for a specific season via tw_wrestler_points()
-- Bug:  school_lookup CTE on SCR; GROUP BY SCR
-- Fix:  school_lookup CTE on school_id
-- =============================================================================

-- ROLLBACK:
/*
DROP FUNCTION IF EXISTS public.state_team_score(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.state_team_score(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, total_points numeric)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
  AND season_id = p_season;

  v_level := CASE WHEN p_gender = 'M' THEN 'state_32' ELSE 'state_8' END;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_context_raw IS NOT NULL AND te2.school_context_raw != ''
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0
           WHEN t2.tournament_type IN ('regions','girls_regions') THEN 1
           ELSE 2 END
  )
  SELECT sl.school_context_raw AS school,
         sn.school_name,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN school_names sn ON sn.abbreviation = sl.school_context_raw
  WHERE te.tournament_id = v_tid
  GROUP BY sl.school_context_raw, sn.school_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;
*/

DROP FUNCTION IF EXISTS public.state_team_score(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.state_team_score(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
  AND season_id = p_season;

  v_level := CASE WHEN p_gender = 'M' THEN 'state_32' ELSE 'state_8' END;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0
           WHEN t2.tournament_type IN ('regions','girls_regions') THEN 1
           ELSE 2 END
  )
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN schools s ON s.id = sl.school_id
  WHERE te.tournament_id = v_tid
  GROUP BY s.id, s.display_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;


-- =============================================================================
-- 5. girls_region_team_score(text, smallint)
-- What: team point totals for a girls region tournament
-- Bug:  school_lookup CTE on SCR; GROUP BY SCR
-- Fix:  school_lookup CTE on school_id
-- =============================================================================

-- ROLLBACK:
/*
DROP FUNCTION IF EXISTS public.girls_region_team_score(text, smallint);
CREATE OR REPLACE FUNCTION public.girls_region_team_score(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, total_points numeric)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = 'Girl_s Regions r' || p_region
  AND season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_context_raw IS NOT NULL AND te2.school_context_raw != ''
      AND t2.season_id = p_season AND t2.gender = 'F'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0
           WHEN t2.tournament_type IN ('regions','girls_regions') THEN 1
           ELSE 2 END
  )
  SELECT sl.school_context_raw AS school,
         sn.school_name,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, 'region_32')), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN school_names sn ON sn.abbreviation = sl.school_context_raw
  WHERE te.tournament_id = v_tid
  GROUP BY sl.school_context_raw, sn.school_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, 'region_32')) > 0
  ORDER BY total_points DESC;
END;
$function$;
*/

DROP FUNCTION IF EXISTS public.girls_region_team_score(text, smallint);
CREATE OR REPLACE FUNCTION public.girls_region_team_score(
  p_region text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = 'Girl_s Regions r' || p_region
  AND season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = 'F'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0
           WHEN t2.tournament_type IN ('regions','girls_regions') THEN 1
           ELSE 2 END
  )
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, 'region_32')), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN schools s ON s.id = sl.school_id
  WHERE te.tournament_id = v_tid
  GROUP BY s.id, s.display_name
  HAVING SUM(tw_wrestler_points(te.id, v_tid, 'region_32')) > 0
  ORDER BY total_points DESC;
END;
$function$;


-- =============================================================================
-- 6. lb_team_points(gender_type, smallint)
-- What: all-tournament team match-points leaderboard (top 12) — used on homepage
-- Bug:  direct GROUP BY te.school_context_raw; LEFT JOIN school_names
-- Fix:  GROUP BY te.school_id; JOIN schools
-- =============================================================================

-- ROLLBACK:
/*
DROP FUNCTION IF EXISTS public.lb_team_points(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_team_points(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, total_points numeric, match_count bigint)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT te.school_context_raw AS school,
    COALESCE(sn.school_name, te.school_context_raw) AS school_name,
    ROUND(SUM(
      CASE m.bracket_side
        WHEN 'championship' THEN
          CASE m.win_type WHEN 'FALL' THEN 3.0 WHEN 'TF-1.5' THEN 2.5 WHEN 'TF' THEN 2.5
            WHEN 'MD' THEN 2.0 WHEN 'DEC' THEN 1.0 ELSE 0 END
        WHEN 'consolation' THEN
          CASE m.win_type WHEN 'FALL' THEN 2.5 WHEN 'TF-1.5' THEN 2.0 WHEN 'TF' THEN 2.0
            WHEN 'MD' THEN 1.5 WHEN 'DEC' THEN 0.5 ELSE 0 END
        ELSE 0
      END
    ), 1) AS total_points,
    COUNT(*) FILTER (WHERE m.win_type IS NOT NULL)::bigint AS match_count
  FROM matches m
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.validated = true
    AND t.gender = p_gender
    AND t.season_id = p_season
    AND te.school_context_raw IS NOT NULL
  GROUP BY te.school_context_raw, sn.school_name
  ORDER BY total_points DESC
  LIMIT 12
$function$;
*/

DROP FUNCTION IF EXISTS public.lb_team_points(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_team_points(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         ROUND(SUM(
           CASE m.bracket_side
             WHEN 'championship' THEN
               CASE m.win_type WHEN 'FALL' THEN 3.0 WHEN 'TF-1.5' THEN 2.5 WHEN 'TF' THEN 2.5
                 WHEN 'MD' THEN 2.0 WHEN 'DEC' THEN 1.0 ELSE 0 END
             WHEN 'consolation' THEN
               CASE m.win_type WHEN 'FALL' THEN 2.5 WHEN 'TF-1.5' THEN 2.0 WHEN 'TF' THEN 2.0
                 WHEN 'MD' THEN 1.5 WHEN 'DEC' THEN 0.5 ELSE 0 END
             ELSE 0
           END
         ), 1) AS total_points,
         COUNT(*) FILTER (WHERE m.win_type IS NOT NULL)::bigint AS match_count
  FROM matches m
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  JOIN schools s ON s.id = te.school_id
  WHERE m.validated = true
    AND t.gender = p_gender
    AND t.season_id = p_season
    AND te.school_id IS NOT NULL
  GROUP BY s.id, s.display_name
  ORDER BY total_points DESC
  LIMIT 12
$function$;


-- =============================================================================
-- 7. lb_gp_team_points(text, smallint)   — girls grand prix, season-typed overload
-- What: girls grand prix cumulative team points across district/region/state pools
-- Bug:  school_lookup CTE on SCR; dist/reg/stt CTEs GROUP BY SCR;
--       FULL OUTER JOIN on text abbreviation keys
-- Fix:  school_lookup CTE on school_id; CTEs GROUP BY school_id;
--       FULL OUTER JOIN on integer school_id keys
-- =============================================================================

-- ROLLBACK:
/*
DROP FUNCTION IF EXISTS public.lb_gp_team_points(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_team_points(p_pool text DEFAULT 'region'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, total_points numeric, match_count bigint)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_context_raw IS NOT NULL AND te2.school_context_raw <> ''
      AND t2.season_id = p_season AND t2.gender = 'F'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0
           WHEN t2.tournament_type = 'girls_regions' THEN 1
           ELSE 2 END
  ),
  dist AS (
    SELECT sl.school_context_raw AS sch,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, 'district_32')), 1) AS pts,
           COUNT(*)::bigint AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.tournament_type = 'districts'
    GROUP BY sl.school_context_raw
  ),
  reg AS (
    SELECT sl.school_context_raw AS sch,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, 'region_32')), 1) AS pts,
           COUNT(*)::bigint AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.tournament_type = 'girls_regions'
    GROUP BY sl.school_context_raw
  ),
  stt AS (
    SELECT sl.school_context_raw AS sch,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, 'state_8')), 1) AS pts,
           COUNT(*)::bigint AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.name = 'Girl_s States'
    GROUP BY sl.school_context_raw
  ),
  combined AS (
    SELECT COALESCE(d.sch, r.sch, stt.sch) AS sch,
           CASE
             WHEN p_pool = 'districts' THEN COALESCE(d.pts, 0)
             WHEN p_pool = 'region'    THEN COALESCE(d.pts, 0) + COALESCE(r.pts, 0)
             ELSE COALESCE(d.pts, 0) + COALESCE(r.pts, 0) + COALESCE(stt.pts, 0)
           END AS total,
           CASE
             WHEN p_pool = 'districts' THEN COALESCE(d.cnt, 0)
             WHEN p_pool = 'region'    THEN COALESCE(d.cnt, 0) + COALESCE(r.cnt, 0)
             ELSE COALESCE(d.cnt, 0) + COALESCE(r.cnt, 0) + COALESCE(stt.cnt, 0)
           END AS cnt
    FROM dist d
    FULL OUTER JOIN reg r ON d.sch = r.sch
    FULL OUTER JOIN stt ON COALESCE(d.sch, r.sch) = stt.sch
  )
  SELECT c.sch AS school,
         sn.school_name,
         c.total AS total_points,
         c.cnt AS match_count
  FROM combined c
  LEFT JOIN school_names sn ON sn.abbreviation = c.sch
  WHERE c.total > 0
  ORDER BY c.total DESC
  LIMIT 25;
END;
$function$;
*/

DROP FUNCTION IF EXISTS public.lb_gp_team_points(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_team_points(
  p_pool   text     DEFAULT 'region'::text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = 'F'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts'    THEN 0
           WHEN t2.tournament_type = 'girls_regions' THEN 1
           ELSE 2 END
  ),
  dist AS (
    SELECT sl.school_id                                                    AS sch_id,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, 'district_32')), 1)  AS pts,
           COUNT(*)::bigint                                                AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.tournament_type = 'districts'
    GROUP BY sl.school_id
  ),
  reg AS (
    SELECT sl.school_id                                                    AS sch_id,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, 'region_32')), 1)    AS pts,
           COUNT(*)::bigint                                                AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.tournament_type = 'girls_regions'
    GROUP BY sl.school_id
  ),
  stt AS (
    SELECT sl.school_id                                                    AS sch_id,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, 'state_8')), 1)      AS pts,
           COUNT(*)::bigint                                                AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.name = 'Girl_s States'
    GROUP BY sl.school_id
  ),
  combined AS (
    SELECT COALESCE(d.sch_id, r.sch_id, stt.sch_id) AS sch_id,
           CASE
             WHEN p_pool = 'districts' THEN COALESCE(d.pts, 0)
             WHEN p_pool = 'region'    THEN COALESCE(d.pts, 0) + COALESCE(r.pts, 0)
             ELSE COALESCE(d.pts, 0) + COALESCE(r.pts, 0) + COALESCE(stt.pts, 0)
           END AS total,
           CASE
             WHEN p_pool = 'districts' THEN COALESCE(d.cnt, 0)
             WHEN p_pool = 'region'    THEN COALESCE(d.cnt, 0) + COALESCE(r.cnt, 0)
             ELSE COALESCE(d.cnt, 0) + COALESCE(r.cnt, 0) + COALESCE(stt.cnt, 0)
           END AS cnt
    FROM dist d
    FULL OUTER JOIN reg r   ON d.sch_id = r.sch_id
    FULL OUTER JOIN stt     ON COALESCE(d.sch_id, r.sch_id) = stt.sch_id
  )
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         c.total        AS total_points,
         c.cnt          AS match_count
  FROM combined c
  JOIN schools s ON s.id = c.sch_id
  WHERE c.total > 0
  ORDER BY c.total DESC
  LIMIT 25;
END;
$function$;


-- =============================================================================
-- 8. lb_gp_team_points(text, integer)   — all-time/unfiltered overload
-- What: girls grand prix team points with optional pool filter, no season constraint
-- Bug:  school_lookup CTE + triple-join (school_names → schools.display_name) — fragile
-- Fix:  direct JOIN schools ON te.school_id; drop school_lookup and school_names entirely
-- Note: return type unchanged (already had school_id); using CREATE OR REPLACE
-- =============================================================================

-- ROLLBACK:
/*
CREATE OR REPLACE FUNCTION public.lb_gp_team_points(p_pool text, p_season integer DEFAULT NULL::integer)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F'
      AND (
        (p_pool = 'region' AND name LIKE 'Girl_s Regions%')
        OR (p_pool = 'state'  AND name LIKE 'Girl_s%')
        OR p_pool IS NULL
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_context_raw IS NOT NULL
      AND t2.name NOT LIKE '%States%' AND t2.gender = 'F'
    ORDER BY te2.wrestler_id, CASE WHEN t2.name LIKE '%Regions%' THEN 0 ELSE 1 END
  )
  SELECT
    COALESCE(te.school_context_raw, sl.school_context_raw) AS school,
    COALESCE(sn.school_name, te.school_context_raw, sl.school_context_raw) AS school_name,
    s.id AS school_id,
    ROUND(SUM(
      CASE WHEN m.bracket_side = 'championship'::bracket_side THEN
        CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 3.0
             WHEN m.win_type::text LIKE 'TF%' THEN 2.5
             WHEN m.win_type = 'MD'::win_type THEN 2.0 ELSE 1.0 END
      ELSE
        CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 2.5
             WHEN m.win_type::text LIKE 'TF%' THEN 2.0
             WHEN m.win_type = 'MD'::win_type THEN 1.5 ELSE 0.5 END
      END
    ), 1) AS total_points,
    COUNT(*) AS match_count
  FROM matches m
  JOIN pool_tournaments pt ON m.tournament_id = pt.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN school_names sn ON sn.abbreviation = COALESCE(te.school_context_raw, sl.school_context_raw)
  LEFT JOIN schools s ON s.display_name = COALESCE(sn.school_name, te.school_context_raw, sl.school_context_raw)
  WHERE m.validated = true AND m.win_type IS NOT NULL
  GROUP BY COALESCE(te.school_context_raw, sl.school_context_raw),
           COALESCE(sn.school_name, te.school_context_raw, sl.school_context_raw),
           s.id
  ORDER BY total_points DESC LIMIT 12
$function$;
*/

CREATE OR REPLACE FUNCTION public.lb_gp_team_points(
  p_pool   text,
  p_season integer DEFAULT NULL::integer
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F'
      AND (
        (p_pool = 'region' AND name LIKE 'Girl_s Regions%')
        OR (p_pool = 'state'  AND name LIKE 'Girl_s%')
        OR p_pool IS NULL
      )
  )
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         ROUND(SUM(
           CASE WHEN m.bracket_side = 'championship'::bracket_side THEN
             CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 3.0
                  WHEN m.win_type::text LIKE 'TF%' THEN 2.5
                  WHEN m.win_type = 'MD'::win_type THEN 2.0 ELSE 1.0 END
           ELSE
             CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 2.5
                  WHEN m.win_type::text LIKE 'TF%' THEN 2.0
                  WHEN m.win_type = 'MD'::win_type THEN 1.5 ELSE 0.5 END
           END
         ), 1) AS total_points,
         COUNT(*) AS match_count
  FROM matches m
  JOIN pool_tournaments pt ON m.tournament_id = pt.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN schools s ON s.id = te.school_id
  WHERE m.validated = true
    AND m.win_type IS NOT NULL
    AND te.school_id IS NOT NULL
  GROUP BY s.id, s.display_name
  ORDER BY total_points DESC
  LIMIT 12
$function$;


-- =============================================================================
-- 9. lb_p_team_points(gender_type, text, smallint)
-- What: pool-filtered cumulative team points (district/region/all) by gender
-- Bug:  school_lookup CTE on SCR; dist/reg/st CTEs GROUP BY SCR;
--       final SELECT gets school_id from sn.school_id (school_names) — indirect
-- Fix:  school_lookup CTE on school_id; CTEs GROUP BY school_id;
--       school_id from s.id (schools) directly
-- Note: return type unchanged (already had school_id); using CREATE OR REPLACE
-- =============================================================================

-- ROLLBACK:
/*
CREATE OR REPLACE FUNCTION public.lb_p_team_points(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  DECLARE
    v_ttype_region tournament_type;
    v_district_level text;
    v_region_level text;
    v_state_name text;
    v_state_level text;
  BEGIN
    IF p_gender = 'M' THEN
      v_district_level := 'district';    v_ttype_region := 'regions';
      v_region_level := 'region_16';    v_state_name   := 'Boy_s States';
      v_state_level  := 'state_32';
    ELSE
      v_district_level := 'district_32'; v_ttype_region := 'girls_regions';
      v_region_level := 'region_32';    v_state_name   := 'Girl_s States';
      v_state_level  := 'state_8';
    END IF;

    RETURN QUERY
    WITH school_lookup AS (
      SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_context_raw
      FROM tournament_entries te2
      JOIN tournaments t2 ON t2.id = te2.tournament_id
      WHERE te2.school_context_raw IS NOT NULL AND te2.school_context_raw <> ''
        AND t2.season_id = p_season AND t2.gender = p_gender
      ORDER BY te2.wrestler_id,
        CASE WHEN t2.tournament_type = 'districts' THEN 0
             WHEN t2.tournament_type IN ('regions','girls_regions') THEN 1
             ELSE 2 END
    ),
    dist AS (
      SELECT sl.school_context_raw AS sch,
             ROUND(SUM(tw_wrestler_points(te.id, t.id, v_district_level)), 1) AS pts,
             COUNT(*)::bigint AS cnt
      FROM tournament_entries te
      JOIN tournaments t ON t.id = te.tournament_id
      JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
      WHERE t.season_id = p_season AND t.gender = p_gender AND t.tournament_type = 'districts'
      GROUP BY sl.school_context_raw
    ),
    reg AS (
      SELECT sl.school_context_raw AS sch,
             ROUND(SUM(tw_wrestler_points(te.id, t.id, v_region_level)), 1) AS pts,
             COUNT(*)::bigint AS cnt
      FROM tournament_entries te
      JOIN tournaments t ON t.id = te.tournament_id
      JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
      WHERE t.season_id = p_season AND t.gender = p_gender AND t.tournament_type = v_ttype_region
      GROUP BY sl.school_context_raw
    ),
    st AS (
      SELECT sl.school_context_raw AS sch,
             ROUND(SUM(tw_wrestler_points(te.id, t.id, v_state_level)), 1) AS pts,
             COUNT(*)::bigint AS cnt
      FROM tournament_entries te
      JOIN tournaments t ON t.id = te.tournament_id
      JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
      WHERE t.season_id = p_season AND t.gender = p_gender AND t.name = v_state_name
      GROUP BY sl.school_context_raw
    ),
    combined AS (
      SELECT COALESCE(d.sch, r.sch, s.sch) AS sch,
             CASE
               WHEN p_pool = 'district' THEN COALESCE(d.pts, 0)
               WHEN p_pool = 'region'   THEN COALESCE(d.pts, 0) + COALESCE(r.pts, 0)
               ELSE COALESCE(d.pts, 0) + COALESCE(r.pts, 0) + COALESCE(s.pts, 0)
             END AS total,
             CASE
               WHEN p_pool = 'district' THEN COALESCE(d.cnt, 0)
               WHEN p_pool = 'region'   THEN COALESCE(d.cnt, 0) + COALESCE(r.cnt, 0)
               ELSE COALESCE(d.cnt, 0) + COALESCE(r.cnt, 0) + COALESCE(s.cnt, 0)
             END AS cnt
      FROM dist d
      FULL OUTER JOIN reg r ON d.sch = r.sch
      FULL OUTER JOIN st s ON COALESCE(d.sch, r.sch) = s.sch
    )
    SELECT c.sch AS school,
           sn.school_name,
           sn.school_id,
           c.total AS total_points,
           c.cnt AS match_count
    FROM combined c
    LEFT JOIN school_names sn ON sn.abbreviation = c.sch
    WHERE c.total > 0
    ORDER BY c.total DESC
    LIMIT 25;
  END;
  $function$;
*/

CREATE OR REPLACE FUNCTION public.lb_p_team_points(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ttype_region   tournament_type;
  v_district_level text;
  v_region_level   text;
  v_state_name     text;
  v_state_level    text;
BEGIN
  IF p_gender = 'M' THEN
    v_district_level := 'district';    v_ttype_region := 'regions';
    v_region_level   := 'region_16';  v_state_name   := 'Boy_s States';
    v_state_level    := 'state_32';
  ELSE
    v_district_level := 'district_32'; v_ttype_region := 'girls_regions';
    v_region_level   := 'region_32';  v_state_name   := 'Girl_s States';
    v_state_level    := 'state_8';
  END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0
           WHEN t2.tournament_type IN ('regions','girls_regions') THEN 1
           ELSE 2 END
  ),
  dist AS (
    SELECT sl.school_id                                                        AS sch_id,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, v_district_level)), 1)   AS pts,
           COUNT(*)::bigint                                                    AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = p_gender AND t.tournament_type = 'districts'
    GROUP BY sl.school_id
  ),
  reg AS (
    SELECT sl.school_id                                                        AS sch_id,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, v_region_level)), 1)     AS pts,
           COUNT(*)::bigint                                                    AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = p_gender AND t.tournament_type = v_ttype_region
    GROUP BY sl.school_id
  ),
  stt AS (
    SELECT sl.school_id                                                        AS sch_id,
           ROUND(SUM(tw_wrestler_points(te.id, t.id, v_state_level)), 1)      AS pts,
           COUNT(*)::bigint                                                    AS cnt
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = p_gender AND t.name = v_state_name
    GROUP BY sl.school_id
  ),
  combined AS (
    SELECT COALESCE(d.sch_id, r.sch_id, stt.sch_id) AS sch_id,
           CASE
             WHEN p_pool = 'district' THEN COALESCE(d.pts, 0)
             WHEN p_pool = 'region'   THEN COALESCE(d.pts, 0) + COALESCE(r.pts, 0)
             ELSE COALESCE(d.pts, 0) + COALESCE(r.pts, 0) + COALESCE(stt.pts, 0)
           END AS total,
           CASE
             WHEN p_pool = 'district' THEN COALESCE(d.cnt, 0)
             WHEN p_pool = 'region'   THEN COALESCE(d.cnt, 0) + COALESCE(r.cnt, 0)
             ELSE COALESCE(d.cnt, 0) + COALESCE(r.cnt, 0) + COALESCE(stt.cnt, 0)
           END AS cnt
    FROM dist d
    FULL OUTER JOIN reg r   ON d.sch_id = r.sch_id
    FULL OUTER JOIN stt     ON COALESCE(d.sch_id, r.sch_id) = stt.sch_id
  )
  SELECT s.display_name AS school,
         s.display_name AS school_name,
         s.id           AS school_id,
         c.total        AS total_points,
         c.cnt          AS match_count
  FROM combined c
  JOIN schools s ON s.id = c.sch_id
  WHERE c.total > 0
  ORDER BY c.total DESC
  LIMIT 25;
END;
$function$;


-- =============================================================================
-- 10. top_district_team_scores(character, smallint, integer)
-- What: cross-district top-teams leaderboard (home page); p_gender is bpchar not gender_type
-- Bug:  GROUP BY te.school_context_raw; LEFT JOIN school_names
-- Fix:  GROUP BY te.school_id; JOIN schools
-- =============================================================================

-- ROLLBACK:
/*
DROP FUNCTION IF EXISTS public.top_district_team_scores(character, smallint, integer);
CREATE OR REPLACE FUNCTION public.top_district_team_scores(p_gender character DEFAULT 'M'::bpchar, p_season smallint DEFAULT 1, p_limit integer DEFAULT 24)
 RETURNS TABLE(school text, school_name text, total_points numeric, district integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH district_teams AS (
    SELECT
      te.school_context_raw AS school,
      sn.school_name,
      SUM(tw_wrestler_points(te.id, t.id,
        CASE WHEN p_gender = 'F' THEN 'district_32' ELSE 'district' END
      )) AS total_points,
      CAST(REGEXP_REPLACE(t.name, '.*District ', '') AS int) AS district
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
    WHERE t.season_id = p_season
      AND t.tournament_type = 'districts'
      AND t.name LIKE (CASE WHEN p_gender = 'M' THEN 'Boy_s%' ELSE 'Girl_s%' END)
      AND te.school_context_raw IS NOT NULL
    GROUP BY te.school_context_raw, sn.school_name, t.name
    HAVING SUM(tw_wrestler_points(te.id, t.id,
      CASE WHEN p_gender = 'F' THEN 'district_32' ELSE 'district' END
    )) > 0
  )
  SELECT school, school_name, ROUND(total_points, 1) AS total_points, district
  FROM district_teams
  ORDER BY total_points DESC
  LIMIT p_limit;
$function$;
*/

DROP FUNCTION IF EXISTS public.top_district_team_scores(character, smallint, integer);
CREATE OR REPLACE FUNCTION public.top_district_team_scores(
  p_gender character DEFAULT 'M'::bpchar,
  p_season smallint  DEFAULT 1,
  p_limit  integer   DEFAULT 24
)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, district integer)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH district_teams AS (
    SELECT s.display_name                          AS school_name,
           s.id                                    AS school_id,
           SUM(tw_wrestler_points(te.id, t.id,
             CASE WHEN p_gender = 'F' THEN 'district_32' ELSE 'district' END
           ))                                      AS total_points,
           CAST(REGEXP_REPLACE(t.name, '.*District ', '') AS int) AS district
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN schools s ON s.id = te.school_id
    WHERE t.season_id = p_season
      AND t.tournament_type = 'districts'
      AND t.name LIKE (CASE WHEN p_gender = 'M' THEN 'Boy_s%' ELSE 'Girl_s%' END)
      AND te.school_id IS NOT NULL
    GROUP BY s.id, s.display_name, t.name
    HAVING SUM(tw_wrestler_points(te.id, t.id,
      CASE WHEN p_gender = 'F' THEN 'district_32' ELSE 'district' END
    )) > 0
  )
  SELECT school_name AS school,
         school_name,
         school_id,
         ROUND(total_points, 1) AS total_points,
         district
  FROM district_teams
  ORDER BY total_points DESC
  LIMIT p_limit;
$function$;
