-- Leaderboards v2: average time across pins and techs (2026-11-02)
--
-- The Most boards show the average fall time, average tech time and the average across both,
-- and a tie on the count goes to the faster average (Kyle, 2026-11-02). pin_avg / tf_avg were
-- already stored; this adds pt_avg (average over every timed fall and tech fall) to both
-- wrestler tables and to the two refresh functions. Bad tech times (under 8 s) stay excluded.
-- ROLLBACK: ALTER TABLE ... DROP COLUMN pt_avg, then rerun lb_rs_refresh from
-- 20261102_leaderboards_v2_team_bouts.sql and lb_ps_refresh from 20261102_leaderboards_v2.sql.

ALTER TABLE public.lb_rs_wrestler ADD COLUMN IF NOT EXISTS pt_avg numeric;
ALTER TABLE public.lb_ps_wrestler ADD COLUMN IF NOT EXISTS pt_avg numeric;

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
           true AS is_dual, m.dual_meet_id, COALESCE(m.team1_points, 0) AS team_pts
    FROM dual_meet_matches m JOIN dual_meets d ON d.id = m.dual_meet_id
    WHERE p_gender = 'M' AND d.season_id = p_season AND d.gender = 'M' AND NOT m.is_double_forfeit AND m.wrestler_a_id IS NOT NULL
    UNION ALL
    SELECT m.wrestler_b_id, m.school_b_id, (m.winner_id = m.wrestler_b_id), m.result_type, m.fall_time_seconds,
           m.is_forfeit_win, m.weight_class, true, m.dual_meet_id, COALESCE(m.team2_points, 0)
    FROM dual_meet_matches m JOIN dual_meets d ON d.id = m.dual_meet_id
    WHERE p_gender = 'M' AND d.season_id = p_season AND d.gender = 'M' AND NOT m.is_double_forfeit AND m.wrestler_b_id IS NOT NULL
    UNION ALL
    SELECT m.wrestler_a_id, m.school_a_id, (m.winner_id = m.wrestler_a_id), m.result_type, m.fall_time_seconds,
           m.is_forfeit_win, m.weight_class, true, m.dual_meet_id, COALESCE(m.team1_points, 0)
    FROM dual_meet_matches_girls m JOIN dual_meets_girls d ON d.id = m.dual_meet_id
    WHERE p_gender = 'F' AND d.season_id = p_season AND NOT m.is_double_forfeit AND m.wrestler_a_id IS NOT NULL
    UNION ALL
    SELECT m.wrestler_b_id, m.school_b_id, (m.winner_id = m.wrestler_b_id), m.result_type, m.fall_time_seconds,
           m.is_forfeit_win, m.weight_class, true, m.dual_meet_id, COALESCE(m.team2_points, 0)
    FROM dual_meet_matches_girls m JOIN dual_meets_girls d ON d.id = m.dual_meet_id
    WHERE p_gender = 'F' AND d.season_id = p_season AND NOT m.is_double_forfeit AND m.wrestler_b_id IS NOT NULL
    UNION ALL
    SELECT b.wrestler1_id, b.wrestler1_school_id, (b.winner = 1), b.result_type, b.fall_time_seconds, false, b.weight_class, false, NULL::uuid, 0
    FROM tournament_bouts b JOIN in_season_tournaments i ON i.id = b.in_season_tournament_id
    WHERE p_gender = 'M' AND i.season = v_label AND b.wrestler1_id IS NOT NULL
    UNION ALL
    SELECT b.wrestler2_id, b.wrestler2_school_id, (b.winner = 2), b.result_type, b.fall_time_seconds, false, b.weight_class, false, NULL::uuid, 0
    FROM tournament_bouts b JOIN in_season_tournaments i ON i.id = b.in_season_tournament_id
    WHERE p_gender = 'M' AND i.season = v_label AND b.wrestler2_id IS NOT NULL
    UNION ALL
    SELECT b.wrestler1_id, b.wrestler1_school_id, (b.winner = 1), b.result_type, b.fall_time_seconds, false, b.weight_class, false, NULL::uuid, 0
    FROM tournament_bouts_girls b JOIN in_season_tournaments_girls i ON i.id = b.in_season_tournament_id
    WHERE p_gender = 'F' AND i.season = v_label AND b.wrestler1_id IS NOT NULL
    UNION ALL
    SELECT b.wrestler2_id, b.wrestler2_school_id, (b.winner = 2), b.result_type, b.fall_time_seconds, false, b.weight_class, false, NULL::uuid, 0
    FROM tournament_bouts_girls b JOIN in_season_tournaments_girls i ON i.id = b.in_season_tournament_id
    WHERE p_gender = 'F' AND i.season = v_label AND b.wrestler2_id IS NOT NULL
  )
  SELECT b.wid, b.sid, COALESCE(b.won, false) AS won, lb_kind(b.result_type) AS kind,
         (b.is_forfeit_win OR lb_kind(b.result_type) = 'forfeit') AS forfeit,
         b.ft, b.wt::integer AS wt, b.is_dual, b.dual_meet_id, b.team_pts
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
  tf_wt  AS (SELECT DISTINCT ON (wid, sid) wid, sid, wt FROM r WHERE won AND NOT forfeit AND tf_ft  IS NOT NULL ORDER BY wid, sid, tf_ft)
  SELECT p_gender, p_season, a.wid, a.sid,
    TRIM(COALESCE(w.first_name, '') || ' ' || COALESCE(w.last_name, '')),
    a.weight, a.pins, a.fastest_pin, pw.wt, ROUND(a.pin_avg, 1), a.techs, a.fastest_tf, tw.wt, ROUND(a.tf_avg, 1),
    a.pins + a.techs, ROUND(a.pt_avg, 1), a.bonus_wins, a.matches,
    CASE WHEN a.matches > 0 THEN ROUND(100.0 * a.bonus_wins / a.matches, 1) END,
    h.hammer_score
  FROM agg a
  JOIN wrestlers w ON w.id = a.wid
  LEFT JOIN pin_wt pw ON pw.wid = a.wid AND pw.sid = a.sid
  LEFT JOIN tf_wt  tw ON tw.wid = a.wid AND tw.sid = a.sid
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

