-- Bonus % — one rule for every leaderboard and the school page rankings, both genders.
--
-- Bonus % = bonus wins ÷ matches counted
--   bonus win       — a win by fall, tech fall or major decision (never a forfeit)
--   matches counted — every match wrestled, plus forfeit LOSSES; forfeit WINS are
--                     not matches. Contested matches that end early (injury
--                     default, default, DQ) count for both wrestlers. Byes, double
--                     forfeits and no contests are not matches.
--   Medical forfeits are forfeits (the source codes are M. For., MFFL, MFF; the
--   postseason source records them as FORF and can't tell them apart).
--
-- Why it kept showing 100% with losses: Bonus % was computed separately in six
-- functions, each with its own forfeit handling, and fixes reached only some:
--   * lb_p_most_bonus / lb_gp_most_bonus dropped FORF matches entirely, so a
--     forfeit loss vanished (Gavin Geleta 5/5 in the 2025-26 region pool with a
--     forfeit loss in the final; Amari Vann 4/4 in the 2024-25 state pool with 3).
--   * The 2026-08-03 denominator fix (total_wins → total_matches) went into the
--     boys function only. lb_gp_most_bonus still returned total_wins, so the girls
--     page (which reads total_matches) showed "—" on every row.
--   * lb_rs_individual_stats / lb_rs_team_stats read the boys dual and in-season
--     tournament tables for both genders: girls regular-season leaderboards were
--     empty. The live versions were also not the repo's newest file (v10).
--   * dual_meet_bonus_ranks existed twice; the 3-argument call was ambiguous and
--     the 4-argument one read a gender column in_season_tournaments doesn't have,
--     so the school page's state ranks always failed. Its Bonus % rank was also
--     bonus ÷ wins.
-- The rule now lives in three helper functions every one of these calls.
--
-- Old definitions: docs/migrations/backups/20261030_bonus_functions_before.sql

-- ── The rule ──────────────────────────────────────────────────────────────────

-- Not a match at all
CREATE OR REPLACE FUNCTION public.bout_no_match(p_result text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_result IS NULL OR p_result IN ('BYE', 'Double Forfeit', 'NC')
$$;

-- Uncontested: one wrestler didn't wrestle (forfeit or medical forfeit)
CREATE OR REPLACE FUNCTION public.bout_is_forfeit(p_result text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_result IN ('For', 'Forfeit', 'FORF', 'FF', 'M. For.', 'MFFL', 'MFF')
$$;

-- Bonus result: fall, tech fall, major decision
CREATE OR REPLACE FUNCTION public.bout_is_bonus(p_result text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_result IN ('Fall', 'FALL', 'TF', 'TF-1', 'TF-1.5', 'MD', 'Maj')
$$;

GRANT EXECUTE ON FUNCTION public.bout_no_match(text), public.bout_is_forfeit(text), public.bout_is_bonus(text)
  TO anon, authenticated, service_role;

-- ── Postseason (boys) ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lb_p_most_bonus(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_matches integer)
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
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    agg.bonus_wins,
    agg.total_matches
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wrestler_id
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY (agg.bonus_wins::numeric / agg.total_matches) DESC, agg.bonus_wins DESC
  LIMIT 25;
$function$;

-- ── Postseason (girls) — returns total_matches like the boys function ────────

DROP FUNCTION IF EXISTS public.lb_gp_most_bonus(text, smallint);
CREATE FUNCTION public.lb_gp_most_bonus(p_pool text, p_season smallint DEFAULT 2)
RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_matches integer)
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
GRANT EXECUTE ON FUNCTION public.lb_gp_most_bonus(text, smallint) TO anon, authenticated, service_role;

-- ── Regular season, individual — each gender reads its own tables ────────────
--   boys:  dual_meets / dual_meet_matches,  in_season_tournaments / tournament_bouts
--   girls: dual_meets_girls / dual_meet_matches_girls, in_season_tournaments_girls / tournament_bouts_girls
-- total_matches = matches counted (the Bonus % denominator); contested_matches
-- leaves out every forfeit (Pin %, TF %, hammer).

CREATE OR REPLACE FUNCTION public.lb_rs_individual_stats(p_season_id integer, p_gender text)
RETURNS TABLE(wrestler_id uuid, wrestler_name text, school_id integer, school_name text, section text, classification text, athletic_conference text, logo_url text, color_primary text, pin_count bigint, fastest_pin integer, fastest_pin_wt integer, pin_total_time bigint, tf_count bigint, fastest_tf integer, fastest_tf_wt integer, tf_total_time bigint, bonus_wins bigint, contested_matches bigint, total_matches bigint, hammer_score numeric, weight_class integer)
LANGUAGE sql STABLE SECURITY DEFINER
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
  s.display_name      AS school_name,
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

-- ── Regular season, team ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lb_rs_team_stats(p_season_id integer, p_gender text)
RETURNS TABLE(school_id integer, school_name text, section text, classification text, athletic_conference text, logo_url text, color_primary text, dual_pin_count bigint, tournament_pin_count bigint, pin_count bigint, fastest_pin integer, pin_total_time bigint, dual_tf_count bigint, tournament_tf_count bigint, tf_count bigint, fastest_tf integer, tf_total_time bigint, dual_bonus_wins bigint, tournament_bonus_wins bigint, bonus_wins bigint, contested_matches bigint, total_matches bigint, hammer_sum numeric, dual_meet_count bigint, dual_team_points bigint)
LANGUAGE sql STABLE SECURITY DEFINER
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
  s.display_name        AS school_name,
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

  COALESCE(SUM(
    CASE
      WHEN r.is_forfeit THEN 0
      WHEN r.won THEN
        CASE r.result_type
          WHEN 'Fall' THEN
            CASE
              WHEN r.fall_time_seconds IS NULL THEN 6
              WHEN r.fall_time_seconds <= 30   THEN 9
              WHEN r.fall_time_seconds <= 60   THEN 8.5
              WHEN r.fall_time_seconds <= 120  THEN 8
              WHEN r.fall_time_seconds <= 180  THEN 7.5
              WHEN r.fall_time_seconds <= 240  THEN 7
              WHEN r.fall_time_seconds <= 300  THEN 6.5
              ELSE 6
            END
          WHEN 'TF'     THEN 5
          WHEN 'TF-1.5' THEN 5
          WHEN 'MD'     THEN 2
          WHEN 'Maj'    THEN 2
          WHEN 'DEC'    THEN 1
          WHEN 'Dec'    THEN 1
          WHEN 'OT Dec' THEN 1
          ELSE 0
        END
      ELSE
        CASE r.result_type
          WHEN 'Fall'   THEN -9
          WHEN 'TF'     THEN -6
          WHEN 'TF-1.5' THEN -6
          WHEN 'MD'     THEN -2
          WHEN 'Maj'    THEN -2
          ELSE -1
        END
    END
  ), 0) AS hammer_sum,

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
GROUP BY s.id, s.display_name, s.section, s.classification, s.athletic_conference, s.logo_url, s.color_primary
$function$;

-- ── School page state ranks (Pins, Tech Falls, Bonus %) ──────────────────────
-- One function (the two overloads made the 3-argument call ambiguous), each
-- gender's own tables, Bonus % by the rule above, ranked among NJ schools.

DROP FUNCTION IF EXISTS public.dual_meet_bonus_ranks(integer, integer, text);
DROP FUNCTION IF EXISTS public.dual_meet_bonus_ranks(integer, integer, text, text);
CREATE FUNCTION public.dual_meet_bonus_ranks(
  p_school_id    integer,
  p_season_id    integer,
  p_gender       text,
  p_season_label text DEFAULT NULL
)
RETURNS TABLE(pins_rank bigint, techs_rank bigint, bonus_pct_rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
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
GRANT EXECUTE ON FUNCTION public.dual_meet_bonus_ranks(integer, integer, text, text) TO anon, authenticated, service_role;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- Expect: girls regular season has rows; nobody at 100% in the postseason pools
-- has a counted loss; the school ranks return a row.
SELECT 'rs girls' AS check, COUNT(*) FROM lb_rs_individual_stats(2026, 'F')
UNION ALL SELECT 'rs girls teams', COUNT(*) FROM lb_rs_team_stats(2026, 'F')
UNION ALL SELECT 'rs boys', COUNT(*) FROM lb_rs_individual_stats(2026, 'M')
UNION ALL SELECT 'school ranks (Pascack Valley, boys)', COUNT(*) FROM dual_meet_bonus_ranks(16, 2026, 'M')
UNION ALL SELECT 'school ranks (Newton/Kittatinny, girls)', COUNT(*) FROM dual_meet_bonus_ranks(24, 2026, 'F');
