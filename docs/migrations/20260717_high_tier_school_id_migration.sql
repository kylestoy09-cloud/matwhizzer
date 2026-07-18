-- =============================================================================
-- HIGH TIER MIGRATION: 20260717_high_tier_school_id_migration.sql
-- =============================================================================
-- Rewrites all HIGH-severity functions to use tournament_entries.school_id
-- instead of school_context_raw / school_names.abbreviation.
-- Pattern: school text → schools.display_name; school_name → schools.display_name;
--          school_id integer added to all return types.
-- Do NOT apply this file — Paul applies manually via Supabase SQL editor.
-- Run 20260717_high_tier_verification.sql after applying to verify.
--
-- 4 old p_school text overloads are DROPPED (superseded by p_school_id versions
-- already live and already used by the frontend — confirmed in grep).
-- =============================================================================


-- =============================================================================
-- SECTION 0: DROP obsolete p_school text overloads
-- These are replaced by the already-live p_school_id integer overloads.
-- Frontend already passes p_school_id; the text overloads are unreachable.
-- =============================================================================

-- Rollback for section 0: recreate them from scratch — not worth it.
-- If rollback is needed, redeploy the original p_school text functions.

DROP FUNCTION IF EXISTS public.school_leaderboard(text, gender_type, smallint);
DROP FUNCTION IF EXISTS public.school_wrestlers(text, gender_type, smallint);
DROP FUNCTION IF EXISTS public.school_points_breakdown(text, gender_type, smallint);
DROP FUNCTION IF EXISTS public.girls_school_wrestlers(text, smallint);


-- =============================================================================
-- SECTION 1: district_bonus_pct
-- Pattern: GROUP BY te.school_context_raw in wins CTE → school_id
-- =============================================================================

/*
ROLLBACK district_bonus_pct:
DROP FUNCTION IF EXISTS public.district_bonus_pct(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_bonus_pct(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, bonus_wins integer, total_wins integer, bonus_pct numeric)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
                 || ' Districts District ' || p_district
    AND season_id = p_season
  ),
  wins AS (
    SELECT te.wrestler_id, te.school_context_raw,
      COUNT(*)::integer AS total_wins,
      COUNT(*) FILTER (
        WHERE m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           OR m.win_type = 'MD'::win_type OR m.win_type = 'INJ'::win_type
           OR m.win_type = 'DQ'::win_type
      )::integer AS bonus_wins
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type NOT IN ('FORF'::win_type, 'BYE'::win_type)
    GROUP BY te.wrestler_id, te.school_context_raw
    HAVING COUNT(*) >= 2
  )
  SELECT wr.id, TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    wins.school_context_raw AS school, sn.school_name,
    wins.bonus_wins, wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN school_names sn ON sn.abbreviation = wins.school_context_raw
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 8
$function$;
*/