-- ── Postseason refresh ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lb_ps_refresh(p_gender text, p_season integer)
RETURNS TABLE(wrestler_rows integer, team_rows integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_g gender_type := p_gender::gender_type;
  -- team-score levels for tw_wrestler_points, as in lb_p_team_points / lb_gp_team_points
  v_dist  text := CASE WHEN p_gender = 'M' THEN 'district'  ELSE 'district_32' END;
  v_reg   text := CASE WHEN p_gender = 'M' THEN 'region_16' ELSE 'region_32'   END;
  v_state text := CASE WHEN p_gender = 'M' THEN 'state_32'  ELSE 'state_8'     END;
  v_w integer; v_t integer;
BEGIN
  DROP TABLE IF EXISTS _pools, _ps;
  CREATE TEMP TABLE _pools (pool text, lvl text) ON COMMIT DROP;
  INSERT INTO _pools VALUES
    ('district','districts'),
    ('region:at','region'), ('region:thru','districts'), ('region:thru','region'),
    ('state:at','state'),   ('state:thru','districts'), ('state:thru','region'), ('state:thru','state');

  CREATE TEMP TABLE _ps ON COMMIT DROP AS
  WITH t AS (
    SELECT id, name, CASE tournament_type::text
        WHEN 'districts' THEN 'districts'
        WHEN 'regions' THEN 'region' WHEN 'girls_regions' THEN 'region'
        WHEN 'boys_state' THEN 'state' WHEN 'girls_state' THEN 'state' END AS lvl,
      district_id, region_id
    FROM tournaments WHERE gender = v_g AND season_id = p_season
  ),
  sides AS (
    SELECT m.id AS match_id, m.tournament_id AS tid, m.weight_class_id, m.round::text AS round, m.bracket_side::text AS side,
           m.winner_entry_id AS entry_id, true AS won, m.win_type::text AS wtype, m.fall_time_seconds AS ft, m.winner_entry_id
    FROM matches m WHERE m.validated = true AND m.win_type IS NOT NULL AND m.winner_entry_id IS NOT NULL
    UNION ALL
    SELECT m.id, m.tournament_id, m.weight_class_id, m.round::text, m.bracket_side::text,
           m.loser_entry_id, false, m.win_type::text, m.fall_time_seconds, m.winner_entry_id
    FROM matches m WHERE m.validated = true AND m.win_type IS NOT NULL AND m.loser_entry_id IS NOT NULL
  )
  SELECT s.match_id, s.tid, t.lvl, t.district_id, t.region_id, s.weight_class_id, s.round, s.side,
         s.entry_id, te.wrestler_id AS wid, te.school_id AS entry_school, s.won,
         lb_kind(s.wtype) AS kind, (lb_kind(s.wtype) = 'forfeit') AS forfeit, s.ft, wc.weight::integer AS wt,
         s.winner_entry_id
  FROM sides s
  JOIN t ON t.id = s.tid AND t.lvl IS NOT NULL
  JOIN tournament_entries te ON te.id = s.entry_id
  JOIN weight_classes wc ON wc.id = s.weight_class_id
  WHERE lb_kind(s.wtype) <> 'nomatch';

  DELETE FROM lb_ps_wrestler WHERE gender = p_gender AND season_id = p_season;
  INSERT INTO lb_ps_wrestler (gender, season_id, pool, wrestler_id, school_id, wrestler_name, weight,
    pins, fastest_pin, fastest_pin_ctx, pin_avg, techs, fastest_tf, fastest_tf_ctx, tf_avg, pins_techs, pt_avg,
    bonus_wins, matches, bonus_pct, wins, points, mat_time, mat_wins)
  WITH school_lookup AS (       -- as the old individual tables: prefer the regions entry's school
    SELECT DISTINCT ON (te.wrestler_id) te.wrestler_id, te.school_id
    FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
    WHERE te.school_id IS NOT NULL AND t.season_id = p_season AND t.gender = v_g
    ORDER BY te.wrestler_id, CASE WHEN t.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  b AS (
    SELECT p.pool, x.*,
      CASE WHEN x.kind = 'fall' AND x.ft > 0  THEN x.ft END AS fall_ft,
      CASE WHEN x.kind = 'tf'   AND x.ft >= 8 THEN x.ft END AS tf_ft,
      CASE x.lvl WHEN 'districts' THEN 'D' || COALESCE(x.district_id::text, '') WHEN 'region' THEN 'R' || COALESCE(x.region_id::text, '') ELSE 'State' END || ' ' ||
      CASE x.round WHEN 'F' THEN 'Final' WHEN '3rd_Place' THEN '3rd' WHEN '5th_Place' THEN '5th' WHEN '7th_Place' THEN '7th' ELSE x.round END AS ctx
    FROM _ps x JOIN _pools p ON p.lvl = x.lvl
  ),
  agg AS (
    SELECT pool, wid,
      COUNT(*) FILTER (WHERE won AND kind = 'fall')                                AS pins,
      MIN(fall_ft) FILTER (WHERE won)                                               AS fastest_pin,
      AVG(fall_ft) FILTER (WHERE won)                                               AS pin_avg,
      COUNT(*) FILTER (WHERE won AND kind = 'tf')                                  AS techs,
      MIN(tf_ft) FILTER (WHERE won)                                                 AS fastest_tf,
      AVG(tf_ft) FILTER (WHERE won)                                                 AS tf_avg,
      AVG(COALESCE(fall_ft, tf_ft)) FILTER (WHERE won)                              AS pt_avg,
      COUNT(*) FILTER (WHERE won AND kind IN ('fall','tf','md'))                   AS bonus_wins,
      COUNT(*) FILTER (WHERE NOT (won AND forfeit))                                 AS matches,
      COUNT(*) FILTER (WHERE won)                                                   AS wins,
      COUNT(*) FILTER (WHERE NOT won AND NOT forfeit)                               AS contested_losses,
      COUNT(*) FILTER (WHERE won AND NOT forfeit)                                   AS contested_wins,
      SUM(CASE WHEN won AND NOT forfeit THEN COALESCE(CASE WHEN kind IN ('fall','tf') AND ft > 0 THEN ft END, 360) END) AS mat_secs,
      MODE() WITHIN GROUP (ORDER BY wt)                                             AS weight,
      MIN(entry_school)                                                             AS any_school
    FROM b GROUP BY pool, wid
  ),
  pin_ctx AS (SELECT DISTINCT ON (pool, wid) pool, wid, ctx FROM b WHERE won AND fall_ft IS NOT NULL ORDER BY pool, wid, fall_ft),
  tf_ctx  AS (SELECT DISTINCT ON (pool, wid) pool, wid, ctx FROM b WHERE won AND tf_ft  IS NOT NULL ORDER BY pool, wid, tf_ft),
  -- Wrestler points per level. Boys: the NJSIAA formula of lb_p_wrestler_points (round base +
  -- FALL/INJ +2, TF +1.5, MD +1; finals/3rd losers; district placement bonus). Girls:
  -- tw_wrestler_points per entry, as lb_gp_wrestler_points.
  r1_winners AS (SELECT DISTINCT tid, weight_class_id, entry_id FROM _ps WHERE round = 'R1' AND won),
  boys_pts AS (
    SELECT x.lvl, x.wid,
      CASE WHEN x.won THEN
        CASE x.lvl
          WHEN 'districts' THEN CASE x.round WHEN 'R1' THEN 2.0 WHEN 'QF' THEN CASE WHEN r1.entry_id IS NOT NULL THEN 0.0 ELSE 2.0 END
                                     WHEN 'SF' THEN 2.0 WHEN 'F' THEN 2.0 WHEN '3rd_Place' THEN 2.0 ELSE 0.0 END
          WHEN 'region'    THEN CASE x.round WHEN 'R1' THEN 2.0 WHEN 'QF' THEN CASE WHEN r1.entry_id IS NOT NULL THEN 5.0 ELSE 7.0 END
                                     WHEN 'SF' THEN 9.0 WHEN 'F' THEN 6.0 WHEN 'C1' THEN 4.0 WHEN '3rd_Place' THEN 4.0 WHEN '5th_Place' THEN 2.0 ELSE 0.0 END
          ELSE CASE x.round WHEN 'R1' THEN 2.0 WHEN 'R2' THEN 2.0 WHEN 'QF' THEN 5.0 WHEN 'SF' THEN 9.0 WHEN 'F' THEN 6.0
                    WHEN 'C1' THEN 1.0 WHEN 'C2' THEN 1.0 WHEN 'C3' THEN 1.0 WHEN 'C4' THEN 2.0 WHEN 'C5' THEN 3.0
                    WHEN '3rd_Place' THEN 4.0 WHEN '5th_Place' THEN 2.0 ELSE 0.0 END
        END
        + CASE x.kind WHEN 'fall' THEN 2.0 WHEN 'inj' THEN 2.0 WHEN 'tf' THEN 1.5 WHEN 'md' THEN 1.0 ELSE 0.0 END
      ELSE
        CASE WHEN x.round = 'F' THEN 2.0 WHEN x.round = '3rd_Place' AND x.lvl <> 'districts' THEN 2.0 ELSE 0.0 END
      END
      + CASE WHEN x.lvl = 'districts' AND x.side = 'championship' AND x.round = 'F' THEN CASE WHEN x.won THEN 14.0 ELSE 10.0 END
             WHEN x.lvl = 'districts' AND x.round = '3rd_Place' THEN CASE WHEN x.won THEN 7.0 ELSE 6.0 END
             ELSE 0.0 END AS pts
    FROM _ps x
    LEFT JOIN r1_winners r1 ON x.won AND r1.tid = x.tid AND r1.weight_class_id = x.weight_class_id AND r1.entry_id = x.entry_id
    WHERE p_gender = 'M'
  ),
  girls_pts AS (
    SELECT CASE t.tournament_type::text WHEN 'districts' THEN 'districts' WHEN 'girls_regions' THEN 'region' ELSE 'state' END AS lvl,
           te.wrestler_id AS wid,
           tw_wrestler_points(te.id, t.id, CASE t.tournament_type::text WHEN 'districts' THEN 'district_32'
                                                                        WHEN 'girls_regions' THEN 'region_32' ELSE 'state_8' END) AS pts
    FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
    WHERE p_gender = 'F' AND t.gender = 'F' AND t.season_id = p_season
      AND t.tournament_type IN ('districts','girls_regions','girls_state')
  ),
  lvl_pts AS (SELECT lvl, wid, SUM(pts) AS pts FROM (SELECT * FROM boys_pts UNION ALL SELECT * FROM girls_pts) z GROUP BY lvl, wid),
  pool_pts AS (SELECT p.pool, l.wid, ROUND(SUM(l.pts), 1) AS pts FROM lvl_pts l JOIN _pools p ON p.lvl = l.lvl GROUP BY p.pool, l.wid)
  SELECT p_gender, p_season, a.pool, a.wid, COALESCE(sl.school_id, a.any_school),
    TRIM(COALESCE(w.first_name, '') || ' ' || COALESCE(w.last_name, '')),
    a.weight, a.pins, a.fastest_pin, pc.ctx, ROUND(a.pin_avg, 1), a.techs, a.fastest_tf, tc.ctx, ROUND(a.tf_avg, 1),
    a.pins + a.techs, ROUND(a.pt_avg, 1), a.bonus_wins, a.matches,
    CASE WHEN a.matches > 0 THEN ROUND(100.0 * a.bonus_wins / a.matches, 1) END,
    a.wins,
    CASE WHEN a.wins >= 1 AND pp.pts > 0 THEN pp.pts END,
    CASE WHEN a.contested_losses = 0 AND a.contested_wins >= 3 THEN a.mat_secs END,
    CASE WHEN a.contested_losses = 0 AND a.contested_wins >= 3 THEN a.contested_wins END
  FROM agg a
  JOIN wrestlers w ON w.id = a.wid AND w.gender = v_g AND w.first_name !~* '^\s*unknown'
  LEFT JOIN school_lookup sl ON sl.wrestler_id = a.wid
  LEFT JOIN pin_ctx pc ON pc.pool = a.pool AND pc.wid = a.wid
  LEFT JOIN tf_ctx  tc ON tc.pool = a.pool AND tc.wid = a.wid
  LEFT JOIN pool_pts pp ON pp.pool = a.pool AND pp.wid = a.wid;
  GET DIAGNOSTICS v_w = ROW_COUNT;

  DELETE FROM lb_ps_team WHERE gender = p_gender AND season_id = p_season;
  INSERT INTO lb_ps_team (gender, season_id, pool, school_id, team_points, pins, techs, bonus_wins, matches, bonus_pct)
  WITH team_lookup AS (         -- as the old team points: prefer the districts entry's school
    SELECT DISTINCT ON (te.wrestler_id) te.wrestler_id, te.school_id
    FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
    WHERE te.school_id IS NOT NULL AND t.season_id = p_season AND t.gender = v_g
    ORDER BY te.wrestler_id, CASE WHEN t.tournament_type = 'districts' THEN 0
                                  WHEN t.tournament_type IN ('regions','girls_regions') THEN 1 ELSE 2 END
  ),
  lvl_team AS (
    SELECT CASE t.tournament_type::text WHEN 'districts' THEN 'districts' WHEN 'regions' THEN 'region' WHEN 'girls_regions' THEN 'region' ELSE 'state' END AS lvl,
           tl.school_id,
           SUM(tw_wrestler_points(te.id, t.id, CASE t.tournament_type::text WHEN 'districts' THEN v_dist
                                                 WHEN 'regions' THEN v_reg WHEN 'girls_regions' THEN v_reg ELSE v_state END)) AS pts
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN team_lookup tl ON tl.wrestler_id = te.wrestler_id
    WHERE t.season_id = p_season AND t.gender = v_g
    GROUP BY 1, 2
  ),
  pool_team AS (SELECT p.pool, l.school_id, ROUND(SUM(l.pts), 1) AS pts FROM lvl_team l JOIN _pools p ON p.lvl = l.lvl GROUP BY p.pool, l.school_id),
  stats AS (
    SELECT pool, school_id, SUM(pins) AS pins, SUM(techs) AS techs, SUM(bonus_wins) AS bonus_wins, SUM(matches) AS matches
    FROM lb_ps_wrestler WHERE gender = p_gender AND season_id = p_season AND school_id IS NOT NULL
    GROUP BY pool, school_id
  )
  SELECT p_gender, p_season, COALESCE(s.pool, pt.pool), COALESCE(s.school_id, pt.school_id),
    CASE WHEN pt.pts > 0 THEN pt.pts END,
    COALESCE(s.pins, 0), COALESCE(s.techs, 0), COALESCE(s.bonus_wins, 0), COALESCE(s.matches, 0),
    CASE WHEN s.matches > 0 THEN ROUND(100.0 * s.bonus_wins / s.matches, 1) END
  FROM stats s FULL OUTER JOIN pool_team pt ON pt.pool = s.pool AND pt.school_id = s.school_id
  JOIN schools sc ON sc.id = COALESCE(s.school_id, pt.school_id);
  GET DIAGNOSTICS v_t = ROW_COUNT;

  RETURN QUERY SELECT v_w, v_t;
END $$;
