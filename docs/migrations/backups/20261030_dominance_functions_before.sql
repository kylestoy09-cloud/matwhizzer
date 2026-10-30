-- Live definitions removed or replaced by 20261030_purge_dominance_average.sql
-- (pg_get_functiondef, 2026-10-30). lb_rs_team_stats before this change is the
-- version in 20261030_bonus_pct_one_rule.sql (with hammer_sum).
-- dom_match_score(text, integer) was not captured; it is dropped only if no
-- other function still references it (see the guard in the migration).

CREATE OR REPLACE FUNCTION public.district_dominance(p_district integer, p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, dominance_score numeric, win_count bigint)
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

CREATE OR REPLACE FUNCTION public.girls_region_dominance(p_region integer, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, dominance_score numeric, win_count bigint)
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

CREATE OR REPLACE FUNCTION public.girls_region_dominance(p_region text, p_season smallint DEFAULT 1)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, dominance_score numeric, win_count bigint)
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

CREATE OR REPLACE FUNCTION public.lb_dominance(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, name text, school text, school_name text, school_id integer, dominance_score numeric, win_count bigint)
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

CREATE OR REPLACE FUNCTION public.lb_gp_dominance(p_pool text DEFAULT 'state'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, dominance_score numeric, win_count bigint)
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

CREATE OR REPLACE FUNCTION public.lb_p_dominance(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, dominance_score numeric, win_count bigint)
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

CREATE OR REPLACE FUNCTION public.region_dominance(p_region integer, p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, dominance_score numeric, win_count bigint)
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

CREATE OR REPLACE FUNCTION public.state_champions(p_tournament_id integer)
 RETURNS TABLE(weight smallint, wrestler_id uuid, wrestler_name text, school text, dominance_score numeric, seed smallint)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT wc.weight::smallint, te.wrestler_id,
    wrestler_name_with_grade(w.first_name, w.last_name, w.id),
    COALESCE(s.display_name, te.school_context_raw, ''),
    ROUND(AVG(CASE WHEN m.winner_entry_id = p.entry_id
      THEN dom_match_score(m.win_type::text, m.fall_time_seconds)
      ELSE -dom_match_score(m.win_type::text, m.fall_time_seconds) END)::numeric, 2),
    te.seed
  FROM placements p
  JOIN tournament_entries te ON te.id = p.entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = p.weight_class_id
  LEFT JOIN schools s ON s.id = te.school_id
  LEFT JOIN matches m ON (m.winner_entry_id = p.entry_id OR m.loser_entry_id = p.entry_id)
    AND m.tournament_id = p_tournament_id AND m.win_type IS NOT NULL
    AND m.win_type NOT IN ('FORF'::win_type, 'INJ'::win_type, 'DQ'::win_type, 'BYE'::win_type)
  WHERE p.tournament_id = p_tournament_id AND p.place = 1
  GROUP BY wc.weight, te.wrestler_id, w.first_name, w.last_name, w.id,
    COALESCE(s.display_name, te.school_context_raw, ''), te.seed
  ORDER BY wc.weight;
$function$;

CREATE OR REPLACE FUNCTION public.state_dominance(p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, dominance_score numeric, win_count bigint)
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
