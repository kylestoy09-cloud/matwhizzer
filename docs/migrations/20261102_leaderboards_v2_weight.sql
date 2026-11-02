-- Leaderboards v2: list each wrestler at the weight his rating uses (2026-11-02)
--
-- lb_rs_wrestler.weight was the most common regular-season weight, so a wrestler who moved up
-- mid-season was filed at his old weight: Manny Gusfa (15 bouts at 157 in Dec, 10 at 165 after,
-- districts/regions/state at 165) showed on the 157 WRR board. The rating (wrestler_hammer_scores
-- .weight_class) uses the postseason entry, else the last in-season tournament, else the most
-- common dual weight. Now the leaderboard uses that weight; an unrated wrestler gets his most
-- recent bout's weight, snapped to the gender's ladder (an odd tournament weight like 160 is not
-- a class). Only lb_rs_refresh changes.
-- ROLLBACK: rerun lb_rs_refresh from 20261102_leaderboards_v2_pt_avg.sql.

-- ── Regular season refresh ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lb_rs_refresh(p_gender text, p_season integer)
RETURNS TABLE(wrestlers integer, teams integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_label   text;
  v_weights integer[] := CASE WHEN p_gender = 'F'
    THEN ARRAY[100,107,114,120,126,132,138,145,152,165,185,235]
    ELSE ARRAY[106,113,120,126,132,138,144,150,157,165,175,190,215,285] END;
  v_w integer; v_t integer;
BEGIN
  SELECT label INTO v_label FROM seasons WHERE id = p_season;
  IF v_label IS NULL THEN RAISE EXCEPTION 'unknown season %', p_season; END IF;

  DROP TABLE IF EXISTS _rs;
  CREATE TEMP TABLE _rs ON COMMIT DROP AS
  WITH bouts AS (
    -- dual sides: side a is team 1, side b team 2 (team points recorded per bout)
    SELECT m.wrestler_a_id AS wid, m.school_a_id AS sid, (m.winner_id = m.wrestler_a_id) AS won,
           m.result_type, m.fall_time_seconds AS ft, m.is_forfeit_win, m.weight_class AS wt,
           true AS is_dual, m.dual_meet_id, COALESCE(m.team1_points, 0) AS team_pts, d.meet_date AS dt
    FROM dual_meet_matches m JOIN dual_meets d ON d.id = m.dual_meet_id
    WHERE p_gender = 'M' AND d.season_id = p_season AND d.gender = 'M' AND NOT m.is_double_forfeit AND m.wrestler_a_id IS NOT NULL
    UNION ALL
    SELECT m.wrestler_b_id, m.school_b_id, (m.winner_id = m.wrestler_b_id), m.result_type, m.fall_time_seconds,
           m.is_forfeit_win, m.weight_class, true, m.dual_meet_id, COALESCE(m.team2_points, 0), d.meet_date
    FROM dual_meet_matches m JOIN dual_meets d ON d.id = m.dual_meet_id
    WHERE p_gender = 'M' AND d.season_id = p_season AND d.gender = 'M' AND NOT m.is_double_forfeit AND m.wrestler_b_id IS NOT NULL
    UNION ALL
    SELECT m.wrestler_a_id, m.school_a_id, (m.winner_id = m.wrestler_a_id), m.result_type, m.fall_time_seconds,
           m.is_forfeit_win, m.weight_class, true, m.dual_meet_id, COALESCE(m.team1_points, 0), d.meet_date
    FROM dual_meet_matches_girls m JOIN dual_meets_girls d ON d.id = m.dual_meet_id
    WHERE p_gender = 'F' AND d.season_id = p_season AND NOT m.is_double_forfeit AND m.wrestler_a_id IS NOT NULL
    UNION ALL
    SELECT m.wrestler_b_id, m.school_b_id, (m.winner_id = m.wrestler_b_id), m.result_type, m.fall_time_seconds,
           m.is_forfeit_win, m.weight_class, true, m.dual_meet_id, COALESCE(m.team2_points, 0), d.meet_date
    FROM dual_meet_matches_girls m JOIN dual_meets_girls d ON d.id = m.dual_meet_id
    WHERE p_gender = 'F' AND d.season_id = p_season AND NOT m.is_double_forfeit AND m.wrestler_b_id IS NOT NULL
    UNION ALL
    SELECT b.wrestler1_id, b.wrestler1_school_id, (b.winner = 1), b.result_type, b.fall_time_seconds, false, b.weight_class, false, NULL::uuid, 0, i.start_date
    FROM tournament_bouts b JOIN in_season_tournaments i ON i.id = b.in_season_tournament_id
    WHERE p_gender = 'M' AND i.season = v_label AND b.wrestler1_id IS NOT NULL
    UNION ALL
    SELECT b.wrestler2_id, b.wrestler2_school_id, (b.winner = 2), b.result_type, b.fall_time_seconds, false, b.weight_class, false, NULL::uuid, 0, i.start_date
    FROM tournament_bouts b JOIN in_season_tournaments i ON i.id = b.in_season_tournament_id
    WHERE p_gender = 'M' AND i.season = v_label AND b.wrestler2_id IS NOT NULL
    UNION ALL
    SELECT b.wrestler1_id, b.wrestler1_school_id, (b.winner = 1), b.result_type, b.fall_time_seconds, false, b.weight_class, false, NULL::uuid, 0, i.start_date
    FROM tournament_bouts_girls b JOIN in_season_tournaments_girls i ON i.id = b.in_season_tournament_id
    WHERE p_gender = 'F' AND i.season = v_label AND b.wrestler1_id IS NOT NULL
    UNION ALL
    SELECT b.wrestler2_id, b.wrestler2_school_id, (b.winner = 2), b.result_type, b.fall_time_seconds, false, b.weight_class, false, NULL::uuid, 0, i.start_date
    FROM tournament_bouts_girls b JOIN in_season_tournaments_girls i ON i.id = b.in_season_tournament_id
    WHERE p_gender = 'F' AND i.season = v_label AND b.wrestler2_id IS NOT NULL
  )
  SELECT b.wid, b.sid, COALESCE(b.won, false) AS won, lb_kind(b.result_type) AS kind,
         (b.is_forfeit_win OR lb_kind(b.result_type) = 'forfeit') AS forfeit,
         b.ft, b.wt::integer AS wt, b.is_dual, b.dual_meet_id, b.team_pts, b.dt
  FROM bouts b
  JOIN wrestlers w ON w.id = b.wid
  JOIN schools s   ON s.id = b.sid AND s.is_nj = true
  WHERE b.sid IS NOT NULL AND (lb_kind(b.result_type) <> 'nomatch' OR b.is_forfeit_win);

  DELETE FROM lb_rs_wrestler WHERE gender = p_gender AND season_id = p_season;
  INSERT INTO lb_rs_wrestler (gender, season_id, wrestler_id, school_id, wrestler_name, weight,
    pins, fastest_pin, fastest_pin_wt, pin_avg, techs, fastest_tf, fastest_tf_wt, tf_avg,
    pins_techs, pt_avg, bonus_wins, matches, bonus_pct, wrr)
  WITH r AS (
    SELECT *, CASE WHEN kind = 'tf' AND ft >= 8 THEN ft END AS tf_ft,
              CASE WHEN kind = 'fall' AND ft > 0 THEN ft END AS fall_ft
    FROM _rs
  ),
  agg AS (
    SELECT wid, sid,
      COUNT(*) FILTER (WHERE won AND kind = 'fall' AND NOT forfeit)                    AS pins,
      MIN(fall_ft) FILTER (WHERE won AND NOT forfeit)                                   AS fastest_pin,
      AVG(fall_ft) FILTER (WHERE won AND NOT forfeit)                                   AS pin_avg,
      COUNT(*) FILTER (WHERE won AND kind = 'tf' AND NOT forfeit)                      AS techs,
      MIN(tf_ft) FILTER (WHERE won AND NOT forfeit)                                     AS fastest_tf,
      AVG(tf_ft) FILTER (WHERE won AND NOT forfeit)                                     AS tf_avg,
      AVG(COALESCE(fall_ft, tf_ft)) FILTER (WHERE won AND NOT forfeit)                  AS pt_avg,
      COUNT(*) FILTER (WHERE won AND kind IN ('fall','tf','md') AND NOT forfeit)       AS bonus_wins,
      COUNT(*) FILTER (WHERE NOT (won AND forfeit))                                     AS matches,
      MODE() WITHIN GROUP (ORDER BY wt)                                                 AS weight
    FROM r GROUP BY wid, sid
  ),
  pin_wt AS (SELECT DISTINCT ON (wid, sid) wid, sid, wt FROM r WHERE won AND NOT forfeit AND fall_ft IS NOT NULL ORDER BY wid, sid, fall_ft),
  tf_wt  AS (SELECT DISTINCT ON (wid, sid) wid, sid, wt FROM r WHERE won AND NOT forfeit AND tf_ft  IS NOT NULL ORDER BY wid, sid, tf_ft),
  last_wt AS (SELECT DISTINCT ON (wid, sid) wid, sid, wt FROM r WHERE wt IS NOT NULL ORDER BY wid, sid, dt DESC NULLS LAST)
  SELECT p_gender, p_season, a.wid, a.sid,
    TRIM(COALESCE(w.first_name, '') || ' ' || COALESCE(w.last_name, '')),
    -- listed at the weight his rating uses (postseason entry, else last tournament, else most
    -- common dual weight); unrated: his most recent bout's weight, snapped to the ladder
    COALESCE(CASE WHEN h.weight_class ~ '^\d+$' AND h.weight_class::integer = ANY (v_weights) THEN h.weight_class::integer END,
             (SELECT x FROM unnest(v_weights) x ORDER BY abs(x - lw.wt) LIMIT 1)),
    a.pins, a.fastest_pin, pw.wt, ROUND(a.pin_avg, 1), a.techs, a.fastest_tf, tw.wt, ROUND(a.tf_avg, 1),
    a.pins + a.techs, ROUND(a.pt_avg, 1), a.bonus_wins, a.matches,
    CASE WHEN a.matches > 0 THEN ROUND(100.0 * a.bonus_wins / a.matches, 1) END,
    h.hammer_score
  FROM agg a
  JOIN wrestlers w ON w.id = a.wid
  LEFT JOIN pin_wt pw ON pw.wid = a.wid AND pw.sid = a.sid
  LEFT JOIN tf_wt  tw ON tw.wid = a.wid AND tw.sid = a.sid
  LEFT JOIN last_wt lw ON lw.wid = a.wid AND lw.sid = a.sid
  LEFT JOIN wrestler_hammer_scores h ON h.wrestler_id = a.wid AND h.season = v_label AND h.gender = p_gender
  WHERE w.first_name !~* '^\s*unknown'    -- the Unknown placeholder counts for its team, not as a wrestler
    AND w.gender::text = p_gender;          -- a girl on a boys team (or the reverse) counts for the team only
  GET DIAGNOSTICS v_w = ROW_COUNT;

  DELETE FROM lb_rs_team WHERE gender = p_gender AND season_id = p_season;
  INSERT INTO lb_rs_team (gender, season_id, school_id, pins, dual_pins, tourn_pins, techs, dual_techs, tourn_techs,
    bonus_wins, matches, contested, pin_pct, tf_pct, bonus_pct, duals, dual_points, points_per_dual, team_wrr)
  WITH agg AS (
    SELECT sid,
      COUNT(*) FILTER (WHERE won AND kind = 'fall' AND NOT forfeit)                  AS pins,
      COUNT(*) FILTER (WHERE won AND kind = 'fall' AND NOT forfeit AND is_dual)      AS dual_pins,
      COUNT(*) FILTER (WHERE won AND kind = 'fall' AND NOT forfeit AND NOT is_dual)  AS tourn_pins,
      COUNT(*) FILTER (WHERE won AND kind = 'tf' AND NOT forfeit)                    AS techs,
      COUNT(*) FILTER (WHERE won AND kind = 'tf' AND NOT forfeit AND is_dual)        AS dual_techs,
      COUNT(*) FILTER (WHERE won AND kind = 'tf' AND NOT forfeit AND NOT is_dual)    AS tourn_techs,
      COUNT(*) FILTER (WHERE won AND kind IN ('fall','tf','md') AND NOT forfeit)     AS bonus_wins,
      COUNT(*) FILTER (WHERE NOT (won AND forfeit))                                   AS matches,
      COUNT(*) FILTER (WHERE NOT forfeit)                                             AS contested,
      COUNT(DISTINCT dual_meet_id) FILTER (WHERE is_dual)                             AS duals,
      COALESCE(SUM(team_pts) FILTER (WHERE is_dual), 0)                               AS dual_points
    FROM _rs GROUP BY sid
  ),
  -- Team WRR: best rating at each weight, summed over the gender's weights / number of weights
  best AS (
    SELECT h.school_id, h.weight_class, MAX(h.hammer_score) AS best
    FROM wrestler_hammer_scores h
    WHERE h.season = v_label AND h.gender = p_gender AND h.school_id IS NOT NULL
      AND h.weight_class ~ '^\d+$' AND h.weight_class::integer = ANY (v_weights)
    GROUP BY h.school_id, h.weight_class
  ),
  twrr AS (SELECT school_id, ROUND(SUM(best) / array_length(v_weights, 1), 2) AS team_wrr FROM best GROUP BY school_id)
  SELECT p_gender, p_season, a.sid, a.pins, a.dual_pins, a.tourn_pins, a.techs, a.dual_techs, a.tourn_techs,
    a.bonus_wins, a.matches, a.contested,
    CASE WHEN a.contested > 0 THEN ROUND(100.0 * a.pins  / a.contested, 1) END,
    CASE WHEN a.contested > 0 THEN ROUND(100.0 * a.techs / a.contested, 1) END,
    CASE WHEN a.matches   > 0 THEN ROUND(100.0 * a.bonus_wins / a.matches, 1) END,
    a.duals, a.dual_points,
    CASE WHEN a.duals > 0 THEN ROUND(a.dual_points::numeric / a.duals, 1) END,
    t.team_wrr
  FROM agg a LEFT JOIN twrr t ON t.school_id = a.sid;
  GET DIAGNOSTICS v_t = ROW_COUNT;

  RETURN QUERY SELECT v_w, v_t;
END $$;
