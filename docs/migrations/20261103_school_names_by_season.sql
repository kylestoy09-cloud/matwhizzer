-- Every site function names a school for its season and gender (2026-11-03)
--
-- Girls co-ops have their own names ("Ramsey-Northern Highlands", "Jefferson-Sparta",
-- "Demarest-Old Tappan" ...), stored as school_season_names rows for the seasons each co-op
-- existed (scripts/fix_girls_coops_20261103.mts). These functions printed schools.display_name,
-- the school's own name, so the girls home leaderboard, mat-time, bonus, pin and team-point
-- leaders said "Ramsey", "Newton", "Jefferson". Each one now prints
-- school_display_name(school_id, season, gender): the season's name when there is one, else
-- the school's name. Boys names are unchanged (no boys season names except Lodi 2024-25).
-- Bodies are otherwise identical. Not changed: school_directory (already uses the girls/boys
-- program names), search_schools, get_coop_*, admin_region_seed_entries (admin), and the
-- no-season overloads (state_bonus_pct, state_mat_time, state_team_score).
-- Also drops the duplicate lb_gp_team_points(text, integer): two overloads made every call fail
-- ("could not choose the best candidate function"). The (text, smallint) version stays.
-- ROLLBACK: docs/migrations/backups/20261103_name_functions_before.sql

BEGIN;

DROP FUNCTION IF EXISTS public.lb_gp_team_points(text, integer);

