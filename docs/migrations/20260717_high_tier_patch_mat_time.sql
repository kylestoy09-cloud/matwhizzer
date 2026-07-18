-- =============================================================================
-- PATCH: Fix 42702 ambiguous column "school_id" in 3 plpgsql mat_time functions
-- Root cause: RETURNS TABLE(... school_id integer ...) makes the output parameter
-- visible as a bare name inside the function body; unqualified "school_id" in the
-- agg CTE's SELECT and GROUP BY was ambiguous with wins.school_id.
-- Fix: qualify with wins.wid / wins.school_id throughout the agg CTE.
-- Apply these 3 functions only — the other 48 already applied successfully.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. district_mat_time
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.district_mat_time(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_mat_time(
  p_district integer,
  p_gender   gender_type,
  p_season   smallint
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  total_seconds integer,
  match_count   integer
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
                 || ' Districts District ' || p_district
      AND season_id = p_season
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      te.school_id,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
      AND te.school_id IS NOT NULL
  ),
  agg AS (
    SELECT wins.wid, wins.school_id,
      SUM(secs)::integer AS total_seconds,
      COUNT(*)::integer  AS match_count
    FROM wins GROUP BY wins.wid, wins.school_id HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  JOIN schools   s  ON s.id  = agg.school_id
  ORDER BY total_seconds ASC LIMIT 8;
END;
$function$;


-- ---------------------------------------------------------------------------
-- 2. lb_gp_mat_time
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.lb_gp_mat_time(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_mat_time(
  p_pool   text,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  total_seconds integer,
  match_count   integer
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F' AND season_id = p_season AND (
      (p_pool = 'region'    AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
      (p_pool = 'state'     AND name LIKE 'Girl_s%') OR
      (p_pool = 'districts' AND tournament_type = 'districts'::tournament_type)
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
  ),
  agg AS (
    SELECT wins.wid, wins.school_id, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM wins GROUP BY wins.wid, wins.school_id HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY total_seconds ASC LIMIT 25;
END;
$function$;


-- ---------------------------------------------------------------------------
-- 3. lb_p_mat_time
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.lb_p_mat_time(gender_type, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_mat_time(
  p_gender gender_type,
  p_pool   text,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  total_seconds integer,
  match_count   integer
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = p_gender AND season_id = p_season AND (
      (p_pool = 'district' AND name LIKE 'Boy_s Districts%') OR
      (p_pool = 'region'   AND (name LIKE 'Boy_s Districts%' OR name LIKE 'Boy_s Regions%')) OR
      (p_pool = 'state'    AND name LIKE 'Boy_s%')
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
  ),
  agg AS (
    SELECT wins.wid, wins.school_id, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM wins GROUP BY wins.wid, wins.school_id HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY total_seconds ASC LIMIT 25;
END;
$function$;