DROP FUNCTION IF EXISTS public.district_bonus_pct(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_bonus_pct(
  p_district integer,
  p_gender   gender_type DEFAULT 'M'::gender_type,
  p_season   smallint    DEFAULT 1
)
RETURNS TABLE(
  wrestler_id  uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_wins    integer,
  bonus_pct     numeric
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
                 || ' Districts District ' || p_district
      AND season_id = p_season
  ),
  wins AS (
    SELECT
      te.wrestler_id,
      te.school_id,
      COUNT(*)::integer AS total_wins,
      COUNT(*) FILTER (
        WHERE m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           OR m.win_type = 'MD'::win_type   OR m.win_type = 'INJ'::win_type
           OR m.win_type = 'DQ'::win_type
      )::integer AS bonus_wins
    FROM matches m
    JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true
      AND m.win_type IS NOT NULL
      AND m.win_type NOT IN ('FORF'::win_type, 'BYE'::win_type)
      AND te.school_id IS NOT NULL
    GROUP BY te.wrestler_id, te.school_id
    HAVING COUNT(*) >= 2
  )
  SELECT
    wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.bonus_wins,
    wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  JOIN schools   s  ON s.id  = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC
  LIMIT 8
$function$;


-- =============================================================================
-- SECTION 2: district_dominance
-- Pattern: LATERAL subquery for school per wrestler → school_id
-- =============================================================================

/*
ROLLBACK district_dominance:
DROP FUNCTION IF EXISTS public.district_dominance(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_dominance(p_district integer, p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, dominance_score numeric, win_count bigint)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district
    AND season_id = p_season;
  IF v_tid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH match_scores AS (
    SELECT te.wrestler_id AS wid,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, true AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.win_type IS NOT NULL
    UNION ALL
    SELECT te.wrestler_id AS wid,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, false AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.win_type IS NOT NULL AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wid, ROUND(AVG(score), 2) AS dscore, COUNT(*) FILTER (WHERE won)::bigint AS wcnt
    FROM match_scores GROUP BY wid HAVING COUNT(*) FILTER (WHERE won) >= 1
  )
  SELECT wr.id, TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    te2.school_context_raw, sn.school_name, agg.dscore, agg.wcnt
  FROM agg JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN LATERAL (
    SELECT te.school_context_raw FROM tournament_entries te
    WHERE te.wrestler_id = agg.wid AND te.school_context_raw IS NOT NULL AND te.school_context_raw != '' LIMIT 1
  ) te2 ON true
  LEFT JOIN school_names sn ON sn.abbreviation = te2.school_context_raw
  ORDER BY agg.dscore DESC LIMIT 8;
END; $function$;
*/

DROP FUNCTION IF EXISTS public.district_dominance(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_dominance(
  p_district integer,
  p_gender   gender_type,
  p_season   smallint
)
RETURNS TABLE(
  wrestler_id     uuid,
  wrestler_name   text,
  school          text,
  school_name     text,
  school_id       integer,
  dominance_score numeric,
  win_count       bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
               || ' Districts District ' || p_district
    AND season_id = p_season;
  IF v_tid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH match_scores AS (
    SELECT te.wrestler_id AS wid,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, true AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.win_type IS NOT NULL
    UNION ALL
    SELECT te.wrestler_id AS wid,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, false AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true
      AND m.win_type IS NOT NULL AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wid, ROUND(AVG(score), 2) AS dscore, COUNT(*) FILTER (WHERE won)::bigint AS wcnt
    FROM match_scores GROUP BY wid HAVING COUNT(*) FILTER (WHERE won) >= 1
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.dscore, agg.wcnt
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN LATERAL (
    SELECT te.school_id FROM tournament_entries te
    WHERE te.wrestler_id = agg.wid AND te.school_id IS NOT NULL
    LIMIT 1
  ) te2 ON true
  LEFT JOIN schools s ON s.id = te2.school_id
  ORDER BY agg.dscore DESC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 3: district_mat_time
-- Pattern: GROUP BY wid, school_context_raw in wins CTE → school_id
-- =============================================================================

/*
ROLLBACK district_mat_time:
DROP FUNCTION IF EXISTS public.district_mat_time(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_mat_time(p_district integer, p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, total_seconds integer, match_count integer)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district
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
    SELECT te.wrestler_id AS wid, te.school_context_raw,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
  ),
  agg AS (
    SELECT wid, school_context_raw, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM wins GROUP BY wid, school_context_raw HAVING COUNT(*) >= 3
  )
  SELECT wr.id, TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    agg.school_context_raw, sn.school_name, agg.total_seconds, agg.match_count
  FROM agg JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN school_names sn ON sn.abbreviation = agg.school_context_raw
  ORDER BY total_seconds ASC LIMIT 8;
END; $function$;
*/

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


-- =============================================================================
-- SECTION 4: district_wrestler_points
-- Pattern: school_lookup CTE (tournament-scoped) → school_id
-- =============================================================================

/*
ROLLBACK district_wrestler_points:
DROP FUNCTION IF EXISTS public.district_wrestler_points(integer, gender_type, smallint);
[original body elided for brevity — restore from pg_get_functiondef if needed]
*/

DROP FUNCTION IF EXISTS public.district_wrestler_points(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.district_wrestler_points(
  p_district integer,
  p_gender   gender_type DEFAULT 'M'::gender_type,
  p_season   smallint    DEFAULT 1
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  total_points  numeric,
  win_count     integer
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = (CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END)
                 || ' Districts District ' || p_district
      AND season_id = p_season
  ),
  r1_winners AS (
    SELECT m.weight_class_id, m.winner_entry_id
    FROM matches m JOIN t ON m.tournament_id = t.id
    WHERE m.round::text = 'R1' AND m.validated = true AND m.winner_entry_id IS NOT NULL
  ),
  placements AS (
    SELECT m.winner_entry_id AS entry_id, 1 AS place
    FROM matches m JOIN t ON m.tournament_id = t.id
    WHERE m.round::text = 'F' AND m.bracket_side = 'championship'
      AND m.validated = true AND m.winner_entry_id IS NOT NULL
    UNION ALL
    SELECT m.loser_entry_id, 2
    FROM matches m JOIN t ON m.tournament_id = t.id
    WHERE m.round::text = 'F' AND m.bracket_side = 'championship'
      AND m.validated = true AND m.loser_entry_id IS NOT NULL
    UNION ALL
    SELECT m.winner_entry_id, 3
    FROM matches m JOIN t ON m.tournament_id = t.id
    WHERE m.round::text = '3rd_Place' AND m.validated = true AND m.winner_entry_id IS NOT NULL
    UNION ALL
    SELECT m.loser_entry_id, 4
    FROM matches m JOIN t ON m.tournament_id = t.id
    WHERE m.round::text = '3rd_Place' AND m.validated = true AND m.loser_entry_id IS NOT NULL
  ),
  win_pts AS (
    SELECT te.wrestler_id,
      CASE m.round::text
        WHEN 'R1' THEN 2.0
        WHEN 'QF' THEN CASE WHEN rw.winner_entry_id IS NOT NULL THEN 0.0 ELSE 2.0 END
        WHEN 'SF'        THEN 2.0
        WHEN 'F'         THEN 2.0
        WHEN '3rd_Place' THEN 2.0
        ELSE 0.0
      END +
      CASE m.win_type::text
        WHEN 'FALL' THEN 2.0 WHEN 'INJ'  THEN 2.0
        WHEN 'TF'   THEN 1.5 WHEN 'TF-1.5' THEN 1.5
        WHEN 'MD'   THEN 1.0 ELSE 0.0
      END AS pts,
      1 AS is_win
    FROM matches m
    JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN r1_winners rw ON rw.weight_class_id = m.weight_class_id
      AND rw.winner_entry_id = m.winner_entry_id
    WHERE m.validated = true AND m.winner_entry_id IS NOT NULL
      AND m.round::text IN ('R1','QF','SF','F','3rd_Place')
  ),
  loss_pts AS (
    SELECT te.wrestler_id, 2.0 AS pts, 0 AS is_win
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.loser_entry_id IS NOT NULL
      AND m.round::text = 'F' AND m.bracket_side = 'championship'
  ),
  place_pts AS (
    SELECT te.wrestler_id,
      CASE p.place WHEN 1 THEN 14.0 WHEN 2 THEN 10.0 WHEN 3 THEN 7.0 WHEN 4 THEN 6.0 ELSE 0.0 END AS pts,
      0 AS is_win
    FROM placements p
    JOIN tournament_entries te ON te.id = p.entry_id
    WHERE p.place IN (1,2,3,4)
  ),
  all_pts AS (
    SELECT wrestler_id, pts, is_win FROM win_pts
    UNION ALL SELECT wrestler_id, pts, is_win FROM loss_pts
    UNION ALL SELECT wrestler_id, pts, is_win FROM place_pts
  ),
  totals AS (
    SELECT wrestler_id,
      ROUND(SUM(pts), 1) AS total_points,
      SUM(is_win)::integer AS win_count
    FROM all_pts GROUP BY wrestler_id HAVING SUM(is_win) >= 1
  ),
  school_lookup AS (
    SELECT te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN t ON te2.tournament_id = t.id
    WHERE te2.school_id IS NOT NULL
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    tot.total_points, tot.win_count
  FROM totals tot
  JOIN wrestlers wr   ON wr.id = tot.wrestler_id
  JOIN school_lookup sl ON sl.wrestler_id = tot.wrestler_id
  JOIN schools s      ON s.id  = sl.school_id
  ORDER BY tot.total_points DESC LIMIT 8
$function$;


-- =============================================================================
-- SECTION 5: region_bonus_pct
-- Pattern: GROUP BY te.school_context_raw in wins CTE → school_id
-- =============================================================================

/*
ROLLBACK region_bonus_pct:
DROP FUNCTION IF EXISTS public.region_bonus_pct(integer, gender_type, smallint);
[original body — restore from pg_get_functiondef if needed]
*/

DROP FUNCTION IF EXISTS public.region_bonus_pct(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.region_bonus_pct(
  p_region integer,
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 1
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_wins    integer,
  bonus_pct     numeric
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Boy_s Regions r' || p_region
      AND gender = p_gender AND season_id = p_season
  ),
  wins AS (
    SELECT te.wrestler_id, te.school_id,
      COUNT(*)::integer AS total_wins,
      COUNT(*) FILTER (
        WHERE m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           OR m.win_type = 'MD'::win_type   OR m.win_type = 'INJ'::win_type
           OR m.win_type = 'DQ'::win_type
      )::integer AS bonus_wins
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type NOT IN ('FORF'::win_type, 'BYE'::win_type)
      AND te.school_id IS NOT NULL
    GROUP BY te.wrestler_id, te.school_id
    HAVING COUNT(*) >= 2
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  JOIN schools   s  ON s.id  = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 8
$function$;


-- =============================================================================
-- SECTION 6: region_dominance
-- Pattern: school_lookup CTE (DISTINCT ON wrestler_id) → school_id
-- =============================================================================

/*
ROLLBACK region_dominance:
DROP FUNCTION IF EXISTS public.region_dominance(integer, gender_type, smallint);
[original body — restore from pg_get_functiondef if needed]
*/

DROP FUNCTION IF EXISTS public.region_dominance(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.region_dominance(
  p_region integer,
  p_gender gender_type,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id     uuid,
  wrestler_name   text,
  school          text,
  school_name     text,
  school_id       integer,
  dominance_score numeric,
  win_count       bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = 'Boy_s Regions r' || p_region AND season_id = p_season;
  IF v_tid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2 JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0 ELSE 1 END
  ),
  match_scores AS (
    SELECT te.wrestler_id AS wid,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, true AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.win_type IS NOT NULL
    UNION ALL
    SELECT te.wrestler_id AS wid,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, false AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true
      AND m.win_type IS NOT NULL AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wid, ROUND(AVG(score), 2) AS dscore, COUNT(*) FILTER (WHERE won)::bigint AS wcnt
    FROM match_scores GROUP BY wid HAVING COUNT(*) FILTER (WHERE won) >= 1
  )
  SELECT agg.wid,
    TRIM(COALESCE(w.first_name,'') || ' ' || COALESCE(w.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.dscore, agg.wcnt
  FROM agg
  JOIN wrestlers w    ON w.id   = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.dscore DESC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 7: region_mat_time
-- Pattern: school_lookup CTE (DISTINCT ON wrestler_id) → school_id
-- =============================================================================

/*
ROLLBACK region_mat_time:
DROP FUNCTION IF EXISTS public.region_mat_time(integer, gender_type, smallint);
[original body — restore from pg_get_functiondef if needed]
*/

DROP FUNCTION IF EXISTS public.region_mat_time(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.region_mat_time(
  p_region integer,
  p_gender gender_type,
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
  WITH region_tournament AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
                 || ' Regions r' || p_region
      AND season_id = p_season
  ),
  region_wrestlers AS (
    SELECT DISTINCT te.wrestler_id AS wid
    FROM tournament_entries te JOIN region_tournament rt ON te.tournament_id = rt.id
  ),
  scope_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = p_gender AND season_id = p_season
      AND (tournament_type = 'districts' OR tournament_type = 'regions'
           OR tournament_type = 'girls_regions')
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2 JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0 ELSE 1 END
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
      AND te.wrestler_id IN (SELECT wid FROM region_wrestlers)
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN region_wrestlers rw ON rw.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
  ),
  agg AS (
    SELECT wid, SUM(secs)::integer AS total_secs, COUNT(*)::integer AS mcnt
    FROM wins GROUP BY wid HAVING COUNT(*) >= 3
  )
  SELECT agg.wid,
    TRIM(COALESCE(w.first_name,'') || ' ' || COALESCE(w.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.total_secs, agg.mcnt
  FROM agg
  JOIN wrestlers w    ON w.id   = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.total_secs ASC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 8: region_postseason_pts
-- Pattern: school_lookup CTE (DISTINCT ON wrestler_id) → school_id
-- =============================================================================

/*
ROLLBACK region_postseason_pts:
DROP FUNCTION IF EXISTS public.region_postseason_pts(integer, gender_type, smallint);
[original body — restore from pg_get_functiondef if needed]
*/

DROP FUNCTION IF EXISTS public.region_postseason_pts(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.region_postseason_pts(
  p_region integer,
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  weight        integer,
  district_pts  numeric,
  region_pts    numeric,
  team_points   numeric
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_region_tid    integer;
  v_region_level  text;
  v_district_level text;
BEGIN
  IF p_gender = 'M' THEN
    SELECT id INTO v_region_tid FROM tournaments
    WHERE name = 'Boy_s Regions r' || p_region AND season_id = p_season;
    v_region_level   := 'region_16';
    v_district_level := 'district';
  ELSE
    SELECT id INTO v_region_tid FROM tournaments
    WHERE name = 'Girl_s Regions r' || p_region AND season_id = p_season;
    v_region_level   := 'region_32';
    v_district_level := 'district_32';
  END IF;

  IF v_region_tid IS NULL THEN RETURN; END IF;

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
  region_entries AS (
    SELECT te.id AS region_entry_id, te.wrestler_id, wc.weight::integer AS wt,
      ROUND(tw_wrestler_points(te.id, v_region_tid, v_region_level), 1) AS r_pts
    FROM tournament_entries te
    JOIN weight_classes wc ON wc.id = te.weight_class_id
    WHERE te.tournament_id = v_region_tid
  ),
  district_pts AS (
    SELECT re.wrestler_id,
      COALESCE(ROUND(tw_wrestler_points(te_d.id, te_d.tournament_id, v_district_level), 1), 0) AS d_pts
    FROM region_entries re
    LEFT JOIN tournament_entries te_d ON te_d.wrestler_id = re.wrestler_id
      AND te_d.tournament_id IN (
        SELECT id FROM tournaments
        WHERE tournament_type = 'districts' AND gender = p_gender AND season_id = p_season
      )
  )
  SELECT re.wrestler_id,
    w.first_name || ' ' || w.last_name,
    s.display_name, s.display_name, s.id,
    re.wt, dp.d_pts, re.r_pts,
    ROUND(dp.d_pts + re.r_pts, 1)
  FROM region_entries re
  JOIN wrestlers w       ON w.id   = re.wrestler_id
  JOIN school_lookup sl  ON sl.wrestler_id = re.wrestler_id
  JOIN schools s         ON s.id   = sl.school_id
  JOIN district_pts dp   ON dp.wrestler_id = re.wrestler_id
  WHERE (dp.d_pts + re.r_pts) > 0
  ORDER BY (dp.d_pts + re.r_pts) DESC;
END;
$function$;


-- =============================================================================
-- SECTION 9: region_team_pts
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

/*
ROLLBACK region_team_pts:
DROP FUNCTION IF EXISTS public.region_team_pts(integer, gender_type, smallint);
[original body — restore from pg_get_functiondef if needed]
*/

DROP FUNCTION IF EXISTS public.region_team_pts(integer, gender_type, smallint);
CREATE OR REPLACE FUNCTION public.region_team_pts(
  p_region integer,
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  weight        integer,
  team_points   numeric
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid   integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
               || ' Regions r' || p_region
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
  SELECT te.wrestler_id,
    w.first_name || ' ' || w.last_name AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wc.weight::integer,
    ROUND(tw_wrestler_points(te.id, v_tid, v_level), 1) AS team_points
  FROM tournament_entries te
  JOIN wrestlers w      ON w.id  = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  JOIN school_lookup sl  ON sl.wrestler_id = te.wrestler_id
  JOIN schools s         ON s.id  = sl.school_id
  WHERE te.tournament_id = v_tid
    AND tw_wrestler_points(te.id, v_tid, v_level) > 0
  ORDER BY team_points DESC;
END;
$function$;


-- =============================================================================
-- SECTION 10: state_bonus_pct (season-aware overload)
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

/*
ROLLBACK state_bonus_pct(gender_type, smallint):
DROP FUNCTION IF EXISTS public.state_bonus_pct(gender_type, smallint);
[original body — restore from pg_get_functiondef if needed]
*/

DROP FUNCTION IF EXISTS public.state_bonus_pct(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.state_bonus_pct(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_wins    integer,
  bonus_pct     numeric
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
      AND gender = p_gender AND season_id = p_season
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season
    WHERE te2.school_id IS NOT NULL AND t2.name NOT LIKE '%%States%%'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.name LIKE '%%Regions%%' THEN 0 ELSE 1 END
  ),
  wins AS (
    SELECT te.wrestler_id,
      COUNT(*)::integer AS total_wins,
      COUNT(*) FILTER (
        WHERE m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           OR m.win_type = 'MD'::win_type   OR m.win_type = 'INJ'::win_type
           OR m.win_type = 'DQ'::win_type
      )::integer AS bonus_wins
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type NOT IN ('FORF'::win_type, 'BYE'::win_type)
    GROUP BY te.wrestler_id HAVING COUNT(*) >= 2
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr   ON wr.id = wins.wrestler_id
  JOIN school_lookup sl ON sl.wrestler_id = wins.wrestler_id
  JOIN schools s       ON s.id = sl.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 8
$function$;


-- =============================================================================
-- SECTION 11: state_bonus_pct (legacy overload — no season param)
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

/*
ROLLBACK state_bonus_pct(gender_type):
DROP FUNCTION IF EXISTS public.state_bonus_pct(gender_type);
[original body — restore from pg_get_functiondef if needed]
*/

DROP FUNCTION IF EXISTS public.state_bonus_pct(gender_type);
CREATE OR REPLACE FUNCTION public.state_bonus_pct(
  p_gender gender_type DEFAULT 'M'::gender_type
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_wins    integer,
  bonus_pct     numeric
)
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
    WHERE te2.school_id IS NOT NULL AND t2.name NOT LIKE '%%States%%'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.name LIKE '%%Regions%%' THEN 0 ELSE 1 END
  ),
  wins AS (
    SELECT te.wrestler_id,
      COUNT(*)::integer AS total_wins,
      COUNT(*) FILTER (
        WHERE m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           OR m.win_type = 'MD'::win_type   OR m.win_type = 'INJ'::win_type
           OR m.win_type = 'DQ'::win_type
      )::integer AS bonus_wins
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL AND m.win_type != 'FORF'::win_type
    GROUP BY te.wrestler_id HAVING COUNT(*) >= 2
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr   ON wr.id = wins.wrestler_id
  JOIN school_lookup sl ON sl.wrestler_id = wins.wrestler_id
  JOIN schools s       ON s.id = sl.school_id
  ORDER BY bonus_pct DESC, wins.total_wins DESC LIMIT 8
$function$;


-- =============================================================================
-- SECTION 12: state_dominance
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.state_dominance(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.state_dominance(
  p_gender gender_type,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id     uuid,
  wrestler_name   text,
  school          text,
  school_name     text,
  school_id       integer,
  dominance_score numeric,
  win_count       bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH season_tournaments AS (
    SELECT id FROM tournaments WHERE season_id = p_season AND gender = p_gender
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2 JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0 ELSE 1 END
  ),
  match_scores AS (
    SELECT te.wrestler_id AS wid,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, true AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.tournament_id IN (SELECT id FROM season_tournaments)
      AND m.validated = true AND m.win_type IS NOT NULL
    UNION ALL
    SELECT te.wrestler_id AS wid,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, false AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.tournament_id IN (SELECT id FROM season_tournaments)
      AND m.validated = true AND m.win_type IS NOT NULL AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wid, ROUND(AVG(score), 2) AS dscore, COUNT(*) FILTER (WHERE won)::bigint AS wcnt
    FROM match_scores GROUP BY wid HAVING COUNT(*) >= 5
  )
  SELECT agg.wid, wrestler_name_with_grade(w.first_name, w.last_name, w.id),
    s.display_name, s.display_name, s.id,
    agg.dscore, agg.wcnt
  FROM agg
  JOIN wrestlers w    ON w.id   = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.dscore DESC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 13: state_mat_time (season-aware overload)
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.state_mat_time(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.state_mat_time(
  p_gender gender_type,
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
  WITH state_tournament AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
      AND gender = p_gender AND season_id = p_season
  ),
  state_wrestlers AS (
    SELECT DISTINCT te.wrestler_id AS wid
    FROM tournament_entries te JOIN state_tournament st ON te.tournament_id = st.id
  ),
  scope_tournaments AS (
    SELECT id FROM tournaments WHERE gender = p_gender AND season_id = p_season
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2 JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season
    WHERE te2.school_id IS NOT NULL AND t2.name NOT LIKE '%%States%%'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.name LIKE '%%Regions%%' THEN 0 ELSE 1 END
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
      AND te.wrestler_id IN (SELECT wid FROM state_wrestlers)
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN state_wrestlers sw ON sw.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
  ),
  agg AS (
    SELECT wid, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM wins GROUP BY wid HAVING COUNT(*) >= 3
  )
  SELECT wr.id, wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.total_seconds ASC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 14: state_mat_time (legacy overload — no season param)
-- =============================================================================

DROP FUNCTION IF EXISTS public.state_mat_time(gender_type);
CREATE OR REPLACE FUNCTION public.state_mat_time(
  p_gender gender_type
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
  WITH state_tournament AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
      AND gender = p_gender
  ),
  state_wrestlers AS (
    SELECT DISTINCT te.wrestler_id AS wid
    FROM tournament_entries te JOIN state_tournament st ON te.tournament_id = st.id
  ),
  scope_tournaments AS (
    SELECT id FROM tournaments WHERE gender = p_gender
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2 JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL AND t2.name NOT LIKE '%%States%%'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.name LIKE '%%Regions%%' THEN 0 ELSE 1 END
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
      AND te.wrestler_id IN (SELECT wid FROM state_wrestlers)
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(m.fall_time_seconds, 360) ELSE 360 END AS secs
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN state_wrestlers sw ON sw.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
  ),
  agg AS (
    SELECT wid, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM wins GROUP BY wid
    HAVING COUNT(*) >= CASE WHEN p_gender = 'M' THEN 3 ELSE 2 END
  )
  SELECT wr.id, wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.total_seconds ASC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 15: state_team_pts
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.state_team_pts(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.state_team_pts(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  weight        integer,
  team_points   numeric
)
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
  SELECT te.wrestler_id,
    w.first_name || ' ' || w.last_name AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wc.weight::integer,
    ROUND(tw_wrestler_points(te.id, v_tid, v_level), 1) AS team_points
  FROM tournament_entries te
  JOIN wrestlers w      ON w.id  = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  JOIN school_lookup sl  ON sl.wrestler_id = te.wrestler_id
  JOIN schools s         ON s.id  = sl.school_id
  WHERE te.tournament_id = v_tid
    AND tw_wrestler_points(te.id, v_tid, v_level) > 0
  ORDER BY team_points DESC;
END;
$function$;


-- =============================================================================
-- SECTION 16: girls_region_bonus_pct
-- Pattern: GROUP BY te.school_context_raw in wins CTE → school_id
-- (note: original used 'Girl_s Regions r' || p_region which only matches integer-style regions)
-- =============================================================================

DROP FUNCTION IF EXISTS public.girls_region_bonus_pct(text, smallint);
CREATE OR REPLACE FUNCTION public.girls_region_bonus_pct(
  p_region text,
  p_season smallint DEFAULT 1
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_wins    integer,
  bonus_pct     numeric
)
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tname text := 'Girl_s Regions r' || p_region;
BEGIN
  RETURN QUERY
  WITH t AS (
    SELECT id FROM tournaments WHERE name = v_tname AND gender = 'F' AND season_id = p_season
  ),
  wins AS (
    SELECT te.wrestler_id, te.school_id,
      COUNT(*)::integer AS total_wins,
      COUNT(*) FILTER (
        WHERE m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           OR m.win_type = 'MD'::win_type   OR m.win_type = 'INJ'::win_type
           OR m.win_type = 'DQ'::win_type
      )::integer AS bonus_wins
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type NOT IN ('FORF'::win_type, 'BYE'::win_type)
      AND te.school_id IS NOT NULL
    GROUP BY te.wrestler_id, te.school_id
    HAVING COUNT(*) >= 2
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(100.0 * wins.bonus_wins / wins.total_wins, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  JOIN schools   s  ON s.id  = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 17: girls_region_dominance (text overload)
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.girls_region_dominance(text, smallint);
CREATE OR REPLACE FUNCTION public.girls_region_dominance(
  p_region text,
  p_season smallint DEFAULT 1
)
RETURNS TABLE(
  wrestler_id     uuid,
  wrestler_name   text,
  school          text,
  school_name     text,
  school_id       integer,
  dominance_score numeric,
  win_count       bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid     integer;
  v_display text;
BEGIN
  v_display := CASE p_region
    WHEN 'central' THEN 'Central'
    WHEN 'north-1' THEN 'North 1'
    WHEN 'north-2' THEN 'North 2'
    WHEN 'south'   THEN 'South'
  END;

  SELECT id INTO v_tid FROM tournaments
  WHERE name = 'Girl_s Regions ' || v_display AND season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = 'F'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0 ELSE 1 END
  ),
  match_scores AS (
    SELECT te.wrestler_id,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, true AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.win_type IS NOT NULL
    UNION ALL
    SELECT te.wrestler_id,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, false AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true
      AND m.win_type IS NOT NULL AND m.loser_entry_id IS NOT NULL
  )
  SELECT ms.wrestler_id,
    TRIM(COALESCE(w.first_name,'') || ' ' || COALESCE(w.last_name,'')),
    s.display_name, s.display_name, s.id,
    ROUND(AVG(ms.score), 2),
    COUNT(*) FILTER (WHERE ms.won)::bigint
  FROM match_scores ms
  JOIN wrestlers w    ON w.id   = ms.wrestler_id
  JOIN school_lookup sl ON sl.wrestler_id = ms.wrestler_id
  JOIN schools s      ON s.id   = sl.school_id
  GROUP BY ms.wrestler_id, w.first_name, w.last_name, s.display_name, s.id
  HAVING COUNT(*) FILTER (WHERE ms.won) >= 1
  ORDER BY dominance_score DESC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 18: girls_region_dominance (integer overload)
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.girls_region_dominance(integer, smallint);
CREATE OR REPLACE FUNCTION public.girls_region_dominance(
  p_region integer,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id     uuid,
  wrestler_name   text,
  school          text,
  school_name     text,
  school_id       integer,
  dominance_score numeric,
  win_count       bigint
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = 'Girl_s Regions r' || p_region AND season_id = p_season;
  IF v_tid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2 JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = 'F'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0 ELSE 1 END
  ),
  match_scores AS (
    SELECT te.wrestler_id AS wid,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, true AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.win_type IS NOT NULL
    UNION ALL
    SELECT te.wrestler_id AS wid,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS score, false AS won
    FROM matches m JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.tournament_id = v_tid AND m.validated = true
      AND m.win_type IS NOT NULL AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wid, ROUND(AVG(score), 2) AS dscore, COUNT(*) FILTER (WHERE won)::bigint AS wcnt
    FROM match_scores GROUP BY wid HAVING COUNT(*) FILTER (WHERE won) >= 1
  )
  SELECT agg.wid,
    TRIM(COALESCE(w.first_name,'') || ' ' || COALESCE(w.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.dscore, agg.wcnt
  FROM agg
  JOIN wrestlers w    ON w.id   = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.dscore DESC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 19: girls_region_mat_time (text overload)
-- Pattern: uses array_agg(school_context_raw)[1] → switch to LATERAL school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.girls_region_mat_time(text, smallint);
CREATE OR REPLACE FUNCTION public.girls_region_mat_time(
  p_region text,
  p_season smallint DEFAULT 2
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
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH region_tournament AS (
    SELECT id FROM tournaments
    WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season
  ),
  region_wrestlers AS (
    SELECT DISTINCT te.wrestler_id
    FROM tournament_entries te
    JOIN region_tournament rt ON te.tournament_id = rt.id
  ),
  postseason_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F' AND season_id = p_season
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN postseason_tournaments pt ON te2.tournament_id = pt.id
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id, te2.school_id
  ),
  champ_all AS (
    SELECT te.wrestler_id AS wid,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m
    JOIN postseason_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN region_wrestlers rw ON rw.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
    UNION ALL
    SELECT te.wrestler_id AS wid, 360::integer AS secs
    FROM matches m
    JOIN postseason_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    JOIN region_wrestlers rw ON rw.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wid, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM champ_all GROUP BY wid HAVING COUNT(*) >= 5
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wrestler_id = agg.wid
  JOIN schools s      ON s.id  = sl.school_id
  ORDER BY total_seconds ASC LIMIT 8
$function$;


-- =============================================================================
-- SECTION 20: girls_region_mat_time (integer overload)
-- Pattern: school_lookup CTE → school_id (wins CTE only grabs wrestlers without losses)
-- =============================================================================

DROP FUNCTION IF EXISTS public.girls_region_mat_time(integer, smallint);
CREATE OR REPLACE FUNCTION public.girls_region_mat_time(
  p_region integer,
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
  WITH region_tournament AS (
    SELECT id FROM tournaments
    WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season
  ),
  region_wrestlers AS (
    SELECT DISTINCT te.wrestler_id AS wid
    FROM tournament_entries te JOIN region_tournament rt ON te.tournament_id = rt.id
  ),
  scope_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F' AND season_id = p_season
      AND (tournament_type = 'districts' OR tournament_type = 'regions'
           OR tournament_type = 'girls_regions')
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2 JOIN scope_tournaments st ON te2.tournament_id = st.id
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id, te2.school_id
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
      AND te.wrestler_id IN (SELECT wid FROM region_wrestlers)
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN region_wrestlers rw ON rw.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
  ),
  agg AS (
    SELECT wid, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM wins GROUP BY wid HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY total_seconds ASC LIMIT 8;
END;
$function$;


-- =============================================================================
-- SECTION 21: girls_region_team_pts
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.girls_region_team_pts(text, smallint);
CREATE OR REPLACE FUNCTION public.girls_region_team_pts(
  p_region text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  weight        integer,
  team_points   numeric
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid integer;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = 'Girl_s Regions r' || p_region AND season_id = p_season;

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
  SELECT te.wrestler_id,
    w.first_name || ' ' || w.last_name AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wc.weight::integer,
    ROUND(tw_wrestler_points(te.id, v_tid, 'region_32'), 1) AS team_points
  FROM tournament_entries te
  JOIN wrestlers w      ON w.id  = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  JOIN school_lookup sl  ON sl.wrestler_id = te.wrestler_id
  JOIN schools s         ON s.id  = sl.school_id
  WHERE te.tournament_id = v_tid
    AND tw_wrestler_points(te.id, v_tid, 'region_32') > 0
  ORDER BY team_points DESC;
END;
$function$;


-- =============================================================================
-- SECTION 22: lb_bonus_wins
-- Pattern: inline SCR subquery → LATERAL school_id lookup + JOIN schools
-- Adds school_name text and school_id integer to return type
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_bonus_wins(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_bonus_wins(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id uuid,
  name        text,
  school      text,
  school_name text,
  school_id   integer,
  bonus_count bigint,
  total_wins  bigint
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    COUNT(*) FILTER (WHERE m.win_type IN ('FALL','TF','TF-1.5','MD'))::bigint,
    COUNT(*) FILTER (WHERE m.win_type IS NOT NULL)::bigint
  FROM matches m
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  JOIN wrestler_completeness wc ON wc.wrestler_id = w.id AND wc.passes_general
  LEFT JOIN LATERAL (
    SELECT te2.school_id FROM tournament_entries te2
    WHERE te2.wrestler_id = w.id AND te2.school_id IS NOT NULL LIMIT 1
  ) school_ref ON true
  LEFT JOIN schools s ON s.id = school_ref.school_id
  WHERE m.validated = true AND t.gender = p_gender AND t.season_id = p_season
  GROUP BY w.id, w.first_name, w.last_name, s.id, s.display_name
  HAVING COUNT(*) FILTER (WHERE m.win_type IN ('FALL','TF','TF-1.5','MD')) > 0
  ORDER BY COUNT(*) FILTER (WHERE m.win_type IN ('FALL','TF','TF-1.5','MD')) DESC,
           COUNT(*) FILTER (WHERE m.win_type IS NOT NULL) DESC
  LIMIT 12
$function$;


-- =============================================================================
-- SECTION 23: lb_comebacks
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_comebacks(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_comebacks(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id    uuid,
  name           text,
  school         text,
  school_name    text,
  school_id      integer,
  consol_wins    bigint,
  tournament_name text,
  weight         integer
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH consol_wins AS (
    SELECT te.wrestler_id,
      COUNT(*) AS total_consol_wins,
      MODE() WITHIN GROUP (ORDER BY m.tournament_id) AS best_tournament_id,
      MODE() WITHIN GROUP (ORDER BY te.weight_class_id) AS primary_weight_id
    FROM matches m
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.bracket_side::text = 'consolation'
      AND m.validated = true AND m.win_type IS NOT NULL
      AND t.season_id = p_season AND t.gender = p_gender
    GROUP BY te.wrestler_id
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0 ELSE 1 END
  )
  SELECT cw.wrestler_id,
    w.first_name || ' ' || w.last_name,
    s.display_name, s.display_name, s.id,
    cw.total_consol_wins,
    t.name,
    wc.weight
  FROM consol_wins cw
  JOIN wrestlers w      ON w.id   = cw.wrestler_id
  JOIN tournaments t    ON t.id   = cw.best_tournament_id
  JOIN weight_classes wc ON wc.id = cw.primary_weight_id
  JOIN school_lookup sl  ON sl.wrestler_id = cw.wrestler_id
  JOIN schools s         ON s.id  = sl.school_id
  ORDER BY cw.total_consol_wins DESC, w.last_name
  LIMIT 25
$function$;


-- =============================================================================
-- SECTION 24: lb_dominance
-- Pattern: inline SCR subquery → LATERAL school_id lookup + JOIN schools
-- Adds school_name text and school_id integer to return type
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_dominance(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_dominance(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id     uuid,
  name            text,
  school          text,
  school_name     text,
  school_id       integer,
  dominance_score numeric,
  win_count       bigint
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH ms AS (
    SELECT te.wrestler_id,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS match_score, true AS is_win
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE t.gender = p_gender AND t.season_id = p_season
      AND m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'INJ'::win_type
      AND m.win_type != 'DQ'::win_type   AND m.win_type != 'BYE'::win_type
    UNION ALL
    SELECT te.wrestler_id,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS match_score, false AS is_win
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE t.gender = p_gender AND t.season_id = p_season
      AND m.validated = true AND m.win_type IS NOT NULL AND m.loser_entry_id IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'INJ'::win_type
      AND m.win_type != 'DQ'::win_type   AND m.win_type != 'BYE'::win_type
  )
  SELECT ms.wrestler_id,
    wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    ROUND(AVG(ms.match_score), 2),
    COUNT(*) FILTER (WHERE ms.is_win)::bigint
  FROM ms
  JOIN wrestlers wr ON wr.id = ms.wrestler_id
  LEFT JOIN LATERAL (
    SELECT te2.school_id FROM tournament_entries te2
    WHERE te2.wrestler_id = ms.wrestler_id AND te2.school_id IS NOT NULL LIMIT 1
  ) school_ref ON true
  LEFT JOIN schools s ON s.id = school_ref.school_id
  GROUP BY ms.wrestler_id, wr.first_name, wr.last_name, wr.id, s.id, s.display_name
  HAVING COUNT(*) >= 5
  ORDER BY AVG(ms.match_score) DESC
  LIMIT 25
$function$;


-- =============================================================================
-- SECTION 25: lb_fastest_pin
-- Pattern: inline SCR subquery → LATERAL school_id lookup + JOIN schools
-- Adds school_name text and school_id integer to return type
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_fastest_pin(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_fastest_pin(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id     uuid,
  name            text,
  school          text,
  school_name     text,
  school_id       integer,
  pin_count       bigint,
  fastest_seconds numeric
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    COUNT(*)::bigint,
    MIN(m.fall_time_seconds)::numeric
  FROM matches m
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  JOIN wrestler_completeness wc ON wc.wrestler_id = w.id AND wc.passes_general
  LEFT JOIN LATERAL (
    SELECT te2.school_id FROM tournament_entries te2
    WHERE te2.wrestler_id = w.id AND te2.school_id IS NOT NULL LIMIT 1
  ) school_ref ON true
  LEFT JOIN schools s ON s.id = school_ref.school_id
  WHERE m.win_type = 'FALL' AND m.fall_time_seconds IS NOT NULL
    AND m.validated = true AND t.gender = p_gender AND t.season_id = p_season
  GROUP BY w.id, w.first_name, w.last_name, s.id, s.display_name
  ORDER BY MIN(m.fall_time_seconds) ASC LIMIT 12
$function$;


-- =============================================================================
-- SECTION 26: lb_most_md
-- Pattern: inline SCR subquery → LATERAL school_id lookup + JOIN schools
-- Adds school_name text and school_id integer to return type
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_most_md(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_most_md(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id uuid,
  name        text,
  school      text,
  school_name text,
  school_id   integer,
  md_count    bigint
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    COUNT(*)::bigint
  FROM matches m
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  JOIN wrestler_completeness wc ON wc.wrestler_id = w.id AND wc.passes_general
  LEFT JOIN LATERAL (
    SELECT te2.school_id FROM tournament_entries te2
    WHERE te2.wrestler_id = w.id AND te2.school_id IS NOT NULL LIMIT 1
  ) school_ref ON true
  LEFT JOIN schools s ON s.id = school_ref.school_id
  WHERE m.win_type = 'MD' AND m.validated = true
    AND t.gender = p_gender AND t.season_id = p_season
  GROUP BY w.id, w.first_name, w.last_name, s.id, s.display_name
  ORDER BY COUNT(*) DESC, w.last_name LIMIT 12
$function$;


-- =============================================================================
-- SECTION 27: lb_most_pins
-- Pattern: inline SCR subquery → LATERAL school_id lookup + JOIN schools
-- Adds school_name text and school_id integer to return type
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_most_pins(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_most_pins(
  p_gender gender_type,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id   uuid,
  name          text,
  school        text,
  school_name   text,
  school_id     integer,
  pin_count     bigint,
  total_mat_time integer
)
LANGUAGE sql SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    COUNT(*)::bigint,
    COALESCE(SUM(m.fall_time_seconds), 0)::integer
  FROM matches m
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  JOIN wrestler_completeness wc ON wc.wrestler_id = w.id AND wc.passes_general
  LEFT JOIN LATERAL (
    SELECT te2.school_id FROM tournament_entries te2
    WHERE te2.wrestler_id = w.id AND te2.school_id IS NOT NULL LIMIT 1
  ) school_ref ON true
  LEFT JOIN schools s ON s.id = school_ref.school_id
  WHERE m.win_type = 'FALL' AND m.validated = true
    AND t.gender = p_gender AND t.season_id = p_season
  GROUP BY w.id, w.first_name, w.last_name, s.id, s.display_name
  ORDER BY COUNT(*) DESC, SUM(m.fall_time_seconds) ASC, w.last_name LIMIT 12
$function$;


-- =============================================================================
-- SECTION 28: lb_most_techfalls
-- Pattern: inline SCR subquery → LATERAL school_id lookup + JOIN schools
-- Adds school_name text and school_id integer to return type
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_most_techfalls(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_most_techfalls(
  p_gender gender_type,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id   uuid,
  name          text,
  school        text,
  school_name   text,
  school_id     integer,
  tf_count      bigint,
  total_mat_time integer
)
LANGUAGE sql SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    COUNT(*)::bigint,
    COALESCE(SUM(m.fall_time_seconds), 0)::integer
  FROM matches m
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  JOIN wrestler_completeness wc ON wc.wrestler_id = w.id AND wc.passes_general
  LEFT JOIN LATERAL (
    SELECT te2.school_id FROM tournament_entries te2
    WHERE te2.wrestler_id = w.id AND te2.school_id IS NOT NULL LIMIT 1
  ) school_ref ON true
  LEFT JOIN schools s ON s.id = school_ref.school_id
  WHERE m.win_type IN ('TF','TF-1.5') AND m.validated = true
    AND t.gender = p_gender AND t.season_id = p_season
  GROUP BY w.id, w.first_name, w.last_name, s.id, s.display_name
  ORDER BY COUNT(*) DESC, SUM(m.fall_time_seconds) ASC, w.last_name LIMIT 12
$function$;


-- =============================================================================
-- SECTION 29: lb_school_depth
-- Pattern: aggregation by school_context_raw → school_id, join schools
-- Return type: adds school_id integer
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_school_depth(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_school_depth(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  school             text,
  school_id          integer,
  weight_classes_placed bigint,
  wrestlers          bigint
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH wrestler_max_level AS (
    SELECT te.wrestler_id, te.school_id,
      MAX(CASE t.tournament_type::text
        WHEN 'boys_state'   THEN 3 WHEN 'girls_state'   THEN 3
        WHEN 'regions'      THEN 2 WHEN 'girls_regions' THEN 2
        WHEN 'districts'    THEN 1 ELSE 0
      END) AS max_level
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
      AND t.season_id = p_season AND t.gender = p_gender
    WHERE te.school_id IS NOT NULL
    GROUP BY te.wrestler_id, te.school_id
  ),
  global_max AS (
    SELECT MAX(max_level) AS top_level FROM wrestler_max_level
  ),
  school_counts AS (
    SELECT w.school_id,
      COUNT(DISTINCT w.wrestler_id) AS cnt,
      COUNT(DISTINCT (
        SELECT wc.id FROM tournament_entries te2
        JOIN weight_classes wc ON wc.id = te2.weight_class_id
        WHERE te2.wrestler_id = w.wrestler_id LIMIT 1
      )) AS weight_cnt
    FROM wrestler_max_level w, global_max g
    WHERE w.max_level = g.top_level
    GROUP BY w.school_id
  )
  SELECT s.display_name AS school, s.id AS school_id,
    sc.weight_cnt, sc.cnt
  FROM school_counts sc
  JOIN schools s ON s.id = sc.school_id
  ORDER BY sc.cnt DESC, s.display_name
  LIMIT 25
$function$;


-- =============================================================================
-- SECTION 30: lb_technical_masters
-- Pattern: school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_technical_masters(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_technical_masters(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id        uuid,
  wrestler_name      text,
  school             text,
  school_name        text,
  school_id          integer,
  weight             integer,
  tech_fall_wins     bigint,
  avg_tf_time_seconds numeric,
  fastest_tf_seconds  integer,
  avg_tf_time_display text,
  fastest_tf_display  text
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH contested_wins AS (
    SELECT te.wrestler_id, m.win_type::text AS win_type, m.fall_time_seconds
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
      AND t.season_id = p_season AND t.gender = p_gender
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type NOT IN ('BYE'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type)
  ),
  wrestler_stats AS (
    SELECT cw.wrestler_id,
      COUNT(*) AS total_wins,
      COUNT(*) FILTER (WHERE cw.win_type IN ('TF','TF-1','TF-1.5')) AS tf_wins,
      ROUND(AVG(cw.fall_time_seconds) FILTER (WHERE cw.win_type IN ('TF','TF-1','TF-1.5')), 1) AS avg_tf_time,
      MIN(cw.fall_time_seconds)  FILTER (WHERE cw.win_type IN ('TF','TF-1','TF-1.5')) AS fastest_tf
    FROM contested_wins cw
    GROUP BY cw.wrestler_id
    HAVING COUNT(*) >= 2
      AND COUNT(*) = COUNT(*) FILTER (WHERE cw.win_type IN ('TF','TF-1','TF-1.5'))
  ),
  wrestler_weight AS (
    SELECT DISTINCT ON (te.wrestler_id) te.wrestler_id, wc.weight
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id AND t.season_id = p_season AND t.gender = p_gender
    JOIN weight_classes wc ON wc.id = te.weight_class_id
    ORDER BY te.wrestler_id, wc.weight
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te.wrestler_id) te.wrestler_id, te.school_id
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id AND t.season_id = p_season AND t.gender = p_gender
    WHERE te.school_id IS NOT NULL
    ORDER BY te.wrestler_id
  )
  SELECT w.id,
    TRIM(COALESCE(w.first_name,'') || ' ' || COALESCE(w.last_name,'')),
    s.display_name, s.display_name, s.id,
    ww.weight,
    ws.tf_wins,
    ws.avg_tf_time,
    ws.fastest_tf,
    CONCAT(FLOOR(ws.avg_tf_time / 60)::text, ':',
           LPAD(MOD(ROUND(ws.avg_tf_time)::int, 60)::text, 2, '0')),
    CONCAT(FLOOR(ws.fastest_tf / 60)::text, ':',
           LPAD(MOD(ws.fastest_tf, 60)::text, 2, '0'))
  FROM wrestler_stats ws
  JOIN wrestlers w    ON ws.wrestler_id = w.id
  JOIN school_lookup sl ON sl.wrestler_id = ws.wrestler_id
  JOIN schools s      ON s.id = sl.school_id
  LEFT JOIN wrestler_weight ww ON ww.wrestler_id = ws.wrestler_id
  ORDER BY ws.tf_wins DESC, ws.avg_tf_time ASC NULLS LAST
  LIMIT 25
$function$;


-- =============================================================================
-- SECTION 31: lb_win_pct
-- Pattern: inline SCR subquery → LATERAL school_id lookup + JOIN schools
-- Adds school_name text and school_id integer to return type
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_win_pct(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_win_pct(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id uuid,
  name        text,
  school      text,
  school_name text,
  school_id   integer,
  wins        bigint,
  total       bigint,
  win_pct     numeric
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH all_matches AS (
    SELECT te.wrestler_id, true AS is_win FROM matches m
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
    WHERE m.win_type IS NOT NULL AND m.win_type::text <> 'BYE'
      AND m.validated = true AND t.gender = p_gender AND t.season_id = p_season
    UNION ALL
    SELECT te.wrestler_id, false AS is_win FROM matches m
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
    WHERE m.validated = true AND t.gender = p_gender AND t.season_id = p_season
  )
  SELECT w.id, w.first_name || ' ' || w.last_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    COUNT(*) FILTER (WHERE am.is_win)::bigint,
    COUNT(*)::bigint,
    ROUND(COUNT(*) FILTER (WHERE am.is_win)::numeric / COUNT(*) * 100, 1)
  FROM all_matches am
  JOIN wrestlers w ON w.id = am.wrestler_id
  JOIN wrestler_completeness wc ON wc.wrestler_id = w.id AND wc.passes_win_pct
  LEFT JOIN LATERAL (
    SELECT te2.school_id FROM tournament_entries te2
    WHERE te2.wrestler_id = w.id AND te2.school_id IS NOT NULL LIMIT 1
  ) school_ref ON true
  LEFT JOIN schools s ON s.id = school_ref.school_id
  GROUP BY w.id, w.first_name, w.last_name, s.id, s.display_name
  HAVING COUNT(*) >= 5
  ORDER BY COUNT(*) FILTER (WHERE am.is_win)::numeric / COUNT(*) DESC,
           COUNT(*) FILTER (WHERE am.is_win) DESC
  LIMIT 12
$function$;


-- =============================================================================
-- SECTION 32: lb_revenge_matches
-- Pattern: LATERAL joins for two wrestlers → use school_id
-- Adds avenger_school_id integer and opponent_school_id integer to return
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_revenge_matches(gender_type, smallint);
CREATE OR REPLACE FUNCTION public.lb_revenge_matches(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  avenger_id        uuid,
  avenger_name      text,
  avenger_school    text,
  avenger_school_name text,
  avenger_school_id integer,
  opponent_id       uuid,
  opponent_name     text,
  opponent_school   text,
  opponent_school_id integer,
  weight            integer,
  revenge_round     text,
  revenge_win_type  text,
  region            text,
  district_round    text,
  district_loss_type text
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH district_losses AS (
    SELECT te_l.wrestler_id AS loser_wrestler, te_w.wrestler_id AS winner_wrestler,
      wc.weight, m.round::text AS round, m.win_type::text AS loss_type
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
    JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
    WHERE t.tournament_type = 'districts' AND t.season_id = p_season AND t.gender = p_gender
      AND m.validated = true
      AND m.win_type::text NOT IN ('FORF','BYE','INJ','DQ')
  ),
  region_wins AS (
    SELECT te_w.wrestler_id AS winner_wrestler, te_l.wrestler_id AS loser_wrestler,
      wc.weight, m.round::text AS round, m.win_type::text AS win_type, t.name AS tournament
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
    JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
    WHERE t.tournament_type IN ('regions','girls_regions')
      AND t.season_id = p_season AND t.gender = p_gender
      AND m.validated = true
      AND m.win_type::text NOT IN ('FORF','BYE')
  )
  SELECT
    w1.id AS avenger_id,
    TRIM(COALESCE(w1.first_name,'') || ' ' || COALESCE(w1.last_name,'')) AS avenger_name,
    s1.display_name AS avenger_school,
    s1.display_name AS avenger_school_name,
    s1.id           AS avenger_school_id,
    w2.id AS opponent_id,
    TRIM(COALESCE(w2.first_name,'') || ' ' || COALESCE(w2.last_name,'')) AS opponent_name,
    s2.display_name AS opponent_school,
    s2.id           AS opponent_school_id,
    rw.weight,
    rw.round        AS revenge_round,
    rw.win_type     AS revenge_win_type,
    CASE WHEN rw.tournament LIKE '%%r%%'
         THEN 'R' || regexp_replace(rw.tournament, '.*r(\d+)$', '\1')
         ELSE rw.tournament END AS region,
    dl.round        AS district_round,
    dl.loss_type    AS district_loss_type
  FROM region_wins rw
  JOIN district_losses dl ON dl.loser_wrestler = rw.winner_wrestler
                         AND dl.winner_wrestler = rw.loser_wrestler
  JOIN wrestlers w1 ON w1.id = rw.winner_wrestler
  JOIN wrestlers w2 ON w2.id = rw.loser_wrestler
  JOIN LATERAL (
    SELECT te.school_id FROM tournament_entries te
    JOIN tournaments tt ON tt.id = te.tournament_id
    WHERE te.wrestler_id = w1.id AND tt.season_id = p_season AND te.school_id IS NOT NULL
    ORDER BY CASE WHEN tt.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
    LIMIT 1
  ) te1 ON true
  LEFT JOIN schools s1 ON s1.id = te1.school_id
  JOIN LATERAL (
    SELECT te.school_id FROM tournament_entries te
    JOIN tournaments tt ON tt.id = te.tournament_id
    WHERE te.wrestler_id = w2.id AND tt.season_id = p_season AND te.school_id IS NOT NULL
    ORDER BY CASE WHEN tt.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
    LIMIT 1
  ) te2 ON true
  LEFT JOIN schools s2 ON s2.id = te2.school_id
  ORDER BY
    CASE rw.round WHEN 'F' THEN 1 WHEN 'SF' THEN 2 WHEN '3rd_Place' THEN 3
      WHEN 'C2' THEN 4 WHEN 'C1' THEN 5 WHEN '5th_Place' THEN 6 WHEN 'QF' THEN 7 ELSE 8
    END,
    rw.weight
  LIMIT 25
$function$;


-- =============================================================================
-- SECTION 33: lb_gp_bonus_pct
-- school_lookup CTE → school_id; wins CTE groups by school_id; JOIN schools
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_gp_bonus_pct(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_bonus_pct(
  p_pool   text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  wrestler_id  uuid,
  wrestler_name text,
  school       text,
  school_name  text,
  school_id    integer,
  bonus_wins   integer,
  total_wins   integer,
  bonus_pct    numeric
)
LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F' AND season_id = p_season
      AND (
        (p_pool = 'region'    AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
        (p_pool = 'state'     AND name LIKE 'Girl_s%') OR
        (p_pool = 'districts' AND tournament_type = 'districts'::tournament_type)
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  ),
  wins AS (
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      COUNT(*)::integer AS total_wins,
      COUNT(*) FILTER (
        WHERE m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%'
           OR m.win_type = 'MD'::win_type   OR m.win_type = 'INJ'::win_type
           OR m.win_type = 'DQ'::win_type
      )::integer AS bonus_wins
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type NOT IN ('FORF'::win_type, 'BYE'::win_type)
    GROUP BY te.wrestler_id, COALESCE(te.school_id, sl.school_id)
    HAVING COUNT(*) >= 2
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(100.0 * wins.bonus_wins / wins.total_wins, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 25;
END;
$function$;


-- =============================================================================
-- SECTION 34: lb_gp_dominance
-- Replace inline SCR subqueries with school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_gp_dominance(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_dominance(
  p_pool   text    DEFAULT 'state'::text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  wrestler_id     uuid,
  wrestler_name   text,
  school          text,
  school_name     text,
  school_id       integer,
  dominance_score numeric,
  win_count       bigint
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE season_id = p_season AND gender = 'F'
      AND (
        ((p_pool = 'district' OR p_pool = 'districts') AND name LIKE 'Girl_s Districts%') OR
        (p_pool = 'region'  AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
        (p_pool = 'state'   AND TRUE)
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  ),
  match_scores AS (
    SELECT te.wrestler_id, true AS is_win,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS match_score
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.win_type IS NOT NULL AND m.validated = true
      AND dom_match_score(m.win_type::text, m.fall_time_seconds) IS NOT NULL
    UNION ALL
    SELECT te.wrestler_id, false AS is_win,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS match_score
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.win_type IS NOT NULL AND m.validated = true AND m.loser_entry_id IS NOT NULL
      AND dom_match_score(m.win_type::text, m.fall_time_seconds) IS NOT NULL
  ),
  agg AS (
    SELECT wrestler_id, ROUND(AVG(match_score), 2) AS dominance_score,
      COUNT(*) FILTER (WHERE is_win) AS win_count
    FROM match_scores GROUP BY wrestler_id
    HAVING COUNT(*) >= 5
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.dominance_score, agg.win_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wrestler_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = agg.wrestler_id
  LEFT JOIN schools s        ON s.id = sl.school_id
  WHERE wr.first_name != ''
  ORDER BY agg.dominance_score DESC LIMIT 25;
$function$;


-- =============================================================================
-- SECTION 35: lb_gp_fastest_pin
-- school_lookup CTE → school_id; COALESCE(te.school_id, sl.school_id)
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_gp_fastest_pin(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_fastest_pin(
  p_pool   text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  wrestler_id       uuid,
  wrestler_name     text,
  school            text,
  school_name       text,
  school_id         integer,
  fall_time_seconds integer,
  weight            integer,
  match_context     text
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH
  pool_tournaments AS (
    SELECT id, name FROM tournaments WHERE gender = 'F' AND season_id = p_season AND (
      (p_pool = 'region'    AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
      (p_pool = 'state'     AND name LIKE 'Girl_s%') OR
      (p_pool = 'districts' AND tournament_type = 'districts'::tournament_type)
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    m.fall_time_seconds::integer, wc.weight::integer,
    CASE
      WHEN pt.name LIKE '%Districts District%' THEN
        'D' || regexp_replace(pt.name, '.*District (\d+)$', '\1') || ' ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      WHEN pt.name LIKE '%Regions r%' THEN
        'R' || regexp_replace(pt.name, '.*r(\d+)$', '\1') || ' ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      WHEN pt.name LIKE '%States%' THEN
        'State ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      ELSE pt.name || ' ' || m.round::text
    END
  FROM matches m
  JOIN pool_tournaments pt ON m.tournament_id = pt.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN schools s ON s.id = COALESCE(te.school_id, sl.school_id)
  WHERE m.validated = true AND m.win_type = 'FALL'::win_type AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 25;
$function$;


-- =============================================================================
-- SECTION 36: lb_gp_fastest_tf
-- school_lookup CTE → school_id; COALESCE(te.school_id, sl.school_id)
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_gp_fastest_tf(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_fastest_tf(
  p_pool   text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  wrestler_id       uuid,
  wrestler_name     text,
  school            text,
  school_name       text,
  school_id         integer,
  fall_time_seconds integer,
  weight            integer,
  match_context     text
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH
  pool_tournaments AS (
    SELECT id, name FROM tournaments WHERE gender = 'F' AND season_id = p_season AND (
      (p_pool = 'region'    AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
      (p_pool = 'state'     AND name LIKE 'Girl_s%') OR
      (p_pool = 'districts' AND tournament_type = 'districts'::tournament_type)
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    m.fall_time_seconds::integer, wc.weight::integer,
    CASE
      WHEN pt.name LIKE '%Districts District%' THEN
        'D' || regexp_replace(pt.name, '.*District (\d+)$', '\1') || ' ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      WHEN pt.name LIKE '%Regions r%' THEN
        'R' || regexp_replace(pt.name, '.*r(\d+)$', '\1') || ' ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      WHEN pt.name LIKE '%States%' THEN
        'State ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      ELSE pt.name || ' ' || m.round::text
    END
  FROM matches m
  JOIN pool_tournaments pt ON m.tournament_id = pt.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN schools s ON s.id = COALESCE(te.school_id, sl.school_id)
  WHERE m.validated = true AND m.win_type::text IN ('TF','TF-1','TF-1.5') AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 25;
$function$;


-- =============================================================================
-- SECTION 37: lb_gp_mat_time
-- school_lookup CTE → school_id; agg by wid + school_id; JOIN schools
-- =============================================================================

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


-- =============================================================================
-- SECTION 38: lb_gp_most_bonus
-- school_lookup CTE → school_id; all_matches groups by school_id; JOIN schools
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_gp_most_bonus(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_most_bonus(
  p_pool   text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_wins    integer
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = 'F' AND season_id = p_season
      AND (
        (p_pool = 'district'  AND tournament_type = 'districts') OR
        (p_pool = 'districts' AND tournament_type = 'districts'::tournament_type) OR
        (p_pool = 'region'    AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
        (p_pool = 'state'     AND TRUE)
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  ),
  all_matches AS (
    SELECT te.wrestler_id, true AS is_win,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN m.win_type IN ('FALL','TF','TF-1','TF-1.5','MD') THEN 1 ELSE 0 END AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL AND m.win_type NOT IN ('BYE','FORF')
    UNION ALL
    SELECT te.wrestler_id, false AS is_win,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      0 AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL AND m.win_type NOT IN ('BYE','FORF')
      AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wrestler_id, school_id,
      SUM(is_bonus)::integer AS bonus_wins,
      COUNT(*)::integer AS total_matches
    FROM all_matches
    GROUP BY wrestler_id, school_id
    HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    agg.bonus_wins, agg.total_matches
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wrestler_id
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY (agg.bonus_wins::numeric / agg.total_matches) DESC, agg.bonus_wins DESC
  LIMIT 25;
$function$;


-- =============================================================================
-- SECTION 39: lb_gp_most_pins
-- school_lookup CTE → school_id; wins groups by school_id; JOIN schools
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_gp_most_pins(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_most_pins(
  p_pool   text,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  pin_count     integer,
  total_mat_time integer
)
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F' AND season_id = p_season
      AND (
        (p_pool = 'districts' AND tournament_type = 'districts'::tournament_type) OR
        (p_pool = 'region'    AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
        (p_pool = 'state'     AND name LIKE 'Girl_s%')
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  ),
  wins AS (
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      COUNT(*)::integer AS pin_count,
      COALESCE(SUM(m.fall_time_seconds), 0)::integer AS total_mat_time
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type = 'FALL'::win_type
    GROUP BY te.wrestler_id, COALESCE(te.school_id, sl.school_id)
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.pin_count, wins.total_mat_time
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY pin_count DESC, total_mat_time ASC LIMIT 25;
END;
$function$;


-- =============================================================================
-- SECTION 40: lb_gp_most_tf
-- school_lookup CTE → school_id; wins groups by school_id; JOIN schools
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_gp_most_tf(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_most_tf(
  p_pool   text,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  tf_count      integer,
  total_mat_time integer
)
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F' AND season_id = p_season
      AND (
        (p_pool = 'districts' AND tournament_type = 'districts'::tournament_type) OR
        (p_pool = 'region'    AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
        (p_pool = 'state'     AND name LIKE 'Girl_s%')
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  ),
  wins AS (
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      COUNT(*)::integer AS tf_count,
      COALESCE(SUM(m.fall_time_seconds), 0)::integer AS total_mat_time
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type::text LIKE 'TF%'
    GROUP BY te.wrestler_id, COALESCE(te.school_id, sl.school_id)
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.tf_count, wins.total_mat_time
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY tf_count DESC, total_mat_time ASC LIMIT 25;
END;
$function$;


-- =============================================================================
-- SECTION 41: lb_gp_wrestler_points
-- school_lookup CTE → school_id; JOIN schools at end (computation unchanged)
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_gp_wrestler_points(text, smallint);
CREATE OR REPLACE FUNCTION public.lb_gp_wrestler_points(
  p_pool   text     DEFAULT 'region'::text,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  total_points  numeric,
  win_count     integer
)
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
    SELECT te.wrestler_id,
      ROUND(SUM(tw_wrestler_points(te.id, t.id, 'district_32')), 1) AS pts,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM matches m
        WHERE m.winner_entry_id = te.id AND m.tournament_id = t.id
          AND m.validated = true AND (m.win_type IS NOT NULL OR m.loser_entry_id IS NOT NULL)
      ))::integer AS wins
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.tournament_type = 'districts'
    GROUP BY te.wrestler_id
  ),
  reg AS (
    SELECT te.wrestler_id,
      ROUND(SUM(tw_wrestler_points(te.id, t.id, 'region_32')), 1) AS pts,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM matches m
        WHERE m.winner_entry_id = te.id AND m.tournament_id = t.id
          AND m.validated = true AND (m.win_type IS NOT NULL OR m.loser_entry_id IS NOT NULL)
      ))::integer AS wins
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.tournament_type = 'girls_regions'
    GROUP BY te.wrestler_id
  ),
  st AS (
    SELECT te.wrestler_id,
      ROUND(SUM(tw_wrestler_points(te.id, t.id, 'state_8')), 1) AS pts,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM matches m
        WHERE m.winner_entry_id = te.id AND m.tournament_id = t.id
          AND m.validated = true AND (m.win_type IS NOT NULL OR m.loser_entry_id IS NOT NULL)
      ))::integer AS wins
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    WHERE t.season_id = p_season AND t.gender = 'F' AND t.name = 'Girl_s States'
    GROUP BY te.wrestler_id
  ),
  combined AS (
    SELECT COALESCE(d.wrestler_id, r.wrestler_id, s.wrestler_id) AS wid,
      CASE
        WHEN p_pool = 'districts' THEN COALESCE(d.pts, 0)
        WHEN p_pool = 'region'    THEN COALESCE(d.pts, 0) + COALESCE(r.pts, 0)
        ELSE COALESCE(d.pts, 0) + COALESCE(r.pts, 0) + COALESCE(s.pts, 0)
      END AS total,
      CASE
        WHEN p_pool = 'districts' THEN COALESCE(d.wins, 0)
        WHEN p_pool = 'region'    THEN COALESCE(d.wins, 0) + COALESCE(r.wins, 0)
        ELSE COALESCE(d.wins, 0) + COALESCE(r.wins, 0) + COALESCE(s.wins, 0)
      END AS wins
    FROM dist d
    FULL OUTER JOIN reg r ON d.wrestler_id = r.wrestler_id
    FULL OUTER JOIN st s  ON COALESCE(d.wrestler_id, r.wrestler_id) = s.wrestler_id
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    c.total        AS total_points,
    c.wins         AS win_count
  FROM combined c
  JOIN wrestlers wr ON wr.id = c.wid
  LEFT JOIN school_lookup sl ON sl.wrestler_id = c.wid
  LEFT JOIN schools s        ON s.id = sl.school_id
  WHERE c.total > 0 AND c.wins >= 1
  ORDER BY c.total DESC
  LIMIT 25;
END;
$function$;


-- =============================================================================
-- SECTION 42: lb_p_bonus_pct
-- school_lookup CTE → school_id; wins groups by school_id; JOIN schools
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_p_bonus_pct(gender_type, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_bonus_pct(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_wins    integer,
  bonus_pct     numeric
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = p_gender AND season_id = p_season
      AND (
        (p_pool = 'district' AND name LIKE 'Boy_s Districts%') OR
        (p_pool = 'region'   AND (name LIKE 'Boy_s Districts%' OR name LIKE 'Boy_s Regions%')) OR
        (p_pool = 'state'    AND name LIKE 'Boy_s%')
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  wins AS (
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      COUNT(*)::integer AS total_wins,
      COUNT(*) FILTER (
        WHERE m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%'
           OR m.win_type = 'MD'::win_type   OR m.win_type = 'INJ'::win_type
           OR m.win_type = 'DQ'::win_type
      )::integer AS bonus_wins
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type NOT IN ('FORF'::win_type, 'BYE'::win_type)
    GROUP BY te.wrestler_id, COALESCE(te.school_id, sl.school_id)
    HAVING COUNT(*) >= 2
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 25
$function$;


-- =============================================================================
-- SECTION 43: lb_p_dominance
-- Replace inline SCR subqueries with school_lookup CTE → school_id
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_p_dominance(gender_type, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_dominance(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id     uuid,
  wrestler_name   text,
  school          text,
  school_name     text,
  school_id       integer,
  dominance_score numeric,
  win_count       bigint
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE season_id = p_season AND gender = p_gender
      AND (
        (p_pool = 'district' AND tournament_type = 'districts') OR
        (p_pool = 'region'   AND tournament_type IN ('districts','regions','girls_regions')) OR
        (p_pool = 'state'    AND TRUE)
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  match_scores AS (
    SELECT te.wrestler_id, true AS is_win,
      dom_match_score(m.win_type::text, m.fall_time_seconds) AS match_score
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.win_type IS NOT NULL AND m.validated = true
      AND dom_match_score(m.win_type::text, m.fall_time_seconds) IS NOT NULL
    UNION ALL
    SELECT te.wrestler_id, false AS is_win,
      -dom_match_score(m.win_type::text, m.fall_time_seconds) AS match_score
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.win_type IS NOT NULL AND m.validated = true AND m.loser_entry_id IS NOT NULL
      AND dom_match_score(m.win_type::text, m.fall_time_seconds) IS NOT NULL
  ),
  agg AS (
    SELECT wrestler_id, ROUND(AVG(match_score), 2) AS dominance_score,
      COUNT(*) FILTER (WHERE is_win) AS win_count
    FROM match_scores GROUP BY wrestler_id
    HAVING COUNT(*) >= 5
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name, s.display_name, s.id,
    agg.dominance_score, agg.win_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wrestler_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = agg.wrestler_id
  LEFT JOIN schools s        ON s.id = sl.school_id
  WHERE wr.first_name != ''
  ORDER BY agg.dominance_score DESC LIMIT 25;
$function$;


-- =============================================================================
-- SECTION 44: lb_p_fastest_pin
-- school_lookup CTE → school_id; COALESCE(te.school_id, sl.school_id)
-- NOTE: fall_time_seconds return type is smallint (matches live DB signature)
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_p_fastest_pin(gender_type, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_fastest_pin(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id       uuid,
  wrestler_name     text,
  school            text,
  school_name       text,
  school_id         integer,
  fall_time_seconds smallint,
  weight            integer,
  match_context     text
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH
  pool_tournaments AS (
    SELECT id, name FROM tournaments WHERE gender = p_gender AND season_id = p_season AND (
      (p_pool = 'district' AND tournament_type = 'districts') OR
      (p_pool = 'region'   AND tournament_type IN ('districts','regions','girls_regions')) OR
      (p_pool = 'state'    AND TRUE)
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    m.fall_time_seconds, wc.weight,
    CASE
      WHEN pt.name LIKE '%Districts District%' THEN
        'D' || regexp_replace(pt.name, '.*District (\d+)$', '\1') || ' ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      WHEN pt.name LIKE '%Regions r%' THEN
        'R' || regexp_replace(pt.name, '.*r(\d+)$', '\1') || ' ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      WHEN pt.name LIKE '%States%' THEN
        'State ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      ELSE pt.name || ' ' || m.round::text
    END AS match_context
  FROM matches m
  JOIN pool_tournaments pt ON m.tournament_id = pt.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN schools s ON s.id = COALESCE(te.school_id, sl.school_id)
  WHERE m.validated = true AND m.win_type = 'FALL'::win_type AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 25;
$function$;


-- =============================================================================
-- SECTION 45: lb_p_fastest_tf
-- school_lookup CTE → school_id; COALESCE(te.school_id, sl.school_id)
-- NOTE: fall_time_seconds return type is smallint (matches live DB signature)
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_p_fastest_tf(gender_type, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_fastest_tf(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id       uuid,
  wrestler_name     text,
  school            text,
  school_name       text,
  school_id         integer,
  fall_time_seconds smallint,
  weight            integer,
  match_context     text
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH
  pool_tournaments AS (
    SELECT id, name FROM tournaments WHERE gender = p_gender AND season_id = p_season AND (
      (p_pool = 'district' AND tournament_type = 'districts') OR
      (p_pool = 'region'   AND tournament_type IN ('districts','regions','girls_regions')) OR
      (p_pool = 'state'    AND TRUE)
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    m.fall_time_seconds, wc.weight,
    CASE
      WHEN pt.name LIKE '%Districts District%' THEN
        'D' || regexp_replace(pt.name, '.*District (\d+)$', '\1') || ' ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      WHEN pt.name LIKE '%Regions r%' THEN
        'R' || regexp_replace(pt.name, '.*r(\d+)$', '\1') || ' ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      WHEN pt.name LIKE '%States%' THEN
        'State ' ||
        CASE m.round::text WHEN 'F' THEN 'Final' WHEN 'SF' THEN 'SF' WHEN '3rd_Place' THEN '3rd'
          WHEN 'QF' THEN 'QF' WHEN 'R2' THEN 'R2' WHEN 'R1' THEN 'R1'
          WHEN 'C1' THEN 'C1' WHEN 'C2' THEN 'C2' WHEN '5th_Place' THEN '5th' ELSE m.round::text END
      ELSE pt.name || ' ' || m.round::text
    END
  FROM matches m
  JOIN pool_tournaments pt ON m.tournament_id = pt.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN schools s ON s.id = COALESCE(te.school_id, sl.school_id)
  WHERE m.validated = true AND m.win_type::text IN ('TF','TF-1','TF-1.5') AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 25;
$function$;


-- =============================================================================
-- SECTION 46: lb_p_mat_time
-- school_lookup CTE → school_id; agg by wid + school_id; JOIN schools
-- =============================================================================

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


-- =============================================================================
-- SECTION 47: lb_p_most_bonus
-- school_lookup CTE → school_id; all_matches groups by school_id; JOIN schools
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_p_most_bonus(gender_type, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_most_bonus(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_wins    integer
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = p_gender AND season_id = p_season
      AND (
        (p_pool = 'district' AND tournament_type = 'districts') OR
        (p_pool = 'region'   AND tournament_type IN ('districts','regions','girls_regions')) OR
        (p_pool = 'state'    AND TRUE)
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  all_matches AS (
    SELECT te.wrestler_id, true AS is_win,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN m.win_type IN ('FALL','TF','TF-1','TF-1.5','MD') THEN 1 ELSE 0 END AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL AND m.win_type NOT IN ('BYE','FORF')
    UNION ALL
    SELECT te.wrestler_id, false AS is_win,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      0 AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL AND m.win_type NOT IN ('BYE','FORF')
      AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wrestler_id, school_id,
      SUM(is_bonus)::integer AS bonus_wins,
      COUNT(*)::integer AS total_matches
    FROM all_matches
    GROUP BY wrestler_id, school_id
    HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    agg.bonus_wins, agg.total_matches
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wrestler_id
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY (agg.bonus_wins::numeric / agg.total_matches) DESC, agg.bonus_wins DESC
  LIMIT 25;
$function$;


-- =============================================================================
-- SECTION 48: lb_p_most_pins
-- p_gender TEXT (not gender_type) — preserves live signature
-- school_lookup CTE → school_id; wins groups by school_id; JOIN schools
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_p_most_pins(text, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_most_pins(
  p_gender text,
  p_pool   text,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id    uuid,
  wrestler_name  text,
  school         text,
  school_name    text,
  school_id      integer,
  pin_count      integer,
  total_mat_time integer
)
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = p_gender::gender_type AND season_id = p_season
      AND (
        (p_pool = 'district' AND name LIKE 'Boy_s Districts%') OR
        (p_pool = 'region'   AND (name LIKE 'Boy_s Districts%' OR name LIKE 'Boy_s Regions%')) OR
        (p_pool = 'state'    AND name LIKE 'Boy_s%')
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season
      AND t2.gender = p_gender::gender_type
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  wins AS (
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      COUNT(*)::integer AS pin_count,
      COALESCE(SUM(m.fall_time_seconds), 0)::integer AS total_mat_time
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type = 'FALL'::win_type
    GROUP BY te.wrestler_id, COALESCE(te.school_id, sl.school_id)
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.pin_count, wins.total_mat_time
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY pin_count DESC, total_mat_time ASC LIMIT 25;
END;
$function$;


-- =============================================================================
-- SECTION 49: lb_p_most_tf
-- p_gender TEXT (not gender_type) — preserves live signature
-- school_lookup CTE → school_id; wins groups by school_id; JOIN schools
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_p_most_tf(text, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_most_tf(
  p_gender text,
  p_pool   text,
  p_season smallint
)
RETURNS TABLE(
  wrestler_id    uuid,
  wrestler_name  text,
  school         text,
  school_name    text,
  school_id      integer,
  tf_count       integer,
  total_mat_time integer
)
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = p_gender::gender_type AND season_id = p_season
      AND (
        (p_pool = 'district' AND name LIKE 'Boy_s Districts%') OR
        (p_pool = 'region'   AND (name LIKE 'Boy_s Districts%' OR name LIKE 'Boy_s Regions%')) OR
        (p_pool = 'state'    AND name LIKE 'Boy_s%')
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season
      AND t2.gender = p_gender::gender_type
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  wins AS (
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      COUNT(*)::integer AS tf_count,
      COALESCE(SUM(m.fall_time_seconds), 0)::integer AS total_mat_time
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type::text LIKE 'TF%'
    GROUP BY te.wrestler_id, COALESCE(te.school_id, sl.school_id)
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    wins.tf_count, wins.total_mat_time
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY tf_count DESC, total_mat_time ASC LIMIT 25;
END;
$function$;


-- =============================================================================
-- SECTION 50: lb_p_wrestler_points
-- school_lookup CTE → school_id; JOIN schools at end (main computation unchanged)
-- =============================================================================

DROP FUNCTION IF EXISTS public.lb_p_wrestler_points(gender_type, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_wrestler_points(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  total_points  numeric,
  win_count     integer
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pool_tournaments AS (
    SELECT id, name FROM tournaments
    WHERE gender = p_gender AND season_id = p_season AND (
      (p_pool = 'district' AND name LIKE 'Boy_s Districts%') OR
      (p_pool = 'region'   AND (name LIKE 'Boy_s Districts%' OR name LIKE 'Boy_s Regions%')) OR
      (p_pool = 'state'    AND name LIKE 'Boy_s%')
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  r1_winners AS (
    SELECT m.tournament_id, m.weight_class_id, m.winner_entry_id
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    WHERE m.round::text = 'R1' AND m.validated = true AND m.winner_entry_id IS NOT NULL
  ),
  placements AS (
    SELECT m.tournament_id, m.weight_class_id, m.winner_entry_id AS entry_id, 1 AS place
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    WHERE m.round::text = 'F' AND m.bracket_side = 'championship' AND m.validated = true AND m.winner_entry_id IS NOT NULL
    UNION ALL
    SELECT m.tournament_id, m.weight_class_id, m.loser_entry_id, 2
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    WHERE m.round::text = 'F' AND m.bracket_side = 'championship' AND m.validated = true AND m.loser_entry_id IS NOT NULL
    UNION ALL
    SELECT m.tournament_id, m.weight_class_id, m.winner_entry_id, 3
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    WHERE m.round::text = '3rd_Place' AND m.validated = true AND m.winner_entry_id IS NOT NULL
    UNION ALL
    SELECT m.tournament_id, m.weight_class_id, m.loser_entry_id, 4
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    WHERE m.round::text = '3rd_Place' AND m.validated = true AND m.loser_entry_id IS NOT NULL
  ),
  win_pts AS (
    SELECT te.wrestler_id,
      CASE
        WHEN pt.name LIKE 'Boy_s Districts%' THEN
          CASE m.round::text
            WHEN 'R1' THEN 2.0
            WHEN 'QF' THEN CASE WHEN rw.winner_entry_id IS NOT NULL THEN 0.0 ELSE 2.0 END
            WHEN 'SF' THEN 2.0 WHEN 'F' THEN 2.0 WHEN '3rd_Place' THEN 2.0 ELSE 0.0
          END
        WHEN pt.name LIKE 'Boy_s Regions%' THEN
          CASE m.round::text
            WHEN 'R1' THEN 2.0
            WHEN 'QF' THEN CASE WHEN rw.winner_entry_id IS NOT NULL THEN 5.0 ELSE 7.0 END
            WHEN 'SF' THEN 9.0 WHEN 'F' THEN 6.0
            WHEN 'C1' THEN 4.0 WHEN 'CSemi' THEN 3.0 WHEN 'C_Semi' THEN 3.0
            WHEN '3rd_Place' THEN 4.0 WHEN '5th_Place' THEN 2.0 ELSE 0.0
          END
        ELSE
          CASE m.round::text
            WHEN 'R1' THEN 2.0 WHEN 'R2' THEN 2.0
            WHEN 'QF' THEN 5.0 WHEN 'SF' THEN 9.0 WHEN 'F' THEN 6.0
            WHEN 'C1' THEN 1.0 WHEN 'C2' THEN 1.0 WHEN 'C3' THEN 1.0
            WHEN 'C4' THEN 2.0 WHEN 'C5' THEN 3.0
            WHEN 'CSemi' THEN 3.0 WHEN 'C_Semi' THEN 3.0
            WHEN '3rd_Place' THEN 4.0 WHEN '5th_Place' THEN 2.0 ELSE 0.0
          END
      END +
      CASE m.win_type::text
        WHEN 'FALL' THEN 2.0 WHEN 'INJ' THEN 2.0
        WHEN 'TF'   THEN 1.5 WHEN 'TF-1.5' THEN 1.5
        WHEN 'MD'   THEN 1.0 ELSE 0.0
      END AS pts,
      1 AS is_win
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN r1_winners rw ON rw.tournament_id = m.tournament_id
      AND rw.weight_class_id = m.weight_class_id
      AND rw.winner_entry_id = m.winner_entry_id
    WHERE m.validated = true AND m.winner_entry_id IS NOT NULL
  ),
  loss_pts AS (
    SELECT te.wrestler_id,
      CASE
        WHEN m.round::text = 'F' THEN 2.0
        WHEN m.round::text = '3rd_Place' AND pt.name NOT LIKE 'Boy_s Districts%' THEN 2.0
        ELSE 0.0
      END AS pts,
      0 AS is_win
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.loser_entry_id IS NOT NULL
      AND m.round::text IN ('F','3rd_Place')
  ),
  place_pts AS (
    SELECT te.wrestler_id,
      CASE p.place WHEN 1 THEN 14.0 WHEN 2 THEN 10.0 WHEN 3 THEN 7.0 WHEN 4 THEN 6.0 ELSE 0.0 END AS pts,
      0 AS is_win
    FROM placements p
    JOIN pool_tournaments pt ON p.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = p.entry_id
    WHERE p.place IN (1,2,3,4) AND pt.name LIKE 'Boy_s Districts%'
  ),
  all_pts AS (
    SELECT wrestler_id, pts, is_win FROM win_pts WHERE pts > 0
    UNION ALL SELECT wrestler_id, pts, is_win FROM loss_pts WHERE pts > 0
    UNION ALL SELECT wrestler_id, pts, is_win FROM place_pts WHERE pts > 0
  ),
  totals AS (
    SELECT wrestler_id, ROUND(SUM(pts), 1) AS total_points, SUM(is_win)::integer AS win_count
    FROM all_pts GROUP BY wrestler_id
    HAVING SUM(is_win) >= 1
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    tot.total_points, tot.win_count
  FROM totals tot
  JOIN wrestlers wr ON wr.id = tot.wrestler_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = tot.wrestler_id
  LEFT JOIN schools s        ON s.id = sl.school_id
  ORDER BY tot.total_points DESC LIMIT 25
$function$;


-- =============================================================================
-- SECTION 51: top_active_schools
-- GROUP BY school_context_raw → GROUP BY school_id; JOIN schools
-- Return type changes: drops school_name text, adds school_id integer
-- =============================================================================

DROP FUNCTION IF EXISTS public.top_active_schools(gender_type, smallint, integer);
CREATE OR REPLACE FUNCTION public.top_active_schools(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint    DEFAULT 2,
  p_limit  integer     DEFAULT 20
)
RETURNS TABLE(
  school         text,
  school_id      integer,
  wrestler_count bigint
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH wrestler_max_level AS (
    SELECT te.wrestler_id, te.school_id,
      MAX(CASE t.tournament_type::text
        WHEN 'boys_state'   THEN 3 WHEN 'girls_state'   THEN 3
        WHEN 'regions'      THEN 2 WHEN 'girls_regions' THEN 2
        WHEN 'districts'    THEN 1 ELSE 0
      END) AS max_level
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
      AND t.season_id = p_season AND t.gender = p_gender
    WHERE te.school_id IS NOT NULL
    GROUP BY te.wrestler_id, te.school_id
  ),
  global_max AS (
    SELECT MAX(max_level) AS top_level FROM wrestler_max_level
  ),
  top_wrestlers AS (
    SELECT w.wrestler_id, w.school_id
    FROM wrestler_max_level w, global_max g
    WHERE w.max_level = g.top_level
  ),
  loss_counts AS (
    SELECT tw.wrestler_id, tw.school_id,
      COUNT(m.id) AS losses
    FROM top_wrestlers tw
    JOIN tournament_entries te ON te.wrestler_id = tw.wrestler_id AND te.school_id = tw.school_id
    LEFT JOIN matches m ON m.loser_entry_id = te.id
    GROUP BY tw.wrestler_id, tw.school_id
  ),
  school_counts AS (
    SELECT school_id, COUNT(*) AS cnt
    FROM loss_counts
    WHERE losses < 2
    GROUP BY school_id
  )
  SELECT s.display_name AS school, s.id AS school_id, sc.cnt AS wrestler_count
  FROM school_counts sc
  JOIN schools s ON s.id = sc.school_id
  ORDER BY sc.cnt DESC, s.display_name
  LIMIT p_limit;
$function$;
