-- Live definitions replaced by 20261030_bonus_pct_one_rule.sql (pg_get_functiondef, 2026-10-30).
--
-- Matching repo files (same body as live):
--   lb_p_most_bonus(gender_type, text, smallint)        = docs/migrations/20260803_fix_bonus_pct_total_matches.sql
--   lb_rs_individual_stats(integer, text)               = docs/migrations/20260828_rs_leaderboard_rpcs_v10.sql
--                                                         WITHOUT the grade column / wrestlers join (v10 was not what is live)
--   lb_rs_team_stats(integer, text)                     = docs/migrations/20260810_rs_team_stats_ppd.sql (dual_team_points version)
--   dual_meet_bonus_ranks(integer, integer, text)       = docs/migrations/20260802_dual_meet_bonus_ranks_rpc.sql
--   dual_meet_bonus_ranks(integer, integer, text, text) = docs/migrations/20260912_dual_meet_bonus_ranks_gender_filter.sql
--
-- Not in the repo before now:

CREATE OR REPLACE FUNCTION public.lb_gp_most_bonus(p_pool text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, bonus_wins integer, total_wins integer)
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
