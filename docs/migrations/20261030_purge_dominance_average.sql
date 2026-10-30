-- Purge the dominance average.
--
-- The per-match dominance average (pins/TFs graded by speed to a max of 9,
-- MD = 2, Dec = 1, losses scored as the negative) was shown as "Hammer Rating"
-- (and "Hammer Score" on the boys leaderboards) beside the real Hammer Score
-- rating (wrestler_hammer_scores: last 20 matches, tournaments, postseason
-- finish). The site stopped calling it on 2026-10-30; this removes it from the
-- database:
--   * drops the dominance functions and their scoring helper dom_match_score
--   * state_champions no longer returns dominance_score
--   * lb_rs_team_stats no longer returns hammer_sum (a dominance-style team total)
--
-- Old definitions: docs/migrations/backups/20261030_dominance_functions_before.sql

DROP FUNCTION IF EXISTS public.lb_dominance(gender_type, smallint);
DROP FUNCTION IF EXISTS public.lb_p_dominance(gender_type, text, smallint);
DROP FUNCTION IF EXISTS public.lb_gp_dominance(text, smallint);
DROP FUNCTION IF EXISTS public.district_dominance(integer, gender_type, smallint);
DROP FUNCTION IF EXISTS public.region_dominance(integer, gender_type, smallint);
DROP FUNCTION IF EXISTS public.girls_region_dominance(integer, smallint);
DROP FUNCTION IF EXISTS public.girls_region_dominance(text, smallint);
DROP FUNCTION IF EXISTS public.state_dominance(gender_type, smallint);

-- State champions without the dominance column
DROP FUNCTION IF EXISTS public.state_champions(integer);
CREATE FUNCTION public.state_champions(p_tournament_id integer)
RETURNS TABLE(weight smallint, wrestler_id uuid, wrestler_name text, school text, seed smallint)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
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
GRANT EXECUTE ON FUNCTION public.state_champions(integer) TO anon, authenticated, service_role;

-- Regular-season team stats without hammer_sum
DROP FUNCTION IF EXISTS public.lb_rs_team_stats(integer, text);
CREATE FUNCTION public.lb_rs_team_stats(p_season_id integer, p_gender text)
RETURNS TABLE(school_id integer, school_name text, section text, classification text, athletic_conference text, logo_url text, color_primary text, dual_pin_count bigint, tournament_pin_count bigint, pin_count bigint, fastest_pin integer, pin_total_time bigint, dual_tf_count bigint, tournament_tf_count bigint, tf_count bigint, fastest_tf integer, tf_total_time bigint, dual_bonus_wins bigint, tournament_bonus_wins bigint, bonus_wins bigint, contested_matches bigint, total_matches bigint, dual_meet_count bigint, dual_team_points bigint)
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
GRANT EXECUTE ON FUNCTION public.lb_rs_team_stats(integer, text) TO anon, authenticated, service_role;

-- The scoring helper goes last, and only if nothing else still uses it
DO $$
DECLARE r record; users text;
BEGIN
  SELECT string_agg(p.proname, ', ') INTO users
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proname <> 'dom_match_score'
    AND pg_get_functiondef(p.oid) ILIKE '%dom_match_score%';
  IF users IS NOT NULL THEN
    RAISE EXCEPTION 'dom_match_score is still used by: %', users;
  END IF;
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'dom_match_score' LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig;
  END LOOP;
END $$;

-- Verify: expect 0 functions mentioning dominance; champions and team stats return rows
SELECT 'functions mentioning dominance' AS check, COUNT(*)::text AS result
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND (p.proname ILIKE '%dominance%' OR p.proname = 'dom_match_score' OR pg_get_functiondef(p.oid) ILIKE '%dominance%')
UNION ALL
SELECT 'boys 2025-26 state champions', COUNT(*)::text FROM state_champions((SELECT id FROM tournaments WHERE season_id = 2026 AND gender = 'M' AND tournament_type = 'boys_state' LIMIT 1))
UNION ALL
SELECT 'rs team stats boys / girls', (SELECT COUNT(*) FROM lb_rs_team_stats(2026, 'M')) || ' / ' || (SELECT COUNT(*) FROM lb_rs_team_stats(2026, 'F'));
