-- Regular Season Leaderboard RPCs v10
-- Add primary_weight_class and grade to lb_rs_individual_stats.
-- weight_class: uses actual competing weight (MODE across matches) so the weight-class
--   filter shows wrestlers who ARE that weight, not just wrestlers with a fast finish there.
-- grade: joins wrestlers.grade directly so the leaderboard can filter by class (Fr/So/Jr/Sr).

DROP FUNCTION IF EXISTS lb_rs_individual_stats(integer, text) CASCADE;

CREATE FUNCTION lb_rs_individual_stats(p_season_id int, p_gender text)
RETURNS TABLE (
  wrestler_id         uuid,
  wrestler_name       text,
  school_id           int,
  school_name         text,
  section             text,
  classification      text,
  athletic_conference text,
  logo_url            text,
  color_primary       text,
  pin_count           bigint,
  fastest_pin         int,
  fastest_pin_wt      int,
  pin_total_time      bigint,
  tf_count            bigint,
  fastest_tf          int,
  fastest_tf_wt       int,
  tf_total_time       bigint,
  bonus_wins          bigint,
  contested_matches   bigint,
  total_matches       bigint,
  hammer_score        numeric,
  weight_class        int,
  grade               text
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
WITH season_label AS (
  SELECT label FROM seasons WHERE id = p_season_id
),
raw AS (
  SELECT
    dmm.wrestler_a_id                                                      AS wid,
    dmm.wrestler_a_name_raw                                                AS wname,
    dmm.school_a_id                                                        AS sid,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id)      AS won,
    dmm.result_type,
    dmm.fall_time_seconds,
    dmm.is_forfeit_win                                                     AS is_forfeit,
    dmm.weight_class
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE dm.season_id = p_season_id
    AND dm.gender    = p_gender
    AND NOT dmm.is_double_forfeit
    AND dmm.wrestler_a_id IS NOT NULL

  UNION ALL

  SELECT
    dmm.wrestler_b_id,
    dmm.wrestler_b_name_raw,
    dmm.school_b_id,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_b_id),
    dmm.result_type,
    dmm.fall_time_seconds,
    dmm.is_forfeit_win,
    dmm.weight_class
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE dm.season_id = p_season_id
    AND dm.gender    = p_gender
    AND NOT dmm.is_double_forfeit
    AND dmm.wrestler_b_id IS NOT NULL

  UNION ALL

  SELECT
    tb.wrestler1_id,
    tb.wrestler1_name_raw,
    tb.wrestler1_school_id,
    (tb.winner = 1),
    tb.result_type,
    tb.fall_time_seconds,
    (tb.result_type IN ('For', 'M. For.', 'MFFL', 'Forfeit')),
    tb.weight_class
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  JOIN wrestlers w ON w.id = tb.wrestler1_id
  WHERE ist.season = (SELECT label FROM season_label)
    AND w.gender::text = p_gender
    AND tb.wrestler1_id IS NOT NULL
    AND tb.wrestler1_school_id IS NOT NULL
    AND tb.result_type <> 'Double Forfeit'

  UNION ALL

  SELECT
    tb.wrestler2_id,
    tb.wrestler2_name_raw,
    tb.wrestler2_school_id,
    (tb.winner = 2),
    tb.result_type,
    tb.fall_time_seconds,
    (tb.result_type IN ('For', 'M. For.', 'MFFL', 'Forfeit')),
    tb.weight_class
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  JOIN wrestlers w ON w.id = tb.wrestler2_id
  WHERE ist.season = (SELECT label FROM season_label)
    AND w.gender::text = p_gender
    AND tb.wrestler2_id IS NOT NULL
    AND tb.wrestler2_school_id IS NOT NULL
    AND tb.result_type <> 'Double Forfeit'
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
    COUNT(1) FILTER (WHERE r.won AND r.result_type IN ('Fall','TF','TF-1.5','MD') AND NOT r.is_forfeit)
                                                                                                  AS bonus_wins,
    COUNT(1) FILTER (WHERE NOT r.is_forfeit)                                                      AS contested_matches,
    COUNT(1)                                                                                       AS total_matches,
    MODE() WITHIN GROUP (ORDER BY r.weight_class)                                                 AS primary_weight_class
  FROM raw r
  GROUP BY r.wid, r.sid
  HAVING
    COUNT(1) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit) > 0
    OR COUNT(1) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit) > 0
    OR COUNT(1) >= 5
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
  a.primary_weight_class AS weight_class,
  wr.grade
FROM agg a
JOIN schools s ON s.id = a.sid AND s.is_nj = true
LEFT JOIN pin_wt pw ON pw.wid = a.wid
LEFT JOIN tf_wt  tw ON tw.wid = a.wid
LEFT JOIN wrestler_hammer_scores whs
  ON whs.wrestler_id = a.wid
  AND whs.season = (SELECT label FROM season_label)
LEFT JOIN wrestlers wr ON wr.id = a.wid
$$;

GRANT EXECUTE ON FUNCTION lb_rs_individual_stats(int, text) TO anon, authenticated, service_role;
