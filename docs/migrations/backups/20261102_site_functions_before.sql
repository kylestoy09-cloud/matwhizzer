-- Site function definitions as of 2026-11-02, before 20261102_site_school_ids.sql (pg_get_functiondef output).
-- ROLLBACK: drop the new versions, then run this file in the SQL editor.

-- bracket_buster_detail(p_gender gender_type, p_season smallint, p_tournament_type text, p_region integer, p_district integer, p_limit integer)
CREATE OR REPLACE FUNCTION public.bracket_buster_detail(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2, p_tournament_type text DEFAULT 'all'::text, p_region integer DEFAULT NULL::integer, p_district integer DEFAULT NULL::integer, p_limit integer DEFAULT 25)
 RETURNS TABLE(winner_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed smallint, loser_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed smallint, seed_gap smallint, win_type text, weight integer, round text, tournament_name text, tournament_label text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    te_w.wrestler_id,
    TRIM(COALESCE(ww.first_name,'') || ' ' || COALESCE(ww.last_name,''))::text,
    te_w.school_context_raw::text,
    COALESCE(sn_w.school_name, te_w.school_context_raw)::text,
    te_w.seed,
    te_l.wrestler_id,
    TRIM(COALESCE(wl.first_name,'') || ' ' || COALESCE(wl.last_name,''))::text,
    te_l.school_context_raw::text,
    COALESCE(sn_l.school_name, te_l.school_context_raw)::text,
    te_l.seed,
    (te_w.seed - te_l.seed)::smallint,
    m.win_type::text,
    wc.weight::integer,
    m.round::text,
    t.name::text,
    CASE t.tournament_type
      WHEN 'districts'::tournament_type THEN
        'District ' || regexp_replace(t.name, '^.*District ', '')
      WHEN 'regions'::tournament_type THEN
        'Region ' || regexp_replace(t.name, '^.*r', '')
      WHEN 'girls_regions'::tournament_type THEN
        'Region ' || regexp_replace(t.name, '^.*r', '')
      WHEN 'boys_state'::tournament_type THEN 'State'
      WHEN 'girls_state'::tournament_type THEN 'State'
      ELSE t.name
    END::text
  FROM matches m
  JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  JOIN wrestlers ww ON ww.id = te_w.wrestler_id
  JOIN wrestlers wl ON wl.id = te_l.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  JOIN tournaments t ON t.id = m.tournament_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation = te_w.school_context_raw
  LEFT JOIN school_names sn_l ON sn_l.abbreviation = te_l.school_context_raw
  WHERE te_w.seed > te_l.seed
    AND te_w.seed IS NOT NULL
    AND te_l.seed IS NOT NULL
    AND m.winner_entry_id IS NOT NULL
    AND m.loser_entry_id IS NOT NULL
    AND m.win_type IS NOT NULL
    AND m.win_type IN (
      'FALL'::win_type, 'TF'::win_type, 'TF-1'::win_type, 'TF-1.5'::win_type,
      'DEC'::win_type, 'MD'::win_type, '2-OT'::win_type, 'UTB'::win_type,
      'SV-1'::win_type, 'TB-1'::win_type, 'TB-2'::win_type
    )
    AND m.win_type NOT IN (
      'DQ'::win_type, 'FORF'::win_type, 'INJ'::win_type, 'BYE'::win_type
    )
    AND m.bracket_side = 'championship'::bracket_side
    AND t.season_id = p_season
    AND t.gender = p_gender
    AND m.validated = true
    AND (
      p_tournament_type = 'all'
      OR (p_tournament_type = 'districts' AND t.tournament_type IN ('districts'::tournament_type))
      OR (p_tournament_type = 'regions' AND t.tournament_type IN ('regions'::tournament_type, 'girls_regions'::tournament_type))
      OR (p_tournament_type = 'state' AND t.tournament_type IN ('boys_state'::tournament_type, 'girls_state'::tournament_type))
    )
    AND (
      p_region IS NULL
      OR t.name LIKE '%r' || p_region
    )
    AND (
      p_district IS NULL
      OR t.name LIKE '%District ' || p_district
    )
  ORDER BY
    (te_w.seed - te_l.seed) DESC,
    te_l.seed ASC,
    CASE m.round
      WHEN 'F' THEN 1
      WHEN 'SF' THEN 2
      WHEN 'QF' THEN 3
      ELSE 4
    END ASC
  LIMIT p_limit;
END;
$function$;

-- district_bracket(p_district integer, p_weight integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_bracket(p_district integer, p_weight integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(match_id uuid, round text, bracket_side text, win_type text, winner_score smallint, loser_score smallint, fall_time_seconds smallint, winner_entry_id uuid, winner_wrestler_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed smallint, winner_grade text, loser_entry_id uuid, loser_wrestler_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed smallint, loser_grade text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    m.id                                      AS match_id,
    m.round::text,
    m.bracket_side::text,
    m.win_type::text,
    m.winner_score,
    m.loser_score,
    m.fall_time_seconds,
    -- Winner
    te_w.id                                   AS winner_entry_id,
    te_w.wrestler_id                          AS winner_wrestler_id,
    COALESCE(wr_w.first_name || ' ' || wr_w.last_name, '') AS winner_name,
    te_w.school_context_raw                   AS winner_school,
    COALESCE(sn_w.school_name, te_w.school_context_raw, '') AS winner_school_name,
    te_w.seed                                 AS winner_seed,
    te_w.grade_label::text                    AS winner_grade,
    -- Loser (NULL for bye wins)
    te_l.id                                   AS loser_entry_id,
    te_l.wrestler_id                          AS loser_wrestler_id,
    CASE WHEN te_l.id IS NULL THEN NULL
         ELSE COALESCE(wr_l.first_name || ' ' || wr_l.last_name, '')
    END                                       AS loser_name,
    te_l.school_context_raw                   AS loser_school,
    COALESCE(sn_l.school_name, te_l.school_context_raw, '') AS loser_school_name,
    te_l.seed                                 AS loser_seed,
    te_l.grade_label::text                    AS loser_grade
  FROM matches m
  JOIN tournaments t   ON t.id  = m.tournament_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  LEFT JOIN wrestlers wr_w          ON wr_w.id = te_w.wrestler_id
  LEFT JOIN school_names sn_w       ON sn_w.abbreviation = te_w.school_context_raw
  LEFT JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  LEFT JOIN wrestlers wr_l          ON wr_l.id = te_l.wrestler_id
  LEFT JOIN school_names sn_l       ON sn_l.abbreviation = te_l.school_context_raw
  WHERE t.name   = (CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district::text)
    AND wc.weight = p_weight
    AND m.validated = true
    AND t.gender   = p_gender
    AND t.season_id = p_season
  ORDER BY m.bracket_side, m.round::text
$function$;

-- district_fastest_pin(p_district integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_fastest_pin(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
                 || ' Districts District ' || p_district
    AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    te.school_context_raw AS school, sn.school_name,
    m.fall_time_seconds, wc.weight
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.validated = true AND m.win_type = 'FALL'::win_type AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8
$function$;

-- district_fastest_tf(p_district integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_fastest_tf(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
                 || ' Districts District ' || p_district
    AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    te.school_context_raw AS school, sn.school_name,
    m.fall_time_seconds, wc.weight
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.validated = true AND m.win_type::text LIKE 'TF%%' AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8
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
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  JOIN schools   s  ON s.id  = agg.school_id
  ORDER BY total_seconds ASC LIMIT 8;
END;
$function$;

-- district_placements(p_district integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_placements(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district::text
      AND gender = p_gender AND season_id = p_season
  )
  -- 1st: championship finals winner
  SELECT wc.weight::int, 1,
    te_w.wrestler_id,
    TRIM(COALESCE(wr_w.first_name, '') || ' ' || COALESCE(wr_w.last_name, '')),
    te_w.school_context_raw,
    COALESCE(sn_w.school_name, te_w.school_context_raw, '')
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id = te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation = te_w.school_context_raw
  WHERE m.round = 'F' AND m.bracket_side = 'championship' AND m.validated = true
    AND te_w.wrestler_id IS NOT NULL
  UNION ALL
  -- 2nd: championship finals loser
  SELECT wc.weight::int, 2,
    te_l.wrestler_id,
    TRIM(COALESCE(wr_l.first_name, '') || ' ' || COALESCE(wr_l.last_name, '')),
    te_l.school_context_raw,
    COALESCE(sn_l.school_name, te_l.school_context_raw, '')
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id = te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation = te_l.school_context_raw
  WHERE m.round = 'F' AND m.bracket_side = 'championship' AND m.validated = true
    AND te_l.wrestler_id IS NOT NULL
  UNION ALL
  -- 3rd: 3rd place match winner
  SELECT wc.weight::int, 3,
    te_w.wrestler_id,
    TRIM(COALESCE(wr_w.first_name, '') || ' ' || COALESCE(wr_w.last_name, '')),
    te_w.school_context_raw,
    COALESCE(sn_w.school_name, te_w.school_context_raw, '')
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id = te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation = te_w.school_context_raw
  WHERE m.round = '3rd_Place' AND m.validated = true
    AND te_w.wrestler_id IS NOT NULL
  UNION ALL
  -- 4th: 3rd place match loser
  SELECT wc.weight::int, 4,
    te_l.wrestler_id,
    TRIM(COALESCE(wr_l.first_name, '') || ' ' || COALESCE(wr_l.last_name, '')),
    te_l.school_context_raw,
    COALESCE(sn_l.school_name, te_l.school_context_raw, '')
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id = te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation = te_l.school_context_raw
  WHERE m.round = '3rd_Place' AND m.validated = true
    AND te_l.wrestler_id IS NOT NULL
  ORDER BY 1, 2;
$function$;

-- district_schools(p_district smallint, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_schools(p_district smallint, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(school text, school_name text, school_id integer)
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT school, school_name, school_id
    FROM (
      SELECT DISTINCT
        te.school_context_raw  AS school,
        sn.school_name         AS school_name,
        sn.school_id           AS school_id
      FROM tournament_entries te
      JOIN tournaments        t  ON t.id = te.tournament_id
      LEFT JOIN school_names  sn ON sn.abbreviation = te.school_context_raw
      WHERE t.name = (CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district)
        AND t.gender = p_gender AND t.season_id = p_season
        AND te.school_context_raw IS NOT NULL
    ) AS s
    ORDER BY COALESCE(school_name, school)
  $function$;

-- district_team_pts(p_district integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.district_team_pts(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, weight integer, team_points numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
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
  SELECT te.wrestler_id,
         w.first_name || ' ' || w.last_name AS wrestler_name,
         te.school_context_raw AS school,
         sn.school_name,
         wc.weight::integer,
         ROUND(tw_wrestler_points(te.id, v_tid, v_level), 1) AS team_points
  FROM tournament_entries te
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE te.tournament_id = v_tid
    AND te.school_context_raw IS NOT NULL
    AND te.school_context_raw != ''
    AND tw_wrestler_points(te.id, v_tid, v_level) > 0
  ORDER BY team_points DESC;
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

-- dual_meet_bonus_ranks(p_school_id integer, p_season_id integer, p_gender text, p_season_label text)
CREATE OR REPLACE FUNCTION public.dual_meet_bonus_ranks(p_school_id integer, p_season_id integer, p_gender text, p_season_label text DEFAULT NULL::text)
 RETURNS TABLE(pins_rank bigint, techs_rank bigint, bonus_pct_rank bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
WITH season_label AS (
  SELECT COALESCE(NULLIF(p_season_label, ''), (SELECT label FROM seasons WHERE id = p_season_id)) AS label
),
bouts AS (
  SELECT dmm.school_a_id AS sid, (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id) AS won, dmm.result_type, dmm.is_forfeit_win
  FROM dual_meet_matches dmm JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'M' AND dm.season_id = p_season_id AND dm.gender = 'M' AND NOT dmm.is_double_forfeit
  UNION ALL
  SELECT dmm.school_b_id, (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_b_id), dmm.result_type, dmm.is_forfeit_win
  FROM dual_meet_matches dmm JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'M' AND dm.season_id = p_season_id AND dm.gender = 'M' AND NOT dmm.is_double_forfeit
  UNION ALL
  SELECT dmm.school_a_id, (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id), dmm.result_type, dmm.is_forfeit_win
  FROM dual_meet_matches_girls dmm JOIN dual_meets_girls dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'F' AND dm.season_id = p_season_id AND NOT dmm.is_double_forfeit
  UNION ALL
  SELECT dmm.school_b_id, (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_b_id), dmm.result_type, dmm.is_forfeit_win
  FROM dual_meet_matches_girls dmm JOIN dual_meets_girls dm ON dm.id = dmm.dual_meet_id
  WHERE p_gender = 'F' AND dm.season_id = p_season_id AND NOT dmm.is_double_forfeit
  UNION ALL
  SELECT tb.wrestler1_school_id, (tb.winner = 1), tb.result_type, false
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  JOIN wrestlers w ON w.id = tb.wrestler1_id
  WHERE p_gender = 'M' AND ist.season = (SELECT label FROM season_label) AND w.gender::text = 'M'
  UNION ALL
  SELECT tb.wrestler2_school_id, (tb.winner = 2), tb.result_type, false
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  JOIN wrestlers w ON w.id = tb.wrestler2_id
  WHERE p_gender = 'M' AND ist.season = (SELECT label FROM season_label) AND w.gender::text = 'M'
  UNION ALL
  SELECT tb.wrestler1_school_id, (tb.winner = 1), tb.result_type, false
  FROM tournament_bouts_girls tb
  JOIN in_season_tournaments_girls ist ON ist.id = tb.in_season_tournament_id
  WHERE p_gender = 'F' AND ist.season = (SELECT label FROM season_label) AND tb.wrestler1_id IS NOT NULL
  UNION ALL
  SELECT tb.wrestler2_school_id, (tb.winner = 2), tb.result_type, false
  FROM tournament_bouts_girls tb
  JOIN in_season_tournaments_girls ist ON ist.id = tb.in_season_tournament_id
  WHERE p_gender = 'F' AND ist.season = (SELECT label FROM season_label) AND tb.wrestler2_id IS NOT NULL
),
raw AS (
  SELECT b.sid, b.won, b.result_type, (b.is_forfeit_win OR bout_is_forfeit(b.result_type)) AS is_forfeit
  FROM bouts b
  WHERE b.sid IS NOT NULL AND NOT bout_no_match(b.result_type)
),
agg AS (
  SELECT r.sid AS school_id,
    COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('Fall','FALL') AND NOT r.is_forfeit)      AS pins,
    COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit)      AS techs,
    COUNT(*) FILTER (WHERE r.won AND bout_is_bonus(r.result_type) AND NOT r.is_forfeit)          AS bonus,
    COUNT(*) FILTER (WHERE NOT (r.won AND r.is_forfeit))                                         AS counted
  FROM raw r
  JOIN schools s ON s.id = r.sid AND s.is_nj = true
  GROUP BY r.sid
),
ranked AS (
  SELECT school_id,
    RANK() OVER (ORDER BY pins DESC)  AS pins_rank,
    RANK() OVER (ORDER BY techs DESC) AS techs_rank,
    RANK() OVER (ORDER BY CASE WHEN counted > 0 THEN bonus::numeric / counted ELSE 0 END DESC) AS bonus_pct_rank
  FROM agg
)
SELECT pins_rank, techs_rank, bonus_pct_rank FROM ranked WHERE school_id = p_school_id;
$function$;

-- get_coop_members(p_coop_school_id integer)
CREATE OR REPLACE FUNCTION public.get_coop_members(p_coop_school_id integer)
 RETURNS TABLE(member_school_id integer, member_name text, is_primary boolean, season integer, gender text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
          SELECT sc.member_school_id, s.display_name AS member_name, sc.is_primary, sc.season, sc.gender
          FROM school_coops sc
          JOIN schools s ON s.id = sc.member_school_id
          WHERE sc.coop_school_id = p_coop_school_id
          ORDER BY sc.is_primary DESC, s.display_name;
        $function$;

-- get_coop_membership(p_school_id integer)
CREATE OR REPLACE FUNCTION public.get_coop_membership(p_school_id integer)
 RETURNS TABLE(coop_school_id integer, coop_name text, season integer, gender text, is_primary boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
          SELECT sc.coop_school_id, s.display_name AS coop_name, sc.season, sc.gender, sc.is_primary
          FROM school_coops sc
          JOIN schools s ON s.id = sc.coop_school_id
          WHERE sc.member_school_id = p_school_id
          ORDER BY sc.season DESC, sc.gender;
        $function$;

-- get_wrestler_ghost_championships(p_wrestler_id uuid)
CREATE OR REPLACE FUNCTION public.get_wrestler_ghost_championships(p_wrestler_id uuid)
 RETURNS TABLE(season_id smallint, tournament_type text, tournament_name text, weight integer, seed smallint, wins_on_path jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH champ_wins AS (
    SELECT te.tournament_id, te.id AS entry_id, te.seed, wc.weight,
           t.season_id, t.tournament_type::text, t.name
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN weight_classes wc ON wc.id = te.weight_class_id
    JOIN matches m ON m.winner_entry_id = te.id
      AND m.round = 'F' AND m.bracket_side = 'championship' AND m.validated = true
    WHERE te.wrestler_id = p_wrestler_id
      AND te.seed IS NOT NULL AND te.seed >= 5
  )
  SELECT cw.season_id, cw.tournament_type, cw.name, cw.weight, cw.seed,
    (SELECT jsonb_agg(jsonb_build_object(
        'round', m2.round::text,
        'opponent', TRIM(COALESCE(wr2.first_name,'') || ' ' || COALESCE(wr2.last_name,'')),
        'opponent_seed', te2.seed,
        'win_type', m2.win_type::text,
        'fall_time', m2.fall_time_seconds
      ) ORDER BY CASE m2.round::text
        WHEN 'R1' THEN 1 WHEN 'R2' THEN 2 WHEN 'QF' THEN 3 WHEN 'SF' THEN 4 WHEN 'F' THEN 5 ELSE 6
      END)
    FROM matches m2
    JOIN tournament_entries te2 ON te2.id = m2.loser_entry_id
    JOIN wrestlers wr2 ON wr2.id = te2.wrestler_id
    WHERE m2.winner_entry_id = cw.entry_id
      AND m2.validated = true
      AND m2.bracket_side = 'championship'
      AND m2.win_type::text NOT IN ('BYE','FORF')
    ) AS wins_on_path
  FROM champ_wins cw
  ORDER BY cw.season_id, cw.tournament_type
$function$;

-- get_wrestler_revenge_wins(p_wrestler_id uuid)
CREATE OR REPLACE FUNCTION public.get_wrestler_revenge_wins(p_wrestler_id uuid)
 RETURNS TABLE(season_id smallint, revenge_tournament_type text, revenge_tournament_name text, revenge_round text, weight integer, revenge_win_type text, revenge_fall_time integer, revenge_winner_score smallint, revenge_loser_score smallint, opponent_id uuid, opponent_name text, opponent_school text, opponent_school_name text, original_tournament_type text, original_tournament_name text, original_round text, original_win_type text, original_fall_time integer, original_winner_score smallint, original_loser_score smallint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH my_losses AS (
    SELECT te_l.wrestler_id AS me, te_w.wrestler_id AS opponent,
           m.id AS match_id, t.season_id, t.tournament_type::text AS tt, t.name AS tname,
           m.round::text, m.win_type::text AS wt, m.fall_time_seconds, m.winner_score, m.loser_score,
           wc.weight,
           CASE t.tournament_type::text
             WHEN 'districts' THEN 1 WHEN 'regions' THEN 2 WHEN 'girls_regions' THEN 2
             WHEN 'boys_state' THEN 3 WHEN 'girls_state' THEN 3 ELSE 0
           END AS level_order
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
    JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    WHERE te_l.wrestler_id = p_wrestler_id
      AND m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type::text NOT IN ('BYE','FORF')
  ),
  my_wins AS (
    SELECT te_w.wrestler_id AS me, te_l.wrestler_id AS opponent,
           m.id AS match_id, t.season_id, t.tournament_type::text AS tt, t.name AS tname,
           m.round::text, m.win_type::text AS wt, m.fall_time_seconds, m.winner_score, m.loser_score,
           wc.weight,
           CASE t.tournament_type::text
             WHEN 'districts' THEN 1 WHEN 'regions' THEN 2 WHEN 'girls_regions' THEN 2
             WHEN 'boys_state' THEN 3 WHEN 'girls_state' THEN 3 ELSE 0
           END AS level_order
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
    JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    WHERE te_w.wrestler_id = p_wrestler_id
      AND m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type::text NOT IN ('BYE','FORF')
  )
  SELECT
    w.season_id,
    w.tt, w.tname, w.round, w.weight,
    w.wt, w.fall_time_seconds::integer, w.winner_score, w.loser_score,
    wr_opp.id,
    TRIM(COALESCE(wr_opp.first_name,'') || ' ' || COALESCE(wr_opp.last_name,'')),
    sl.school_context_raw,
    COALESCE(sn.school_name, sl.school_context_raw),
    l.tt, l.tname, l.round, l.wt, l.fall_time_seconds::integer, l.winner_score, l.loser_score
  FROM my_wins w
  JOIN my_losses l ON l.opponent = w.opponent
    AND (l.season_id < w.season_id
         OR (l.season_id = w.season_id AND l.level_order < w.level_order))
  JOIN wrestlers wr_opp ON wr_opp.id = w.opponent
  LEFT JOIN LATERAL (
    SELECT te.school_context_raw FROM tournament_entries te
    JOIN tournaments tt ON tt.id = te.tournament_id
    WHERE te.wrestler_id = w.opponent AND te.school_context_raw IS NOT NULL
    ORDER BY CASE WHEN tt.tournament_type::text = 'districts' THEN 0 ELSE 1 END
    LIMIT 1
  ) sl ON true
  LEFT JOIN school_names sn ON sn.abbreviation = sl.school_context_raw
  ORDER BY w.season_id, w.level_order, w.round
$function$;

-- ghost_champions(p_season smallint)
CREATE OR REPLACE FUNCTION public.ghost_champions(p_season smallint DEFAULT 2)
 RETURNS TABLE(seed smallint, wrestler_id uuid, wrestler_name text, school text, weight smallint, gender text, tournament_name text, tournament_type text, wins_on_path jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT te.seed,
         te.wrestler_id,
         w.first_name || ' ' || w.last_name,
         COALESCE(s.display_name, te.school_context_raw, ''),
         wc.weight::smallint,
         t.gender::text,
         t.name,
         t.tournament_type::text,
         (SELECT jsonb_agg(jsonb_build_object(
            'round', m2.round::text,
            'opponent', TRIM(COALESCE(wr2.first_name,'') || ' ' || COALESCE(wr2.last_name,'')),
            'opponent_seed', te2.seed,
            'win_type', m2.win_type::text,
            'fall_time', m2.fall_time_seconds
          ) ORDER BY CASE m2.round::text
            WHEN 'R1' THEN 1 WHEN 'R2' THEN 2 WHEN 'QF' THEN 3 WHEN 'SF' THEN 4 WHEN 'F' THEN 5 ELSE 6
          END)
          FROM matches m2
          JOIN tournament_entries te2 ON te2.id = m2.loser_entry_id
          JOIN wrestlers wr2 ON wr2.id = te2.wrestler_id
          WHERE m2.winner_entry_id = p.entry_id
            AND m2.validated = true
            AND m2.bracket_side = 'championship'
            AND m2.win_type::text NOT IN ('BYE','FORF')
         )
  FROM placements p
  JOIN tournament_entries te ON te.id = p.entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = p.weight_class_id
  JOIN tournaments t ON t.id = p.tournament_id
  LEFT JOIN schools s ON s.id = te.school_id
  WHERE p.place = 1
    AND te.seed IS NOT NULL AND te.seed >= 5
    AND t.season_id = p_season
  ORDER BY te.seed DESC, t.name, wc.weight;
$function$;

-- girls_region_bracket(p_region text, p_weight integer, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_bracket(p_region text, p_weight integer, p_season smallint DEFAULT 1)
 RETURNS TABLE(match_id uuid, round text, bracket_side text, win_type text, winner_score integer, loser_score integer, fall_time_seconds integer, winner_entry_id uuid, winner_wrestler_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed integer, winner_grade text, loser_entry_id uuid, loser_wrestler_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed integer, loser_grade text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS match_id,
    m.round::text,
    m.bracket_side::text,
    m.win_type::text,
    m.winner_score::integer, m.loser_score::integer, m.fall_time_seconds::integer,
    te_w.id AS winner_entry_id,
    te_w.wrestler_id AS winner_wrestler_id,
    COALESCE(wr_w.first_name || ' ' || wr_w.last_name, '') AS winner_name,
    te_w.school_context_raw AS winner_school,
    COALESCE(sn_w.school_name, te_w.school_context_raw, '') AS winner_school_name,
    te_w.seed::integer AS winner_seed,
    te_w.grade_label::text AS winner_grade,
    te_l.id AS loser_entry_id,
    te_l.wrestler_id AS loser_wrestler_id,
    CASE WHEN te_l.id IS NULL THEN NULL
         ELSE COALESCE(wr_l.first_name || ' ' || wr_l.last_name, '') END AS loser_name,
    te_l.school_context_raw AS loser_school,
    COALESCE(sn_l.school_name, te_l.school_context_raw, '') AS loser_school_name,
    te_l.seed::integer AS loser_seed,
    te_l.grade_label::text AS loser_grade
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id = te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation = te_w.school_context_raw
  LEFT JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id = te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation = te_l.school_context_raw
  WHERE t.name = ('Girl_s Regions r' || p_region)
    AND wc.weight = p_weight
    AND m.validated = true
    AND t.gender = 'F'
    AND t.season_id = p_season
  ORDER BY m.bracket_side, m.round::text;
END;
$function$;

-- girls_region_bracket_entries_v2(p_region text, p_weight integer, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_bracket_entries_v2(p_region text, p_weight integer, p_season smallint DEFAULT 2)
 RETURNS TABLE(entry_id uuid, wrestler_id uuid, wrestler_name text, school text, school_name text, seed smallint, grade text, wins smallint, losses smallint, district_num integer, district_place integer, tournament_id integer, weight_class_id integer, bracket_position smallint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    te.id, w.id, w.first_name || ' ' || w.last_name,
    te.school_context_raw,
    COALESCE(sn.school_name, te.school_context_raw),
    te.seed, te.grade_label::text, te.wins, te.losses,
    (SELECT SUBSTRING(dt.name FROM 'District (\d+)')::int
     FROM tournament_entries dte JOIN tournaments dt ON dt.id = dte.tournament_id
     WHERE dte.wrestler_id = w.id AND dt.tournament_type = 'districts'
       AND dt.season_id = p_season AND dt.gender = 'F' LIMIT 1),
    (SELECT CASE
       WHEN m.round = 'F' AND m.winner_entry_id = dte.id THEN 1
       WHEN m.round = 'F' AND m.loser_entry_id = dte.id THEN 2
       WHEN m.round = '3rd_Place' AND m.winner_entry_id = dte.id THEN 3
       WHEN m.round = '3rd_Place' AND m.loser_entry_id = dte.id THEN 4 END
     FROM tournament_entries dte JOIN tournaments dt ON dt.id = dte.tournament_id
     JOIN matches m ON (m.winner_entry_id = dte.id OR m.loser_entry_id = dte.id) AND m.round::text IN ('F','3rd_Place')
     WHERE dte.wrestler_id = w.id AND dt.tournament_type = 'districts'
       AND dt.season_id = p_season AND dt.gender = 'F' LIMIT 1),
    t.id::int, wc.id::int, te.bracket_position
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE t.tournament_type = 'girls_regions' AND t.season_id = p_season
    AND t.name = 'Girl_s Regions r' || p_region
    AND wc.weight = p_weight
  ORDER BY te.bracket_position NULLS LAST, te.seed NULLS LAST
$function$;

-- girls_region_district_champs(p_region text, p_weight integer, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_district_champs(p_region text, p_weight integer, p_season smallint DEFAULT 2)
 RETURNS TABLE(district_num integer, place integer, wrestler_name text, wrestler_id uuid, school_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    CAST(regexp_replace(t.name, '.*District ', '') AS int) AS district_num,
    CASE
      WHEN m.round = 'F' AND m.winner_entry_id = te.id THEN 1
      WHEN m.round = 'F' AND m.loser_entry_id = te.id THEN 2
      WHEN m.round = '3rd_Place' AND m.winner_entry_id = te.id THEN 3
      WHEN m.round = '3rd_Place' AND m.loser_entry_id = te.id THEN 4
    END AS place,
    w.first_name || ' ' || w.last_name,
    w.id,
    COALESCE(sn.school_name, te.school_context_raw)
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id
    AND t.tournament_type = 'districts' AND t.gender = 'F' AND t.season_id = p_season
  JOIN tournament_entries te ON te.id IN (m.winner_entry_id, m.loser_entry_id)
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id AND wc.weight = p_weight
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.round IN ('F', '3rd_Place')
    AND CAST(regexp_replace(t.name, '.*District ', '') AS int) = ANY(
      CASE p_region
        WHEN '1' THEN ARRAY[1,2,3]
        WHEN '2' THEN ARRAY[4,5,6]
        WHEN '3' THEN ARRAY[7,8,9]
        WHEN '4' THEN ARRAY[10,11,12]
      END
    )
    AND CASE
      WHEN m.round = 'F' AND m.winner_entry_id = te.id THEN 1
      WHEN m.round = 'F' AND m.loser_entry_id = te.id THEN 2
      WHEN m.round = '3rd_Place' AND m.winner_entry_id = te.id THEN 3
      WHEN m.round = '3rd_Place' AND m.loser_entry_id = te.id THEN 4
    END IS NOT NULL
  ORDER BY 1, 2
$function$;

-- girls_region_fastest_pin(p_region text, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_fastest_pin(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    te.school_context_raw AS school, sn.school_name,
    m.fall_time_seconds, wc.weight
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.validated = true AND m.win_type = 'FALL'::win_type AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8;
$function$;

-- girls_region_fastest_tf(p_region text, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_fastest_tf(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    te.school_context_raw AS school, sn.school_name,
    m.fall_time_seconds, wc.weight
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.validated = true AND m.win_type::text LIKE 'TF%' AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8;
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
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY total_seconds ASC LIMIT 8;
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

-- girls_region_placements(p_region text, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_placements(p_region text, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tname text := 'Girl_s Regions r' || p_region;
BEGIN
  RETURN QUERY
  WITH t AS (SELECT id FROM tournaments WHERE name = v_tname AND gender = 'F' AND season_id = p_season)
  SELECT wc.weight::int, 1, te_w.wrestler_id,
    TRIM(COALESCE(wr_w.first_name,'') || ' ' || COALESCE(wr_w.last_name,'')) AS wrestler_name,
    te_w.school_context_raw, COALESCE(sn_w.school_name, te_w.school_context_raw,'')
  FROM matches m JOIN t ON m.tournament_id = t.id JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id = te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation = te_w.school_context_raw
  WHERE m.round = 'F' AND m.bracket_side = 'championship' AND m.validated = true AND te_w.wrestler_id IS NOT NULL
  UNION ALL
  SELECT wc.weight::int, 2, te_l.wrestler_id,
    TRIM(COALESCE(wr_l.first_name,'') || ' ' || COALESCE(wr_l.last_name,'')),
    te_l.school_context_raw, COALESCE(sn_l.school_name, te_l.school_context_raw,'')
  FROM matches m JOIN t ON m.tournament_id = t.id JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id = te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation = te_l.school_context_raw
  WHERE m.round = 'F' AND m.bracket_side = 'championship' AND m.validated = true AND te_l.wrestler_id IS NOT NULL
  UNION ALL
  SELECT wc.weight::int, 3, te_w.wrestler_id,
    TRIM(COALESCE(wr_w.first_name,'') || ' ' || COALESCE(wr_w.last_name,'')),
    te_w.school_context_raw, COALESCE(sn_w.school_name, te_w.school_context_raw,'')
  FROM matches m JOIN t ON m.tournament_id = t.id JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id = te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation = te_w.school_context_raw
  WHERE m.round = '3rd_Place' AND m.bracket_side = 'consolation' AND m.validated = true AND te_w.wrestler_id IS NOT NULL
  UNION ALL
  SELECT wc.weight::int, 4, te_l.wrestler_id,
    TRIM(COALESCE(wr_l.first_name,'') || ' ' || COALESCE(wr_l.last_name,'')),
    te_l.school_context_raw, COALESCE(sn_l.school_name, te_l.school_context_raw,'')
  FROM matches m JOIN t ON m.tournament_id = t.id JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id = te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation = te_l.school_context_raw
  WHERE m.round = '3rd_Place' AND m.bracket_side = 'consolation' AND m.validated = true AND te_l.wrestler_id IS NOT NULL
  ORDER BY 1, 2;
END;
$function$;

-- girls_region_schools(p_region text, p_season smallint)
CREATE OR REPLACE FUNCTION public.girls_region_schools(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(district_num integer, school text, school_name text)
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT district_num, school, school_name
  FROM (
    WITH feeding_districts AS (
      SELECT d::int AS district_num, t.id AS dist_tid
      FROM unnest(
        CASE p_region
          WHEN '1' THEN ARRAY[1,2,3]
          WHEN '2' THEN ARRAY[4,5,6]
          WHEN '3' THEN ARRAY[7,8,9]
          WHEN '4' THEN ARRAY[10,11,12]
        END
      ) AS d
      JOIN tournaments t
        ON t.name = 'Girl_s Districts District ' || d
       AND t.gender    = 'F'
       AND t.season_id = p_season
    )
    SELECT DISTINCT
      fd.district_num,
      te.school_context_raw AS school,
      sn.school_name        AS school_name
    FROM   feeding_districts  fd
    JOIN   tournament_entries  te ON te.tournament_id = fd.dist_tid
    LEFT JOIN school_names     sn ON sn.abbreviation = te.school_context_raw
    WHERE  te.school_context_raw IS NOT NULL
  ) AS s
  ORDER BY district_num, COALESCE(school_name, school)
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

-- region_bracket(p_region integer, p_weight integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_bracket(p_region integer, p_weight integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(match_id uuid, round text, bracket_side text, win_type text, winner_score smallint, loser_score smallint, fall_time_seconds smallint, winner_entry_id uuid, winner_wrestler_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed smallint, winner_grade text, loser_entry_id uuid, loser_wrestler_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed smallint, loser_grade text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    m.id AS match_id,
    m.round::text,
    m.bracket_side::text,
    m.win_type::text,
    m.winner_score, m.loser_score, m.fall_time_seconds,
    te_w.id AS winner_entry_id,
    te_w.wrestler_id AS winner_wrestler_id,
    COALESCE(wr_w.first_name || ' ' || wr_w.last_name, '') AS winner_name,
    te_w.school_context_raw AS winner_school,
    COALESCE(sn_w.school_name, te_w.school_context_raw, '') AS winner_school_name,
    te_w.seed AS winner_seed,
    te_w.grade_label::text AS winner_grade,
    te_l.id AS loser_entry_id,
    te_l.wrestler_id AS loser_wrestler_id,
    CASE WHEN te_l.id IS NULL THEN NULL
         ELSE COALESCE(wr_l.first_name || ' ' || wr_l.last_name, '') END AS loser_name,
    te_l.school_context_raw AS loser_school,
    COALESCE(sn_l.school_name, te_l.school_context_raw, '') AS loser_school_name,
    te_l.seed AS loser_seed,
    te_l.grade_label::text AS loser_grade
  FROM matches m
  JOIN tournaments t ON t.id=m.tournament_id
  JOIN weight_classes wc ON wc.id=m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id=te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation=te_w.school_context_raw
  LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id=te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation=te_l.school_context_raw
  WHERE t.name = 'Boy_s Regions r' || p_region::text
    AND wc.weight = p_weight
    AND m.validated = true
    AND t.gender = p_gender
    AND t.season_id = p_season
  ORDER BY m.bracket_side, m.round::text
$function$;

-- region_bracket_entries_v2(p_region integer, p_weight integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_bracket_entries_v2(p_region integer, p_weight integer, p_gender gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(entry_id uuid, wrestler_id uuid, wrestler_name text, school text, school_name text, seed smallint, grade text, wins smallint, losses smallint, district_num integer, district_place integer, tournament_id integer, weight_class_id integer, bracket_position smallint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    te.id, w.id, w.first_name || ' ' || w.last_name,
    te.school_context_raw,
    COALESCE(sn.school_name, te.school_context_raw),
    te.seed, te.grade_label::text, te.wins, te.losses,
    (SELECT SUBSTRING(dt.name FROM 'District (\d+)')::int
     FROM tournament_entries dte JOIN tournaments dt ON dt.id = dte.tournament_id
     WHERE dte.wrestler_id = w.id AND dt.tournament_type = 'districts'
       AND dt.season_id = p_season AND dt.gender = p_gender LIMIT 1),
    (SELECT CASE
       WHEN m.round = 'F' AND m.winner_entry_id = dte.id THEN 1
       WHEN m.round = 'F' AND m.loser_entry_id = dte.id THEN 2
       WHEN m.round = '3rd_Place' AND m.winner_entry_id = dte.id THEN 3
       WHEN m.round = '3rd_Place' AND m.loser_entry_id = dte.id THEN 4 END
     FROM tournament_entries dte JOIN tournaments dt ON dt.id = dte.tournament_id
     JOIN matches m ON (m.winner_entry_id = dte.id OR m.loser_entry_id = dte.id) AND m.round::text IN ('F','3rd_Place')
     WHERE dte.wrestler_id = w.id AND dt.tournament_type = 'districts'
       AND dt.season_id = p_season AND dt.gender = p_gender LIMIT 1),
    t.id::int, wc.id::int, te.bracket_position
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE t.tournament_type = 'regions' AND t.season_id = p_season
    AND t.name = CASE WHEN p_gender = 'M' THEN 'Boy_s Regions r' ELSE 'Girl_s Regions r' END || p_region
    AND wc.weight = p_weight
  ORDER BY te.bracket_position NULLS LAST, te.seed NULLS LAST
$function$;

-- region_district_champs(p_region integer, p_weight integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_district_champs(p_region integer, p_weight integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(district_num integer, place integer, wrestler_name text, wrestler_id uuid, school_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    CAST(regexp_replace(t.name, '.*District ', '') AS int) AS district_num,
    CASE
      WHEN m.round = 'F' AND m.winner_entry_id = te.id THEN 1
      WHEN m.round = 'F' AND m.loser_entry_id = te.id THEN 2
      WHEN m.round = '3rd_Place' AND m.winner_entry_id = te.id THEN 3
      WHEN m.round = '3rd_Place' AND m.loser_entry_id = te.id THEN 4
    END AS place,
    w.first_name || ' ' || w.last_name,
    w.id,
    COALESCE(sn.school_name, te.school_context_raw)
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id
    AND t.tournament_type = 'districts' AND t.gender = p_gender AND t.season_id = p_season
  JOIN tournament_entries te ON te.id IN (m.winner_entry_id, m.loser_entry_id)
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id AND wc.weight = p_weight
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.round IN ('F', '3rd_Place')
    AND CAST(regexp_replace(t.name, '.*District ', '') AS int) = ANY(
      CASE p_region
        WHEN 1 THEN ARRAY[1,2,3,4]
        WHEN 2 THEN ARRAY[5,6,7,8]
        WHEN 3 THEN ARRAY[9,10,11,12]
        WHEN 4 THEN ARRAY[13,14,15,16]
        WHEN 5 THEN ARRAY[17,18,19,20]
        WHEN 6 THEN ARRAY[21,22,23,24]
        WHEN 7 THEN ARRAY[25,26,27,28]
        WHEN 8 THEN ARRAY[29,30,31,32]
      END
    )
    AND CASE
      WHEN m.round = 'F' AND m.winner_entry_id = te.id THEN 1
      WHEN m.round = 'F' AND m.loser_entry_id = te.id THEN 2
      WHEN m.round = '3rd_Place' AND m.winner_entry_id = te.id THEN 3
      WHEN m.round = '3rd_Place' AND m.loser_entry_id = te.id THEN 4
    END IS NOT NULL
  ORDER BY 1, 2
$function$;

-- region_fastest_pin(p_region integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_fastest_pin(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Boy_s Regions r' || p_region AND gender = p_gender AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    te.school_context_raw AS school, sn.school_name,
    m.fall_time_seconds, wc.weight
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.validated = true AND m.win_type = 'FALL'::win_type AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8
$function$;

-- region_fastest_tf(p_region integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_fastest_tf(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Boy_s Regions r' || p_region AND gender = p_gender AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    te.school_context_raw AS school, sn.school_name,
    m.fall_time_seconds, wc.weight
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE m.validated = true AND m.win_type::text LIKE 'TF%%' AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8
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
    s.display_name, s.display_name, s.id,
    agg.total_secs, agg.mcnt
  FROM agg
  JOIN wrestlers w    ON w.id   = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.total_secs ASC LIMIT 8;
END;
$function$;

-- region_placements(p_region integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_placements(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = 'Boy_s Regions r' || p_region AND gender = p_gender AND season_id = p_season)
  SELECT wc.weight::int, 1, te_w.wrestler_id,
    TRIM(COALESCE(wr_w.first_name,'') || ' ' || COALESCE(wr_w.last_name,'')) AS wrestler_name,
    te_w.school_context_raw, COALESCE(sn_w.school_name, te_w.school_context_raw,'')
  FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id=te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation=te_w.school_context_raw
  WHERE m.round='F' AND m.bracket_side='championship' AND m.validated=true AND te_w.wrestler_id IS NOT NULL
  UNION ALL
  SELECT wc.weight::int, 2, te_l.wrestler_id,
    TRIM(COALESCE(wr_l.first_name,'') || ' ' || COALESCE(wr_l.last_name,'')),
    te_l.school_context_raw, COALESCE(sn_l.school_name, te_l.school_context_raw,'')
  FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
  LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id=te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation=te_l.school_context_raw
  WHERE m.round='F' AND m.bracket_side='championship' AND m.validated=true AND te_l.wrestler_id IS NOT NULL
  UNION ALL
  SELECT wc.weight::int, 3, te_w.wrestler_id,
    TRIM(COALESCE(wr_w.first_name,'') || ' ' || COALESCE(wr_w.last_name,'')),
    te_w.school_context_raw, COALESCE(sn_w.school_name, te_w.school_context_raw,'')
  FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id=te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation=te_w.school_context_raw
  WHERE m.round='3rd_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_w.wrestler_id IS NOT NULL
  UNION ALL
  SELECT wc.weight::int, 4, te_l.wrestler_id,
    TRIM(COALESCE(wr_l.first_name,'') || ' ' || COALESCE(wr_l.last_name,'')),
    te_l.school_context_raw, COALESCE(sn_l.school_name, te_l.school_context_raw,'')
  FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
  LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id=te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation=te_l.school_context_raw
  WHERE m.round='3rd_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_l.wrestler_id IS NOT NULL
  ORDER BY 1, 2
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

-- region_schools(p_region smallint, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.region_schools(p_region smallint, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(district_num integer, school text, school_name text, school_id integer)
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT district_num, school, school_name, school_id
    FROM (
      WITH feeding_districts AS (
        SELECT d::int AS district_num, t.id AS dist_tid
        FROM unnest(
          CASE WHEN p_gender = 'M' THEN
            CASE p_region
              WHEN 1 THEN ARRAY[1,2,3,4] WHEN 2 THEN ARRAY[5,6,7,8]
              WHEN 3 THEN ARRAY[9,10,11,12] WHEN 4 THEN ARRAY[13,14,15,16]
              WHEN 5 THEN ARRAY[17,18,19,20] WHEN 6 THEN ARRAY[21,22,23,24]
              WHEN 7 THEN ARRAY[25,26,27,28] WHEN 8 THEN ARRAY[29,30,31,32]
            END
          ELSE
            CASE p_region
              WHEN 1 THEN ARRAY[1,2,3] WHEN 2 THEN ARRAY[4,5,6]
              WHEN 3 THEN ARRAY[7,8,9] WHEN 4 THEN ARRAY[10,11,12]
            END
          END
        ) AS d
        JOIN tournaments t
          ON t.name = (CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || d)
         AND t.gender = p_gender AND t.season_id = p_season
      )
      SELECT DISTINCT
        fd.district_num,
        te.school_context_raw AS school,
        sn.school_name        AS school_name,
        sn.school_id          AS school_id
      FROM   feeding_districts fd
      JOIN   tournament_entries te ON te.tournament_id = fd.dist_tid
      LEFT JOIN school_names    sn ON sn.abbreviation = te.school_context_raw
      WHERE  te.school_context_raw IS NOT NULL
    ) AS s
    ORDER BY district_num, COALESCE(school_name, school)
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

-- school_directory(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.school_directory(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, wrestler_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH competitors AS (
    SELECT DISTINCT te.school_id, te.wrestler_id
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id AND t.season_id = p_season AND t.gender = p_gender
    JOIN wrestlers w ON w.id = te.wrestler_id AND w.first_name <> ''
    WHERE te.school_id IS NOT NULL
  ),
  pts AS (
    SELECT te.school_id,
      SUM(CASE m.bracket_side
        WHEN 'championship' THEN CASE m.win_type WHEN 'FALL' THEN 3.0 WHEN 'TF-1.5' THEN 2.5 WHEN 'TF' THEN 2.5 WHEN 'MD' THEN 2.0 WHEN 'DEC' THEN 1.0 ELSE 0 END
        WHEN 'consolation'  THEN CASE m.win_type WHEN 'FALL' THEN 2.5 WHEN 'TF-1.5' THEN 2.0 WHEN 'TF' THEN 2.0 WHEN 'MD' THEN 1.5 WHEN 'DEC' THEN 0.5 ELSE 0 END
        ELSE 0 END) AS total_pts
    FROM matches m
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season AND t.gender = p_gender
    WHERE m.validated = true AND te.school_id IS NOT NULL
    GROUP BY te.school_id
  )
  SELECT
    COALESCE(
      CASE WHEN p_gender = 'M' THEN bs.display_name ELSE gs.display_name END,
      s.display_name
    ) AS school,
    COALESCE(
      CASE WHEN p_gender = 'M' THEN bs.display_name ELSE gs.display_name END,
      s.display_name
    ) AS school_name,
    s.id          AS school_id,
    COALESCE(ROUND(p.total_pts, 1), 0) AS total_points,
    COUNT(DISTINCT c.wrestler_id)::bigint AS wrestler_count
  FROM competitors c
  JOIN schools s         ON s.id         = c.school_id
  LEFT JOIN boys_schools  bs ON bs.school_id = c.school_id AND p_gender = 'M'
  LEFT JOIN girls_schools gs ON gs.school_id = c.school_id AND p_gender = 'F'
  LEFT JOIN pts p            ON p.school_id  = c.school_id
  GROUP BY s.id, s.display_name, bs.display_name, gs.display_name, p.total_pts
  ORDER BY COALESCE(
    CASE WHEN p_gender = 'M' THEN bs.display_name ELSE gs.display_name END,
    s.display_name
  );
$function$;

-- school_leaderboard(p_school_id integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.school_leaderboard(p_school_id integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, primary_weight integer, win_count bigint, fall_count bigint, fastest_fall_sec integer, bonus_pct numeric, district_points numeric, region_points numeric, state_points numeric, total_points numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH school_wids AS (
    SELECT DISTINCT te.wrestler_id                                                                                      
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id                                                                       
      AND t.season_id = p_season                                  
      AND t.gender    = p_gender
    WHERE te.school_id = p_school_id                                                                                    
  ),
  wrestler_info AS (                                                                                                    
    SELECT DISTINCT ON (te.wrestler_id)                           
      te.wrestler_id,                                                                                                   
      w.first_name || ' ' || w.last_name AS wrestler_name,
      wc.weight AS primary_weight                                                                                       
    FROM school_wids sw                                                                                                 
    JOIN tournament_entries te ON te.wrestler_id = sw.wrestler_id
    JOIN tournaments t  ON t.id = te.tournament_id                                                                      
      AND t.season_id = p_season                                                                                        
      AND t.gender    = p_gender
    JOIN wrestlers    w  ON w.id  = sw.wrestler_id                                                                      
    JOIN weight_classes wc ON wc.id = te.weight_class_id                                                                
    ORDER BY te.wrestler_id, wc.weight
  ),                                                                                                                    
  all_wins AS (                                                   
    SELECT                                                                                                              
      te.wrestler_id,                                             
      m.win_type::text   AS win_type,
      m.fall_time_seconds
    FROM school_wids sw                                                                                                 
    JOIN tournament_entries te ON te.wrestler_id = sw.wrestler_id
    JOIN tournaments t  ON t.id = te.tournament_id                                                                      
      AND t.season_id = p_season                                                                                        
      AND t.gender    = p_gender
    JOIN matches m ON m.winner_entry_id = te.id                                                                         
    WHERE m.validated = true                                      
      AND m.win_type IS NOT NULL
      AND m.win_type::text NOT IN ('FORF','BYE')                                                                        
  ),                                                                                                                    
  entry_points AS (                                                                                                     
    SELECT                                                                                                              
      te.wrestler_id,                                             
      t.tournament_type::text AS tt,
      tw_wrestler_points(                                                                                               
        te.id,
        te.tournament_id,                                                                                               
        CASE t.tournament_type::text                              
          WHEN 'districts'     THEN CASE WHEN p_gender = 'F' THEN 'district_32' ELSE 'district' END                     
          WHEN 'regions'       THEN CASE WHEN p_gender = 'F' THEN 'region_32'   ELSE 'region_16' END                    
          WHEN 'boys_state'    THEN 'state_32'                                                                          
          WHEN 'girls_regions' THEN 'region_32'                                                                         
          WHEN 'girls_state'   THEN 'state_8'                                                                           
          ELSE 'district'                                                                                               
        END
      ) AS pts                                                                                                          
    FROM school_wids sw                                           
    JOIN tournament_entries te ON te.wrestler_id = sw.wrestler_id
    JOIN tournaments t ON t.id = te.tournament_id                                                                       
      AND t.season_id = p_season
      AND t.gender    = p_gender                                                                                        
  ),                                                              
  wrestler_pts AS (
    SELECT ep.wrestler_id,                                                                                              
      COALESCE(SUM(ep.pts) FILTER (WHERE ep.tt = 'districts'), 0) AS district_points,
      COALESCE(SUM(ep.pts) FILTER (WHERE ep.tt IN ('regions','girls_regions')), 0) AS region_points,                    
      COALESCE(SUM(ep.pts) FILTER (WHERE ep.tt IN ('boys_state','girls_state')), 0) AS state_points,                    
      COALESCE(SUM(ep.pts), 0) AS total_points                                                                          
    FROM entry_points ep                                                                                                
    GROUP BY ep.wrestler_id                                                                                             
  )                                                                                                                     
  SELECT
    wi.wrestler_id,                                                                                                     
    wi.wrestler_name,                                             
    wi.primary_weight,
    COUNT(aw.win_type)                                             AS win_count,
    COUNT(aw.win_type) FILTER (WHERE aw.win_type = 'FALL')        AS fall_count,                                        
    MIN(aw.fall_time_seconds) FILTER (WHERE aw.win_type = 'FALL') AS fastest_fall_sec,                                  
    ROUND(                                                                                                              
      100.0 * COUNT(aw.win_type) FILTER (                                                                               
        WHERE aw.win_type IN ('FALL','TF','TF-1.5','MD','INJ','DQ')
      ) / NULLIF(COUNT(aw.win_type), 0),                                                                                
    1) AS bonus_pct,                                                                                                    
    wp.district_points,                                                                                                 
    wp.region_points,                                                                                                   
    wp.state_points,                                              
    wp.total_points
  FROM wrestler_info wi                                                                                                 
  LEFT JOIN all_wins     aw ON aw.wrestler_id = wi.wrestler_id
  LEFT JOIN wrestler_pts wp ON wp.wrestler_id = wi.wrestler_id                                                          
  GROUP BY wi.wrestler_id, wi.wrestler_name, wi.primary_weight,   
           wp.district_points, wp.region_points, wp.state_points, wp.total_points                                       
  HAVING COUNT(aw.win_type) > 0
  ORDER BY wp.total_points DESC, fall_count DESC, win_count DESC;                                                       
  $function$;

-- school_points_breakdown(p_school_id integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.school_points_breakdown(p_school_id integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(tournament_type text, total_points numeric, win_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$                                                                                             
    WITH school_wids AS (                                         
      SELECT DISTINCT te.wrestler_id                                                                                    
      FROM tournament_entries te                                  
      JOIN tournaments t ON t.id = te.tournament_id AND t.season_id = p_season AND t.gender = p_gender                  
      WHERE te.school_id = p_school_id                                                                                  
    )
    SELECT t.tournament_type::text,                                                                                     
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
      COUNT(*) FILTER (WHERE m.win_type IS NOT NULL)::bigint AS win_count                                               
    FROM matches m                                                                                                      
    JOIN tournament_entries te ON te.id = m.winner_entry_id                                                             
    JOIN school_wids sw ON sw.wrestler_id = te.wrestler_id                                                              
    JOIN tournaments t  ON t.id = m.tournament_id AND t.season_id = p_season AND t.gender = p_gender                    
    WHERE m.validated = true
    GROUP BY t.tournament_type                                                                                          
    ORDER BY CASE t.tournament_type::text                         
      WHEN 'districts' THEN 1 WHEN 'regions' THEN 2 WHEN 'boys_state' THEN 3 ELSE 4                                     
    END;                                                                                                                
  $function$;

-- school_wrestlers(p_school_id integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.school_wrestlers(p_school_id integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, primary_weight smallint, districts_placement text, districts_short text, regions_placement text, regions_short text, state_placement text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$

WITH

-- ── 1. Postseason ─────────────────────────────────────────────────────────────
school_entries AS (
  SELECT
    te.id AS entry_id,
    te.wrestler_id,
    wc.weight,
    t.tournament_type::text AS tt,
    CASE t.tournament_type::text
      WHEN 'districts'     THEN 'D' || regexp_replace(t.name, '^Bo(y.s|ys) Districts District |^Girl.s Districts District ', '')
      WHEN 'regions'       THEN 'R' || regexp_replace(t.name, '^Bo(y.s|ys) Regions [Rr]', '')
      WHEN 'boys_state'    THEN 'State'
      WHEN 'girls_regions' THEN 'R' || regexp_replace(t.name, '^Girl.s Regions [Rr]', '')
      WHEN 'girls_state'   THEN 'State'
      ELSE t.name
    END AS short_name
  FROM tournament_entries te
  JOIN wrestlers wr  ON wr.id = te.wrestler_id AND wr.first_name <> '' AND wr.first_name <> 'Unknown'
  JOIN tournaments t ON t.id  = te.tournament_id
                    AND t.gender    = p_gender
                    AND t.season_id = p_season
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  WHERE te.school_id = p_school_id
),
entry_depth AS (
  SELECT
    se.entry_id,
    se.wrestler_id,
    se.weight,
    se.tt,
    se.short_name,
    COALESCE(bool_or(m.round::text = 'F'         AND m.winner_entry_id = se.entry_id), false) AS won_final,
    COALESCE(bool_or(m.round::text = 'F'         AND m.loser_entry_id  = se.entry_id), false) AS lost_final,
    COALESCE(bool_or(m.round::text = '3rd_Place' AND m.winner_entry_id = se.entry_id), false) AS won_3rd,
    COALESCE(bool_or(m.round::text = '3rd_Place' AND m.loser_entry_id  = se.entry_id), false) AS lost_3rd,
    COALESCE(bool_or(m.round::text = '5th_Place' AND m.winner_entry_id = se.entry_id), false) AS won_5th,
    COALESCE(bool_or(m.round::text = '5th_Place' AND m.loser_entry_id  = se.entry_id), false) AS lost_5th,
    COALESCE(MAX(
      CASE m.round::text
        WHEN 'SF' THEN 70  WHEN 'C6' THEN 65 WHEN 'C5' THEN 60
        WHEN 'QF' THEN 55  WHEN 'C4' THEN 50 WHEN 'C3' THEN 45
        WHEN 'R2' THEN 40  WHEN 'C2' THEN 35 WHEN 'R1' THEN 30
        WHEN 'C1' THEN 25  ELSE 0
      END
    ), 0) AS max_depth
  FROM school_entries se
  LEFT JOIN matches m ON (m.winner_entry_id = se.entry_id OR m.loser_entry_id = se.entry_id)
                     AND m.validated = true
  GROUP BY se.entry_id, se.wrestler_id, se.weight, se.tt, se.short_name
),
entry_placement AS (
  SELECT *,
    CASE
      WHEN won_final  THEN '1st'
      WHEN lost_final THEN '2nd'
      WHEN won_3rd    THEN '3rd'
      WHEN lost_3rd   THEN '4th'
      WHEN won_5th    THEN '5th'
      WHEN lost_5th   THEN '6th'
      WHEN max_depth >= 70 THEN 'SF'
      WHEN max_depth >= 60 THEN 'C5+'
      WHEN max_depth >= 55 THEN 'QF'
      WHEN max_depth >= 45 THEN 'C3+'
      WHEN max_depth >= 40 THEN 'R2'
      WHEN max_depth >= 30 THEN 'R1'
      WHEN max_depth >= 25 THEN 'C1'
      ELSE NULL
    END AS placement
  FROM entry_depth
),
pivoted AS (
  SELECT
    ep.wrestler_id,
    MIN(CASE WHEN ep.tt = 'districts'                          THEN ep.weight END) AS d_weight,
    MIN(CASE WHEN ep.tt IN ('regions', 'girls_regions')        THEN ep.weight END) AS r_weight,
    MIN(CASE WHEN ep.tt IN ('boys_state', 'girls_state')       THEN ep.weight END) AS s_weight,
    MAX(CASE WHEN ep.tt = 'districts'                          THEN ep.placement  END) AS districts_placement,
    MAX(CASE WHEN ep.tt = 'districts'                          THEN ep.short_name END) AS districts_short,
    MAX(CASE WHEN ep.tt IN ('regions', 'girls_regions')        THEN ep.placement  END) AS regions_placement,
    MAX(CASE WHEN ep.tt IN ('regions', 'girls_regions')        THEN ep.short_name END) AS regions_short,
    MAX(CASE WHEN ep.tt IN ('boys_state', 'girls_state')       THEN ep.placement  END) AS state_placement
  FROM entry_placement ep
  GROUP BY ep.wrestler_id
),
postseason AS (
  SELECT
    p.wrestler_id,
    wr.first_name || ' ' || wr.last_name                      AS wrestler_name,
    COALESCE(p.d_weight, p.r_weight, p.s_weight)::smallint    AS primary_weight,
    p.districts_placement,
    p.districts_short,
    p.regions_placement,
    p.regions_short,
    p.state_placement
  FROM pivoted p
  JOIN wrestlers wr ON wr.id = p.wrestler_id AND wr.first_name <> 'Unknown'
),

-- ── 2. RTF in-season tournament bouts ────────────────────────────────────────
season_label(val) AS (
  SELECT (2023 + p_season)::text
      || '-'
      || lpad(((2023 + p_season + 1) % 100)::text, 2, '0')
),
rtf_wrestlers AS (
  SELECT DISTINCT
    CASE WHEN tb.wrestler1_school_id = p_school_id
         THEN tb.wrestler1_id
         ELSE tb.wrestler2_id
    END                   AS wrestler_id,
    tb.weight_class       AS weight_class
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  CROSS JOIN season_label sl
  WHERE ist.season = sl.val
    AND (
      (tb.wrestler1_school_id = p_school_id AND tb.wrestler1_id IS NOT NULL)
      OR
      (tb.wrestler2_school_id = p_school_id AND tb.wrestler2_id IS NOT NULL)
    )
),

-- ── 3. Dual meet matches ───────────────────────────────────────────────────────
dual_wrestlers AS (
  SELECT DISTINCT
    CASE WHEN dmm.school_a_id = p_school_id
         THEN dmm.wrestler_a_id
         ELSE dmm.wrestler_b_id
    END                   AS wrestler_id,
    dmm.weight_class      AS weight_class
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE dm.season_id = p_season
    AND dm.gender    = p_gender::text
    AND (
      (dmm.school_a_id = p_school_id AND dmm.wrestler_a_id IS NOT NULL)
      OR
      (dmm.school_b_id = p_school_id AND dmm.wrestler_b_id IS NOT NULL)
    )
    AND dmm.is_double_forfeit = false
),

-- ── 4. In-season only (not already in postseason) ─────────────────────────────
inseason_only AS (
  SELECT
    wrestler_id,
    MIN(weight_class)::smallint AS primary_weight
  FROM (
    SELECT wrestler_id, weight_class FROM rtf_wrestlers WHERE wrestler_id IS NOT NULL
    UNION
    SELECT wrestler_id, weight_class FROM dual_wrestlers WHERE wrestler_id IS NOT NULL
  ) combined
  WHERE wrestler_id NOT IN (SELECT wrestler_id FROM postseason)
  GROUP BY wrestler_id
)

-- ── Final UNION ────────────────────────────────────────────────────────────────
SELECT * FROM postseason

UNION ALL

SELECT
  wr.id                              AS wrestler_id,
  wr.first_name || ' ' || wr.last_name AS wrestler_name,
  ins.primary_weight,
  NULL::text                         AS districts_placement,
  NULL::text                         AS districts_short,
  NULL::text                         AS regions_placement,
  NULL::text                         AS regions_short,
  NULL::text                         AS state_placement
FROM inseason_only ins
JOIN wrestlers wr ON wr.id = ins.wrestler_id
WHERE wr.gender = p_gender
  AND wr.is_oos = false
  AND wr.first_name <> 'Unknown'

ORDER BY primary_weight, wrestler_name

$function$;

-- state_bracket(p_weight integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.state_bracket(p_weight integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(match_id uuid, round text, bracket_side text, win_type text, winner_score smallint, loser_score smallint, fall_time_seconds smallint, bout_number integer, winner_entry_id uuid, winner_wrestler_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed smallint, winner_grade text, winner_bracket_position smallint, loser_entry_id uuid, loser_wrestler_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed smallint, loser_grade text, loser_bracket_position smallint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    m.id AS match_id,
    m.round::text, m.bracket_side::text, m.win_type::text,
    m.winner_score, m.loser_score, m.fall_time_seconds,
    m.bout_number,
    te_w.id AS winner_entry_id,
    te_w.wrestler_id AS winner_wrestler_id,
    COALESCE(wr_w.first_name || ' ' || wr_w.last_name, '') AS winner_name,
    te_w.school_context_raw AS winner_school,
    COALESCE(sn_w.school_name, te_w.school_context_raw, '') AS winner_school_name,
    te_w.seed AS winner_seed, te_w.grade_label::text AS winner_grade,
    te_w.bracket_position AS winner_bracket_position,
    te_l.id AS loser_entry_id,
    te_l.wrestler_id AS loser_wrestler_id,
    CASE WHEN te_l.id IS NULL THEN NULL
         ELSE COALESCE(wr_l.first_name || ' ' || wr_l.last_name, '') END AS loser_name,
    te_l.school_context_raw AS loser_school,
    COALESCE(sn_l.school_name, te_l.school_context_raw, '') AS loser_school_name,
    te_l.seed AS loser_seed, te_l.grade_label::text AS loser_grade,
    te_l.bracket_position AS loser_bracket_position
  FROM matches m
  JOIN tournaments t ON t.id=m.tournament_id
  JOIN weight_classes wc ON wc.id=m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id=te_w.wrestler_id
  LEFT JOIN school_names sn_w ON sn_w.abbreviation=te_w.school_context_raw
  LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id=te_l.wrestler_id
  LEFT JOIN school_names sn_l ON sn_l.abbreviation=te_l.school_context_raw
  WHERE t.name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
    AND wc.weight=p_weight AND m.validated=true AND t.gender=p_gender
    AND t.season_id=p_season
  ORDER BY m.bracket_side, m.round::text, m.bout_number NULLS LAST
$function$;

-- state_bracket_entries_v2(p_weight integer, p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.state_bracket_entries_v2(p_weight integer, p_gender gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(entry_id uuid, wrestler_id uuid, wrestler_name text, school text, school_name text, seed smallint, grade text, wins smallint, losses smallint, district_num integer, district_place integer, tournament_id integer, weight_class_id integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    te.id AS entry_id,
    w.id AS wrestler_id,
    w.first_name || ' ' || w.last_name AS wrestler_name,
    te.school_context_raw AS school,
    COALESCE(sn.school_name, te.school_context_raw) AS school_name,
    te.seed,
    te.grade_label::text AS grade,
    te.wins,
    te.losses,
    -- Region number (for boys: extract from "Boy_s Regions r1" → 1)
    (SELECT CASE
       WHEN rt.tournament_type = 'regions' THEN SUBSTRING(rt.name FROM 'r(\d+)')::int
       WHEN rt.tournament_type = 'girls_regions' THEN
         CASE
           WHEN rt.name LIKE '%Central%' THEN 1
           WHEN rt.name LIKE '%North 1%' THEN 2
           WHEN rt.name LIKE '%North 2%' THEN 3
           WHEN rt.name LIKE '%South%'   THEN 4
         END
     END
     FROM tournament_entries rte
     JOIN tournaments rt ON rt.id = rte.tournament_id
     WHERE rte.wrestler_id = w.id
       AND rt.tournament_type IN ('regions', 'girls_regions')
       AND rt.season_id = p_season
     LIMIT 1
    ) AS district_num,  -- reusing column name, but this is actually region_num for state
    -- Region placement from matches
    (SELECT
       CASE
         WHEN m.round = 'F' AND m.winner_entry_id = rte.id THEN 1
         WHEN m.round = 'F' AND m.loser_entry_id = rte.id THEN 2
         WHEN m.round = '3rd_Place' AND m.winner_entry_id = rte.id THEN 3
         WHEN m.round = '3rd_Place' AND m.loser_entry_id = rte.id THEN 4
         WHEN m.round = '5th_Place' AND m.winner_entry_id = rte.id THEN 5
         WHEN m.round = '5th_Place' AND m.loser_entry_id = rte.id THEN 6
       END
     FROM tournament_entries rte
     JOIN tournaments rt ON rt.id = rte.tournament_id
     JOIN matches m ON (m.winner_entry_id = rte.id OR m.loser_entry_id = rte.id)
                    AND m.round::text IN ('F', '3rd_Place', '5th_Place')
     WHERE rte.wrestler_id = w.id
       AND rt.tournament_type IN ('regions', 'girls_regions')
       AND rt.season_id = p_season
     ORDER BY
       CASE
         WHEN m.round = 'F' AND m.winner_entry_id = rte.id THEN 1
         WHEN m.round = 'F' AND m.loser_entry_id = rte.id THEN 2
         WHEN m.round = '3rd_Place' AND m.winner_entry_id = rte.id THEN 3
         WHEN m.round = '3rd_Place' AND m.loser_entry_id = rte.id THEN 4
         WHEN m.round = '5th_Place' AND m.winner_entry_id = rte.id THEN 5
         WHEN m.round = '5th_Place' AND m.loser_entry_id = rte.id THEN 6
       END
     LIMIT 1
    ) AS district_place,  -- reusing column name, but this is actually region_place for state
    t.id::int AS tournament_id,
    te.weight_class_id::int AS weight_class_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  LEFT JOIN school_names sn ON sn.abbreviation = te.school_context_raw
  WHERE t.name = (CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END)
    AND wc.weight = p_weight
    AND t.season_id = p_season
  ORDER BY te.seed ASC NULLS LAST, w.last_name ASC;
$function$;

-- state_champions(p_tournament_id integer)
CREATE OR REPLACE FUNCTION public.state_champions(p_tournament_id integer)
 RETURNS TABLE(weight smallint, wrestler_id uuid, wrestler_name text, school text, seed smallint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT wc.weight::smallint, te.wrestler_id,
    wrestler_name_with_grade(w.first_name, w.last_name, w.id),
    COALESCE(s.display_name, te.school_context_raw, ''),
    te.seed
  FROM placements p
  JOIN tournament_entries te ON te.id = p.entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = p.weight_class_id
  LEFT JOIN schools s ON s.id = te.school_id
  WHERE p.tournament_id = p_tournament_id AND p.place = 1
  ORDER BY wc.weight;
$function$;

-- state_mat_time(p_gender gender_type)
CREATE OR REPLACE FUNCTION public.state_mat_time(p_gender gender_type)
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
    s.display_name, s.display_name, s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.total_seconds ASC LIMIT 8;
END;
$function$;

-- state_placements(p_gender gender_type)
CREATE OR REPLACE FUNCTION public.state_placements(p_gender gender_type DEFAULT 'M'::gender_type)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END AND gender = p_gender),

  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id)
      te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_context_raw IS NOT NULL
      AND t2.name NOT LIKE '%States%'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.name LIKE '%Regions%' THEN 0 ELSE 1 END
  ),

  all_places AS (
    -- 1st: Finals winner
    SELECT wc.weight::int AS w, 1 AS p, te_w.wrestler_id AS wid,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id) AS wname,
      sl.school_context_raw AS sch, COALESCE(sn.school_name, sl.school_context_raw,'') AS schn
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_w.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_w.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='F' AND m.bracket_side='championship' AND m.validated=true AND te_w.wrestler_id IS NOT NULL

    UNION ALL
    -- 2nd: Finals loser
    SELECT wc.weight::int, 2, te_l.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_l.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_l.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='F' AND m.bracket_side='championship' AND m.validated=true AND te_l.wrestler_id IS NOT NULL

    UNION ALL
    -- 3rd: 3rd_Place winner
    SELECT wc.weight::int, 3, te_w.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_w.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_w.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='3rd_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_w.wrestler_id IS NOT NULL

    UNION ALL
    -- 4th: 3rd_Place loser
    SELECT wc.weight::int, 4, te_l.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_l.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_l.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='3rd_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_l.wrestler_id IS NOT NULL

    UNION ALL
    -- 5th/6th: C6 losers (boys state only — returns empty for girls)
    SELECT wc.weight::int,
      (4 + ROW_NUMBER() OVER (PARTITION BY wc.weight ORDER BY m.id))::int,
      te_l.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_l.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_l.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='C6' AND m.bracket_side='consolation' AND m.validated=true AND te_l.wrestler_id IS NOT NULL

    UNION ALL
    -- 7th/8th: C5 losers (boys state only — returns empty for girls)
    SELECT wc.weight::int,
      (6 + ROW_NUMBER() OVER (PARTITION BY wc.weight ORDER BY m.id))::int,
      te_l.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_l.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_l.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='C5' AND m.bracket_side='consolation' AND m.validated=true AND te_l.wrestler_id IS NOT NULL
  )

  SELECT w, p, wid, wname, sch, schn FROM all_places ORDER BY 1, 2
$function$;

-- state_placements(p_gender gender_type, p_season smallint)
CREATE OR REPLACE FUNCTION public.state_placements(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END AND gender = p_gender AND season_id = p_season),

  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id)
      te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season
    WHERE te2.school_context_raw IS NOT NULL
      AND t2.name NOT LIKE '%States%'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.name LIKE '%Regions%' THEN 0 ELSE 1 END
  ),

  all_places AS (
    -- 1st: Finals winner
    SELECT wc.weight::int AS w, 1 AS p, te_w.wrestler_id AS wid,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id) AS wname,
      sl.school_context_raw AS sch, COALESCE(sn.school_name, sl.school_context_raw,'') AS schn
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_w.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_w.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='F' AND m.bracket_side='championship' AND m.validated=true AND te_w.wrestler_id IS NOT NULL

    UNION ALL
    -- 2nd: Finals loser
    SELECT wc.weight::int, 2, te_l.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_l.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_l.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='F' AND m.bracket_side='championship' AND m.validated=true AND te_l.wrestler_id IS NOT NULL

    UNION ALL
    -- 3rd: 3rd_Place winner
    SELECT wc.weight::int, 3, te_w.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_w.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_w.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='3rd_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_w.wrestler_id IS NOT NULL

    UNION ALL
    -- 4th: 3rd_Place loser
    SELECT wc.weight::int, 4, te_l.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_l.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_l.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='3rd_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_l.wrestler_id IS NOT NULL

    UNION ALL
    -- 5th: 5th_Place winner
    SELECT wc.weight::int, 5, te_w.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_w.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_w.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='5th_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_w.wrestler_id IS NOT NULL

    UNION ALL
    -- 6th: 5th_Place loser
    SELECT wc.weight::int, 6, te_l.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_l.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_l.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='5th_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_l.wrestler_id IS NOT NULL

    UNION ALL
    -- 7th: 7th_Place winner
    SELECT wc.weight::int, 7, te_w.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_w.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_w.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='7th_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_w.wrestler_id IS NOT NULL

    UNION ALL
    -- 8th: 7th_Place loser
    SELECT wc.weight::int, 8, te_l.wrestler_id,
      wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
      sl.school_context_raw, COALESCE(sn.school_name, sl.school_context_raw,'')
    FROM matches m JOIN t ON m.tournament_id=t.id JOIN weight_classes wc ON wc.id=m.weight_class_id
    LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
    LEFT JOIN wrestlers wr ON wr.id=te_l.wrestler_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id=te_l.wrestler_id
    LEFT JOIN school_names sn ON sn.abbreviation=sl.school_context_raw
    WHERE m.round='7th_Place' AND m.bracket_side='consolation' AND m.validated=true AND te_l.wrestler_id IS NOT NULL
  )

  SELECT w, p, wid, wname, sch, schn FROM all_places ORDER BY 1, 2
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
         sch.display_name AS school_name,          -- canonical, never NULL
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

-- wrestler_grade(p_wrestler_id uuid)
CREATE OR REPLACE FUNCTION public.wrestler_grade(p_wrestler_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT te.grade_label::text
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE te.wrestler_id = p_wrestler_id
    AND te.grade_label IS NOT NULL
  ORDER BY t.season_id DESC,
    CASE t.tournament_type
      WHEN 'boys_state' THEN 0 WHEN 'girls_state' THEN 0
      WHEN 'regions' THEN 1 WHEN 'girls_regions' THEN 1
      WHEN 'districts' THEN 2 ELSE 3 END
  LIMIT 1;
$function$;