-- district_bonus_pct(p_district integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_bonus_pct(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_wins integer, bonus_pct numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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

-- district_mat_time(p_district integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_mat_time(p_district integer, p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  JOIN schools   s  ON s.id  = agg.school_id
  ORDER BY total_seconds ASC LIMIT 8;
END;
$function$;

-- district_team_score(p_district integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_team_score(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT school_display_name(s.id, p_season, p_gender::text) AS school,
         school_display_name(s.id, p_season, p_gender::text) AS school_name,
         s.id           AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  JOIN schools s ON s.id = te.school_id
  WHERE te.tournament_id = v_tid
    AND te.school_id IS NOT NULL
  GROUP BY s.id, school_display_name(s.id, p_season, p_gender::text)
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;

-- district_wrestler_points(p_district integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_wrestler_points(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_points numeric, win_count integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    tot.total_points, tot.win_count
  FROM totals tot
  JOIN wrestlers wr   ON wr.id = tot.wrestler_id
  JOIN school_lookup sl ON sl.wrestler_id = tot.wrestler_id
  JOIN schools s      ON s.id  = sl.school_id
  ORDER BY tot.total_points DESC LIMIT 8
$function$;

-- girls_region_bonus_pct(p_region text, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_bonus_pct(p_region text, p_season smallint DEFAULT 1)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_wins integer, bonus_pct numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(100.0 * wins.bonus_wins / wins.total_wins, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  JOIN schools   s  ON s.id  = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 8;
END;
$function$;

-- girls_region_mat_time(p_region text, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_mat_time(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
    s.id           AS school_id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wrestler_id = agg.wid
  JOIN schools s      ON s.id  = sl.school_id
  ORDER BY total_seconds ASC LIMIT 8
$function$;

-- girls_region_mat_time(p_region integer, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_mat_time(p_region integer, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F'), school_display_name(s.id, p_season, 'F'), s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY total_seconds ASC LIMIT 8;
END;
$function$;

-- girls_region_team_pts(p_region text, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_team_pts(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, weight integer, team_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
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

-- girls_region_team_score(p_region text, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_team_score(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT school_display_name(s.id, p_season, 'F') AS school,
         school_display_name(s.id, p_season, 'F') AS school_name,
         s.id           AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, 'region_32')), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN schools s ON s.id = sl.school_id
  WHERE te.tournament_id = v_tid
  GROUP BY s.id, school_display_name(s.id, p_season, 'F')
  HAVING SUM(tw_wrestler_points(te.id, v_tid, 'region_32')) > 0
  ORDER BY total_points DESC;
END;
$function$;

-- lb_bonus_wins(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_bonus_wins(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, name text, school text, school_name text, school_id integer, bonus_count bigint, total_wins bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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
  GROUP BY w.id, w.first_name, w.last_name, s.id, school_display_name(s.id, p_season, p_gender::text)
  HAVING COUNT(*) FILTER (WHERE m.win_type IN ('FALL','TF','TF-1.5','MD')) > 0
  ORDER BY COUNT(*) FILTER (WHERE m.win_type IN ('FALL','TF','TF-1.5','MD')) DESC,
           COUNT(*) FILTER (WHERE m.win_type IS NOT NULL) DESC
  LIMIT 12
$function$;

-- lb_comebacks(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_comebacks(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, name text, school text, school_name text, school_id integer, consol_wins bigint, tournament_name text, weight integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
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

-- lb_fastest_pin(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_fastest_pin(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, name text, school text, school_name text, school_id integer, pin_count bigint, fastest_seconds numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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
  GROUP BY w.id, w.first_name, w.last_name, s.id, school_display_name(s.id, p_season, p_gender::text)
  ORDER BY MIN(m.fall_time_seconds) ASC LIMIT 12
$function$;

-- lb_gp_bonus_pct(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_bonus_pct(p_pool text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_wins integer, bonus_pct numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(100.0 * wins.bonus_wins / wins.total_wins, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 25;
END;
$function$;

-- lb_gp_fastest_pin(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_fastest_pin(p_pool text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, fall_time_seconds integer, weight integer, match_context text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
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

-- lb_gp_fastest_tf(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_fastest_tf(p_pool text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, fall_time_seconds integer, weight integer, match_context text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
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

-- lb_gp_mat_time(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_mat_time(p_pool text, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F'), school_display_name(s.id, p_season, 'F'), s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY total_seconds ASC LIMIT 25;
END;
$function$;

-- lb_gp_most_bonus(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_most_bonus(p_pool text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_matches integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    -- wins (a forfeit win is not a match)
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN bout_is_bonus(m.win_type::text) THEN 1 ELSE 0 END AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND NOT bout_no_match(m.win_type::text) AND NOT bout_is_forfeit(m.win_type::text)
    UNION ALL
    -- losses (forfeit losses count)
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      0 AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND NOT bout_no_match(m.win_type::text)
      AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wrestler_id, school_id,
      SUM(is_bonus)::integer AS bonus_wins,
      COUNT(*)::integer      AS total_matches
    FROM all_matches
    GROUP BY wrestler_id, school_id
    HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
    s.id           AS school_id,
    agg.bonus_wins, agg.total_matches
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wrestler_id
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY (agg.bonus_wins::numeric / agg.total_matches) DESC, agg.bonus_wins DESC
  LIMIT 25;
$function$;

-- lb_gp_most_pins(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_most_pins(p_pool text, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, pin_count integer, total_mat_time integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
    s.id           AS school_id,
    wins.pin_count, wins.total_mat_time
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY pin_count DESC, total_mat_time ASC LIMIT 25;
END;
$function$;

-- lb_gp_most_tf(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_most_tf(p_pool text, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, tf_count integer, total_mat_time integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
    s.id           AS school_id,
    wins.tf_count, wins.total_mat_time
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY tf_count DESC, total_mat_time ASC LIMIT 25;
END;
$function$;

-- lb_gp_team_points(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_team_points(p_pool text DEFAULT 'region'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT school_display_name(s.id, p_season, 'F') AS school,
         school_display_name(s.id, p_season, 'F') AS school_name,
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

-- lb_gp_wrestler_points(p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_gp_wrestler_points(p_pool text DEFAULT 'region'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_points numeric, win_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
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

-- lb_most_md(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_most_md(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, name text, school text, school_name text, school_id integer, md_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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
  GROUP BY w.id, w.first_name, w.last_name, s.id, school_display_name(s.id, p_season, p_gender::text)
  ORDER BY COUNT(*) DESC, w.last_name LIMIT 12
$function$;

-- lb_most_pins(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_most_pins(p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, name text, school text, school_name text, school_id integer, pin_count bigint, total_mat_time integer)
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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
  GROUP BY w.id, w.first_name, w.last_name, s.id, school_display_name(s.id, p_season, p_gender::text)
  ORDER BY COUNT(*) DESC, SUM(m.fall_time_seconds) ASC, w.last_name LIMIT 12
$function$;

-- lb_most_techfalls(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_most_techfalls(p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, name text, school text, school_name text, school_id integer, tf_count bigint, total_mat_time integer)
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT w.id,
    w.first_name || ' ' || w.last_name,
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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
  GROUP BY w.id, w.first_name, w.last_name, s.id, school_display_name(s.id, p_season, p_gender::text)
  ORDER BY COUNT(*) DESC, SUM(m.fall_time_seconds) ASC, w.last_name LIMIT 12
$function$;

-- lb_p_bonus_pct(p_gender gender_type, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_bonus_pct(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_wins integer, bonus_pct numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 25
$function$;

-- lb_p_fastest_pin(p_gender gender_type, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_fastest_pin(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, fall_time_seconds smallint, weight integer, match_context text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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

-- lb_p_fastest_tf(p_gender gender_type, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_fastest_tf(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, fall_time_seconds smallint, weight integer, match_context text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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

-- lb_p_mat_time(p_gender gender_type, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_mat_time(p_gender gender_type, p_pool text, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY total_seconds ASC LIMIT 25;
END;
$function$;

-- lb_p_most_bonus(p_gender gender_type, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_most_bonus(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_matches integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    -- wins (a forfeit win is not a match)
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN bout_is_bonus(m.win_type::text) THEN 1 ELSE 0 END AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND NOT bout_no_match(m.win_type::text) AND NOT bout_is_forfeit(m.win_type::text)
    UNION ALL
    -- losses (forfeit losses count)
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      0 AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND NOT bout_no_match(m.win_type::text)
      AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wrestler_id, school_id,
      SUM(is_bonus)::integer  AS bonus_wins,
      COUNT(*)::integer        AS total_matches
    FROM all_matches
    GROUP BY wrestler_id, school_id
    HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    agg.bonus_wins,
    agg.total_matches
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wrestler_id
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY (agg.bonus_wins::numeric / agg.total_matches) DESC, agg.bonus_wins DESC
  LIMIT 25;
$function$;

-- lb_p_most_pins(p_gender text, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_most_pins(p_gender text, p_pool text, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, pin_count integer, total_mat_time integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    wins.pin_count, wins.total_mat_time
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY pin_count DESC, total_mat_time ASC LIMIT 25;
END;
$function$;

-- lb_p_most_tf(p_gender text, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_most_tf(p_gender text, p_pool text, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, tf_count integer, total_mat_time integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    wins.tf_count, wins.total_mat_time
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  LEFT JOIN schools s ON s.id = wins.school_id
  ORDER BY tf_count DESC, total_mat_time ASC LIMIT 25;
END;
$function$;

-- lb_p_team_points(p_gender gender_type, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_team_points(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT school_display_name(s.id, p_season, p_gender::text) AS school,
         school_display_name(s.id, p_season, p_gender::text) AS school_name,
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

-- lb_p_wrestler_points(p_gender gender_type, p_pool text, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_p_wrestler_points(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_points numeric, win_count integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    tot.total_points, tot.win_count
  FROM totals tot
  JOIN wrestlers wr ON wr.id = tot.wrestler_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = tot.wrestler_id
  LEFT JOIN schools s        ON s.id = sl.school_id
  ORDER BY tot.total_points DESC LIMIT 25
$function$;

-- lb_revenge_matches(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_revenge_matches(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(avenger_id uuid, avenger_name text, avenger_school text, avenger_school_name text, avenger_school_id integer, opponent_id uuid, opponent_name text, opponent_school text, opponent_school_id integer, weight integer, revenge_round text, revenge_win_type text, region text, district_round text, district_loss_type text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s1.id, p_season, p_gender::text) AS avenger_school,
    school_display_name(s1.id, p_season, p_gender::text) AS avenger_school_name,
    s1.id           AS avenger_school_id,
    w2.id AS opponent_id,
    TRIM(COALESCE(w2.first_name,'') || ' ' || COALESCE(w2.last_name,'')) AS opponent_name,
    school_display_name(s2.id, p_season, p_gender::text) AS opponent_school,
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

-- lb_rs_individual_stats(p_season_id integer, p_gender text)
CREATE OR REPLACE FUNCTION public.lb_rs_individual_stats(p_season_id integer, p_gender text)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school_id integer, school_name text, section text, classification text, athletic_conference text, logo_url text, color_primary text, pin_count bigint, fastest_pin integer, fastest_pin_wt integer, pin_total_time bigint, tf_count bigint, fastest_tf integer, fastest_tf_wt integer, tf_total_time bigint, bonus_wins bigint, contested_matches bigint, total_matches bigint, hammer_score numeric, weight_class integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
WITH season_label AS (
  SELECT label FROM seasons WHERE id = p_season_id
),
bouts AS (
  -- boys duals
  SELECT dmm.wrestler_a_id AS wid, dmm.wrestler_a_name_raw AS wname, dmm.school_a_id AS sid,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id) AS won,
    dmm.result_type, dmm.fall_time_seconds::int AS fall_time_seconds, dmm.is_forfeit_win, dmm.weight_class::int
  FROM dual_meet_matches dmm JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'M' AND dm.season_id = p_season_id AND dm.gender = 'M'
    AND NOT dmm.is_double_forfeit AND dmm.wrestler_a_id IS NOT NULL
  UNION ALL
  SELECT dmm.wrestler_b_id, dmm.wrestler_b_name_raw, dmm.school_b_id,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_b_id),
    dmm.result_type, dmm.fall_time_seconds::int AS fall_time_seconds, dmm.is_forfeit_win, dmm.weight_class::int
  FROM dual_meet_matches dmm JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'M' AND dm.season_id = p_season_id AND dm.gender = 'M'
    AND NOT dmm.is_double_forfeit AND dmm.wrestler_b_id IS NOT NULL
  UNION ALL
  -- girls duals
  SELECT dmm.wrestler_a_id, dmm.wrestler_a_name_raw, dmm.school_a_id,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id),
    dmm.result_type, dmm.fall_time_seconds::int AS fall_time_seconds, dmm.is_forfeit_win, dmm.weight_class::int
  FROM dual_meet_matches_girls dmm JOIN dual_meets_girls dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'F' AND dm.season_id = p_season_id
    AND NOT dmm.is_double_forfeit AND dmm.wrestler_a_id IS NOT NULL
  UNION ALL
  SELECT dmm.wrestler_b_id, dmm.wrestler_b_name_raw, dmm.school_b_id,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_b_id),
    dmm.result_type, dmm.fall_time_seconds::int AS fall_time_seconds, dmm.is_forfeit_win, dmm.weight_class::int
  FROM dual_meet_matches_girls dmm JOIN dual_meets_girls dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'F' AND dm.season_id = p_season_id
    AND NOT dmm.is_double_forfeit AND dmm.wrestler_b_id IS NOT NULL
  UNION ALL
  -- boys in-season tournaments
  SELECT tb.wrestler1_id, tb.wrestler1_name_raw, tb.wrestler1_school_id, (tb.winner = 1),
    tb.result_type, tb.fall_time_seconds::int, false, tb.weight_class::int
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  JOIN wrestlers w ON w.id = tb.wrestler1_id
  WHERE p_gender = 'M' AND ist.season = (SELECT label FROM season_label) AND w.gender::text = 'M'
    AND tb.wrestler1_school_id IS NOT NULL
  UNION ALL
  SELECT tb.wrestler2_id, tb.wrestler2_name_raw, tb.wrestler2_school_id, (tb.winner = 2),
    tb.result_type, tb.fall_time_seconds::int, false, tb.weight_class::int
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  JOIN wrestlers w ON w.id = tb.wrestler2_id
  WHERE p_gender = 'M' AND ist.season = (SELECT label FROM season_label) AND w.gender::text = 'M'
    AND tb.wrestler2_school_id IS NOT NULL
  UNION ALL
  -- girls in-season tournaments
  SELECT tb.wrestler1_id, tb.wrestler1_name_raw, tb.wrestler1_school_id, (tb.winner = 1),
    tb.result_type, tb.fall_time_seconds::int, false, tb.weight_class::int
  FROM tournament_bouts_girls tb
  JOIN in_season_tournaments_girls ist ON ist.id = tb.in_season_tournament_id
  WHERE p_gender = 'F' AND ist.season = (SELECT label FROM season_label)
    AND tb.wrestler1_id IS NOT NULL AND tb.wrestler1_school_id IS NOT NULL
  UNION ALL
  SELECT tb.wrestler2_id, tb.wrestler2_name_raw, tb.wrestler2_school_id, (tb.winner = 2),
    tb.result_type, tb.fall_time_seconds::int, false, tb.weight_class::int
  FROM tournament_bouts_girls tb
  JOIN in_season_tournaments_girls ist ON ist.id = tb.in_season_tournament_id
  WHERE p_gender = 'F' AND ist.season = (SELECT label FROM season_label)
    AND tb.wrestler2_id IS NOT NULL AND tb.wrestler2_school_id IS NOT NULL
),
raw AS (
  SELECT b.*, (b.is_forfeit_win OR bout_is_forfeit(b.result_type)) AS is_forfeit
  FROM bouts b
  WHERE NOT bout_no_match(b.result_type)
),

pin_wt AS (
  SELECT DISTINCT ON (wid)
    wid, weight_class AS fastest_pin_wt
  FROM raw
  WHERE won AND result_type = 'Fall' AND NOT is_forfeit AND fall_time_seconds IS NOT NULL
  ORDER BY wid, fall_time_seconds ASC
),

tf_wt AS (
  SELECT DISTINCT ON (wid)
    wid, weight_class AS fastest_tf_wt
  FROM raw
  WHERE won AND result_type IN ('TF','TF-1.5') AND NOT is_forfeit AND fall_time_seconds IS NOT NULL
  ORDER BY wid,
    CASE WHEN fall_time_seconds < 8 THEN 360 ELSE fall_time_seconds END ASC
),

agg AS (
  SELECT
    r.wid,
    MAX(r.wname)                                                                                  AS wname,
    r.sid,
    COUNT(1) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit)                AS pin_count,
    MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit) AS fastest_pin,
    COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit), 0)::bigint
                                                                                                  AS pin_total_time,
    COUNT(1) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit)      AS tf_count,
    MIN(CASE WHEN r.fall_time_seconds IS NOT NULL AND r.fall_time_seconds < 8 THEN 360 ELSE r.fall_time_seconds END)
      FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit AND r.fall_time_seconds IS NOT NULL)
                                                                                                  AS fastest_tf,
    COALESCE(SUM(CASE WHEN r.fall_time_seconds IS NOT NULL AND r.fall_time_seconds < 8 THEN 360 ELSE r.fall_time_seconds END)
      FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit), 0)::bigint AS tf_total_time,
    COUNT(1) FILTER (WHERE r.won AND bout_is_bonus(r.result_type) AND NOT r.is_forfeit)          AS bonus_wins,
    COUNT(1) FILTER (WHERE NOT r.is_forfeit)                                                      AS contested_matches,
    -- forfeit wins aren't matches; forfeit losses are
    COUNT(1) FILTER (WHERE NOT (r.won AND r.is_forfeit))                                          AS total_matches,
    MODE() WITHIN GROUP (ORDER BY r.weight_class)                                                 AS primary_weight_class
  FROM raw r
  GROUP BY r.wid, r.sid
  HAVING
    COUNT(1) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit) > 0
    OR COUNT(1) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit) > 0
    OR COUNT(1) FILTER (WHERE NOT (r.won AND r.is_forfeit)) >= 5
)

SELECT
  a.wid               AS wrestler_id,
  a.wname             AS wrestler_name,
  s.id                AS school_id,
  school_display_name(s.id, p_season_id, p_gender::text)      AS school_name,
  s.section,
  s.classification,
  s.athletic_conference,
  s.logo_url,
  s.color_primary,
  a.pin_count,
  a.fastest_pin,
  pw.fastest_pin_wt,
  a.pin_total_time,
  a.tf_count,
  a.fastest_tf,
  tw.fastest_tf_wt,
  a.tf_total_time,
  a.bonus_wins,
  a.contested_matches,
  a.total_matches,
  whs.hammer_score,
  a.primary_weight_class AS weight_class
FROM agg a
JOIN schools s ON s.id = a.sid AND s.is_nj = true
LEFT JOIN pin_wt pw ON pw.wid = a.wid
LEFT JOIN tf_wt  tw ON tw.wid = a.wid
LEFT JOIN wrestler_hammer_scores whs
  ON whs.wrestler_id = a.wid
  AND whs.season = (SELECT label FROM season_label)
$function$;

-- lb_rs_team_stats(p_season_id integer, p_gender text)
CREATE OR REPLACE FUNCTION public.lb_rs_team_stats(p_season_id integer, p_gender text)
 RETURNS TABLE(school_id integer, school_name text, section text, classification text, athletic_conference text, logo_url text, color_primary text, dual_pin_count bigint, tournament_pin_count bigint, pin_count bigint, fastest_pin integer, pin_total_time bigint, dual_tf_count bigint, tournament_tf_count bigint, tf_count bigint, fastest_tf integer, tf_total_time bigint, dual_bonus_wins bigint, tournament_bonus_wins bigint, bonus_wins bigint, contested_matches bigint, total_matches bigint, dual_meet_count bigint, dual_team_points bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
WITH season_label AS (
  SELECT label FROM seasons WHERE id = p_season_id
),
bouts AS (
  -- boys duals
  SELECT dmm.school_a_id AS sid, (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id) AS won,
    dmm.result_type, dmm.fall_time_seconds::int AS fall_time_seconds, dmm.is_forfeit_win, true AS is_dual, dmm.dual_meet_id
  FROM dual_meet_matches dmm JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'M' AND dm.season_id = p_season_id AND dm.gender = 'M'
    AND NOT dmm.is_double_forfeit AND dmm.school_a_id IS NOT NULL AND dmm.wrestler_a_id IS NOT NULL
  UNION ALL
  SELECT dmm.school_b_id, (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_b_id),
    dmm.result_type, dmm.fall_time_seconds::int AS fall_time_seconds, dmm.is_forfeit_win, true, dmm.dual_meet_id
  FROM dual_meet_matches dmm JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'M' AND dm.season_id = p_season_id AND dm.gender = 'M'
    AND NOT dmm.is_double_forfeit AND dmm.school_b_id IS NOT NULL AND dmm.wrestler_b_id IS NOT NULL
  UNION ALL
  -- girls duals
  SELECT dmm.school_a_id, (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id),
    dmm.result_type, dmm.fall_time_seconds::int AS fall_time_seconds, dmm.is_forfeit_win, true, dmm.dual_meet_id
  FROM dual_meet_matches_girls dmm JOIN dual_meets_girls dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'F' AND dm.season_id = p_season_id
    AND NOT dmm.is_double_forfeit AND dmm.school_a_id IS NOT NULL AND dmm.wrestler_a_id IS NOT NULL
  UNION ALL
  SELECT dmm.school_b_id, (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_b_id),
    dmm.result_type, dmm.fall_time_seconds::int AS fall_time_seconds, dmm.is_forfeit_win, true, dmm.dual_meet_id
  FROM dual_meet_matches_girls dmm JOIN dual_meets_girls dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'F' AND dm.season_id = p_season_id
    AND NOT dmm.is_double_forfeit AND dmm.school_b_id IS NOT NULL AND dmm.wrestler_b_id IS NOT NULL
  UNION ALL
  -- boys in-season tournaments
  SELECT tb.wrestler1_school_id, (tb.winner = 1), tb.result_type, tb.fall_time_seconds::int, false, false, NULL::uuid
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  JOIN wrestlers w ON w.id = tb.wrestler1_id
  WHERE p_gender = 'M' AND ist.season = (SELECT label FROM season_label) AND w.gender::text = 'M'
    AND tb.wrestler1_school_id IS NOT NULL
  UNION ALL
  SELECT tb.wrestler2_school_id, (tb.winner = 2), tb.result_type, tb.fall_time_seconds::int, false, false, NULL::uuid
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  JOIN wrestlers w ON w.id = tb.wrestler2_id
  WHERE p_gender = 'M' AND ist.season = (SELECT label FROM season_label) AND w.gender::text = 'M'
    AND tb.wrestler2_school_id IS NOT NULL
  UNION ALL
  -- girls in-season tournaments
  SELECT tb.wrestler1_school_id, (tb.winner = 1), tb.result_type, tb.fall_time_seconds::int, false, false, NULL::uuid
  FROM tournament_bouts_girls tb
  JOIN in_season_tournaments_girls ist ON ist.id = tb.in_season_tournament_id
  WHERE p_gender = 'F' AND ist.season = (SELECT label FROM season_label)
    AND tb.wrestler1_id IS NOT NULL AND tb.wrestler1_school_id IS NOT NULL
  UNION ALL
  SELECT tb.wrestler2_school_id, (tb.winner = 2), tb.result_type, tb.fall_time_seconds::int, false, false, NULL::uuid
  FROM tournament_bouts_girls tb
  JOIN in_season_tournaments_girls ist ON ist.id = tb.in_season_tournament_id
  WHERE p_gender = 'F' AND ist.season = (SELECT label FROM season_label)
    AND tb.wrestler2_id IS NOT NULL AND tb.wrestler2_school_id IS NOT NULL
),
raw AS (
  SELECT b.*, (b.is_forfeit_win OR bout_is_forfeit(b.result_type)) AS is_forfeit
  FROM bouts b
  WHERE NOT bout_no_match(b.result_type)
)

SELECT
  s.id                  AS school_id,
  school_display_name(s.id, p_season_id, p_gender::text)        AS school_name,
  s.section,
  s.classification,
  s.athletic_conference,
  s.logo_url,
  s.color_primary,

  COUNT(*) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit AND r.is_dual)     AS dual_pin_count,
  COUNT(*) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit AND NOT r.is_dual) AS tournament_pin_count,
  COUNT(*) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit)                   AS pin_count,
  MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit)   AS fastest_pin,
  COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit), 0)::bigint
                                                                                                  AS pin_total_time,

  COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit AND r.is_dual)     AS dual_tf_count,
  COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit AND NOT r.is_dual) AS tournament_tf_count,
  COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit)                   AS tf_count,
  MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit)   AS fastest_tf,
  COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit), 0)::bigint
                                                                                                  AS tf_total_time,

  COUNT(*) FILTER (WHERE r.won AND bout_is_bonus(r.result_type) AND NOT r.is_forfeit AND r.is_dual)     AS dual_bonus_wins,
  COUNT(*) FILTER (WHERE r.won AND bout_is_bonus(r.result_type) AND NOT r.is_forfeit AND NOT r.is_dual) AS tournament_bonus_wins,
  COUNT(*) FILTER (WHERE r.won AND bout_is_bonus(r.result_type) AND NOT r.is_forfeit)                   AS bonus_wins,

  COUNT(*) FILTER (WHERE NOT r.is_forfeit)                                AS contested_matches,
  -- forfeit wins aren't matches; forfeit losses are
  COUNT(*) FILTER (WHERE NOT (r.won AND r.is_forfeit))                    AS total_matches,

  COUNT(DISTINCT r.dual_meet_id) FILTER (WHERE r.is_dual)                 AS dual_meet_count,

  COALESCE(SUM(
    CASE
      WHEN NOT r.is_dual OR NOT r.won THEN 0
      WHEN r.is_forfeit THEN 6
      ELSE CASE r.result_type
        WHEN 'Fall'    THEN 6
        WHEN 'TF'      THEN 5
        WHEN 'TF-1.5'  THEN 5
        WHEN 'MD'      THEN 4
        WHEN 'DEC'     THEN 3
        WHEN 'Dec'     THEN 3
        WHEN 'OT Dec'  THEN 3
        ELSE 0
      END
    END
  ), 0)::bigint                                                            AS dual_team_points

FROM raw r
JOIN schools s ON s.id = r.sid AND s.is_nj = true
GROUP BY s.id, school_display_name(s.id, p_season_id, p_gender::text), s.section, s.classification, s.athletic_conference, s.logo_url, s.color_primary
$function$;

-- lb_school_depth(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_school_depth(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_id integer, weight_classes_placed bigint, wrestlers bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT school_display_name(s.id, p_season, p_gender::text) AS school, s.id AS school_id,
    sc.weight_cnt, sc.cnt
  FROM school_counts sc
  JOIN schools s ON s.id = sc.school_id
  ORDER BY sc.cnt DESC, school_display_name(s.id, p_season, p_gender::text)
  LIMIT 25
$function$;

-- lb_team_points(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_team_points(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT school_display_name(s.id, p_season, p_gender::text) AS school,
         school_display_name(s.id, p_season, p_gender::text) AS school_name,
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
  GROUP BY s.id, school_display_name(s.id, p_season, p_gender::text)
  ORDER BY total_points DESC
  LIMIT 12
$function$;

-- lb_technical_masters(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_technical_masters(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, weight integer, tech_fall_wins bigint, avg_tf_time_seconds numeric, fastest_tf_seconds integer, avg_tf_time_display text, fastest_tf_display text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
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

-- lb_win_pct(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.lb_win_pct(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, name text, school text, school_name text, school_id integer, wins bigint, total bigint, win_pct numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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
  GROUP BY w.id, w.first_name, w.last_name, s.id, school_display_name(s.id, p_season, p_gender::text)
  HAVING COUNT(*) >= 5
  ORDER BY COUNT(*) FILTER (WHERE am.is_win)::numeric / COUNT(*) DESC,
           COUNT(*) FILTER (WHERE am.is_win) DESC
  LIMIT 12
$function$;

-- region_bonus_pct(p_region integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_bonus_pct(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_wins integer, bonus_pct numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr ON wr.id = wins.wrestler_id
  JOIN schools   s  ON s.id  = wins.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 8
$function$;

-- region_mat_time(p_region integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_mat_time(p_region integer, p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
    agg.total_secs, agg.mcnt
  FROM agg
  JOIN wrestlers w    ON w.id   = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.total_secs ASC LIMIT 8;
END;
$function$;

-- region_postseason_pts(p_region integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_postseason_pts(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, weight integer, district_pts numeric, region_pts numeric, team_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
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

-- region_team_pts(p_region integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_team_pts(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, weight integer, team_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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

-- region_team_score(p_region integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_team_score(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT school_display_name(s.id, p_season, p_gender::text) AS school,
         school_display_name(s.id, p_season, p_gender::text) AS school_name,
         s.id           AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN schools s ON s.id = sl.school_id
  WHERE te.tournament_id = v_tid
  GROUP BY s.id, school_display_name(s.id, p_season, p_gender::text)
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;

-- state_bonus_pct(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.state_bonus_pct(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_wins integer, bonus_pct numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    wins.bonus_wins, wins.total_wins,
    ROUND(wins.bonus_wins::numeric / NULLIF(wins.total_wins, 0) * 100, 1) AS bonus_pct
  FROM wins
  JOIN wrestlers wr   ON wr.id = wins.wrestler_id
  JOIN school_lookup sl ON sl.wrestler_id = wins.wrestler_id
  JOIN schools s       ON s.id = sl.school_id
  ORDER BY bonus_pct DESC, bonus_wins DESC LIMIT 8
$function$;

-- state_mat_time(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.state_mat_time(p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.total_seconds ASC LIMIT 8;
END;
$function$;

-- state_team_pts(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.state_team_pts(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, weight integer, team_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
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

-- state_team_score(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.state_team_score(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT school_display_name(s.id, p_season, p_gender::text) AS school,
         school_display_name(s.id, p_season, p_gender::text) AS school_name,
         s.id           AS school_id,
         ROUND(SUM(tw_wrestler_points(te.id, v_tid, v_level)), 1) AS total_points
  FROM tournament_entries te
  JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  JOIN schools s ON s.id = sl.school_id
  WHERE te.tournament_id = v_tid
  GROUP BY s.id, school_display_name(s.id, p_season, p_gender::text)
  HAVING SUM(tw_wrestler_points(te.id, v_tid, v_level)) > 0
  ORDER BY total_points DESC;
END;
$function$;

-- top_active_schools(p_gender gender_type, p_season smallint, p_limit integer)
CREATE OR REPLACE FUNCTION public.top_active_schools(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2, p_limit integer DEFAULT 20)
 RETURNS TABLE(school text, school_id integer, wrestler_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT school_display_name(s.id, p_season, p_gender::text) AS school, s.id AS school_id, sc.cnt AS wrestler_count
  FROM school_counts sc
  JOIN schools s ON s.id = sc.school_id
  ORDER BY sc.cnt DESC, school_display_name(s.id, p_season, p_gender::text)
  LIMIT p_limit;
$function$;

-- top_district_team_scores(p_gender character, p_season smallint, p_limit integer)
CREATE OR REPLACE FUNCTION public.top_district_team_scores(p_gender character DEFAULT 'M'::bpchar, p_season smallint DEFAULT 1, p_limit integer DEFAULT 24)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, district integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH district_teams AS (
    SELECT school_display_name(s.id, p_season, p_gender::text)                          AS school_name,
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
    GROUP BY s.id, school_display_name(s.id, p_season, p_gender::text), t.name
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

-- top_postseason_team_scores(p_gender gender_type, p_season smallint, p_limit integer)
CREATE OR REPLACE FUNCTION public.top_postseason_team_scores(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2, p_limit integer DEFAULT 25)
 RETURNS TABLE(school text, school_name text, school_id integer, district_points numeric, region_points numeric, state_points numeric, total_points numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH districts AS (
    SELECT pts.school_id,                          -- was: pts.school_name
           SUM(pts.total_points) AS district_pts
    FROM   precomputed_team_scores pts
    JOIN   tournaments t ON t.id = pts.tournament_id
    WHERE  t.tournament_type = 'districts'         -- preserved from live body
      AND  t.gender          = p_gender            -- preserved from live body
      AND  t.season_id       = p_season            -- preserved from live body
      AND  pts.school_id IS NOT NULL               -- guard: NULL rows excluded (currently 0)
    GROUP  BY pts.school_id                        -- was: pts.school_name
  ),
  regions AS (
    SELECT pts.school_id,                          -- was: pts.school_name
           SUM(pts.total_points) AS region_pts
    FROM   precomputed_team_scores pts
    JOIN   tournaments t ON t.id = pts.tournament_id
    WHERE  t.tournament_type IN ('regions', 'girls_regions')  -- preserved
      AND  t.gender           = p_gender           -- preserved
      AND  t.season_id        = p_season           -- preserved
      AND  pts.school_id IS NOT NULL
    GROUP  BY pts.school_id                        -- was: pts.school_name
  ),
  state AS (
    SELECT pts.school_id,                          -- was: pts.school_name
           SUM(pts.total_points) AS state_pts
    FROM   precomputed_team_scores pts
    JOIN   tournaments t ON t.id = pts.tournament_id
    WHERE  t.tournament_type IN ('boys_state', 'girls_state')  -- preserved
      AND  t.gender           = p_gender           -- preserved
      AND  t.season_id        = p_season           -- preserved
      AND  pts.school_id IS NOT NULL
    GROUP  BY pts.school_id                        -- was: pts.school_name
  ),
  combined AS (
    SELECT COALESCE(d.school_id, r.school_id, s.school_id) AS school_id,
           COALESCE(d.district_pts, 0)                      AS district_points,
           COALESCE(r.region_pts,   0)                      AS region_points,
           COALESCE(s.state_pts,    0)                      AS state_points,
           COALESCE(d.district_pts, 0)
             + COALESCE(r.region_pts, 0)
             + COALESCE(s.state_pts,  0)                    AS total_points
    FROM            districts d
    FULL OUTER JOIN regions   r ON r.school_id = d.school_id  -- was: school_name
    FULL OUTER JOIN state     s ON s.school_id = COALESCE(d.school_id, r.school_id)
  )
  SELECT sch.id::text     AS school,
         school_display_name(sch.id, p_season, p_gender::text) AS school_name,          -- canonical, never NULL
         sch.id           AS school_id,            -- never NULL
         c.district_points,
         c.region_points,
         c.state_points,
         c.total_points
  FROM   combined c
  JOIN   schools sch ON sch.id = c.school_id       -- was: LEFT JOIN ON display_name
  ORDER  BY c.total_points DESC
  LIMIT  p_limit;
END;
$function$;

COMMIT;
