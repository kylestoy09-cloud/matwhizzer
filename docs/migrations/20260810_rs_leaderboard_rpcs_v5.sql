-- Regular Season Leaderboard RPCs v5
-- Adds qualifying filter to lb_rs_individual_stats so it only returns wrestlers
-- relevant to at least one leaderboard tab (1+ pin, 1+ TF, or 5+ total matches).
-- This keeps the result set well under the 1000-row Supabase REST API cap.
-- All other logic unchanged from v4.

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
  total_matches       bigint,
  hammer_sum          numeric
) LANGUAGE sql STABLE SECURITY INVOKER AS $$
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
  ORDER BY wid, fall_time_seconds ASC
),

agg AS (
  SELECT
    r.wid,
    MAX(r.wname)                                                                                  AS wname,
    r.sid,
    COUNT(*) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit)                AS pin_count,
    MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit) AS fastest_pin,
    COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit), 0)::bigint
                                                                                                  AS pin_total_time,
    COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit)      AS tf_count,
    MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit)
                                                                                                  AS fastest_tf,
    COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit), 0)::bigint
                                                                                                  AS tf_total_time,
    COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('Fall','TF','TF-1.5','MD') AND NOT r.is_forfeit)
                                                                                                  AS bonus_wins,
    COUNT(*)                                                                                       AS total_matches,
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
            ELSE -1
          END
      END
    ), 0) AS hammer_sum
  FROM raw r
  GROUP BY r.wid, r.sid
  HAVING
    COUNT(*) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit) > 0
    OR COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit) > 0
    OR COUNT(*) >= 5
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
  a.total_matches,
  a.hammer_sum
FROM agg a
JOIN schools s ON s.id = a.sid AND s.is_nj = true
LEFT JOIN pin_wt pw ON pw.wid = a.wid
LEFT JOIN tf_wt  tw ON tw.wid = a.wid
$$;

GRANT EXECUTE ON FUNCTION lb_rs_individual_stats(int, text) TO anon, authenticated;
