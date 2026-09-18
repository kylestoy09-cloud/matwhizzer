-- Regular Season Leaderboard RPCs
-- Replaces client-side raw match fetching (which hit the 1000-row REST limit).
-- Two functions return pre-aggregated stats for ~500-800 wrestlers and ~200 teams.
-- Client-side code sorts/filters the small result set by section/group/conference.

-- ── Individual stats ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lb_rs_individual_stats(p_season_id int, p_gender text)
RETURNS TABLE (
  wrestler_id     uuid,
  wrestler_name   text,
  school_id       int,
  school_name     text,
  section         text,
  classification  text,
  athletic_conference text,
  logo_url        text,
  color_primary   text,
  pin_count       bigint,
  fastest_pin     int,
  fastest_pin_wt  int,
  pin_total_time  bigint,
  tf_count        bigint,
  fastest_tf      int,
  fastest_tf_wt   int,
  tf_total_time   bigint,
  bonus_wins      bigint,
  total_matches   bigint,
  hammer_sum      numeric
) LANGUAGE sql STABLE SECURITY INVOKER AS $$
WITH raw AS (
  -- Normalize each match into two participant rows (one per side)
  SELECT
    dmm.wrestler_a_id                                                      AS wid,
    dmm.wrestler_a_name_raw                                                AS wname,
    dmm.school_a_id                                                        AS sid,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id)      AS won,
    dmm.result_type,
    dmm.fall_time_seconds,
    dmm.is_forfeit_win,
    dmm.weight_class
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE dm.season_id = p_season_id
    AND dm.gender    = p_gender
    AND dm.is_playoff = false
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
    AND dm.is_playoff = false
    AND NOT dmm.is_double_forfeit
    AND dmm.wrestler_b_id IS NOT NULL
),

-- Weight class where fastest pin occurred (DISTINCT ON gives the first row per wrestler ordered by time)
pin_wt AS (
  SELECT DISTINCT ON (wid)
    wid, weight_class AS fastest_pin_wt
  FROM raw
  WHERE won AND result_type = 'Fall' AND NOT is_forfeit_win AND fall_time_seconds IS NOT NULL
  ORDER BY wid, fall_time_seconds ASC
),

tf_wt AS (
  SELECT DISTINCT ON (wid)
    wid, weight_class AS fastest_tf_wt
  FROM raw
  WHERE won AND result_type IN ('TF','TF-1.5') AND NOT is_forfeit_win AND fall_time_seconds IS NOT NULL
  ORDER BY wid, fall_time_seconds ASC
),

agg AS (
  SELECT
    r.wid,
    MAX(r.wname)                                                                   AS wname,
    r.sid,
    COUNT(*) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit_win)
                                                                                   AS pin_count,
    MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit_win)
                                                                                   AS fastest_pin,
    COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit_win), 0)::bigint
                                                                                   AS pin_total_time,
    COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit_win)
                                                                                   AS tf_count,
    MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit_win)
                                                                                   AS fastest_tf,
    COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit_win), 0)::bigint
                                                                                   AS tf_total_time,
    COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('Fall','TF','TF-1.5','MD') AND NOT r.is_forfeit_win)
                                                                                   AS bonus_wins,
    COUNT(*)                                                                       AS total_matches,
    COALESCE(SUM(
      CASE
        WHEN r.is_forfeit_win THEN 0
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
JOIN schools s ON s.id = a.sid
LEFT JOIN pin_wt pw ON pw.wid = a.wid
LEFT JOIN tf_wt  tw ON tw.wid = a.wid
$$;

-- ── Team stats ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION lb_rs_team_stats(p_season_id int, p_gender text)
RETURNS TABLE (
  school_id           int,
  school_name         text,
  section             text,
  classification      text,
  athletic_conference text,
  logo_url            text,
  color_primary       text,
  pin_count           bigint,
  fastest_pin         int,
  pin_total_time      bigint,
  tf_count            bigint,
  fastest_tf          int,
  tf_total_time       bigint,
  bonus_wins          bigint,
  total_matches       bigint,
  hammer_sum          numeric
) LANGUAGE sql STABLE SECURITY INVOKER AS $$
WITH raw AS (
  SELECT
    dmm.school_a_id                                                        AS sid,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_a_id)      AS won,
    dmm.result_type,
    dmm.fall_time_seconds,
    dmm.is_forfeit_win
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE dm.season_id = p_season_id
    AND dm.gender    = p_gender
    AND dm.is_playoff = false
    AND NOT dmm.is_double_forfeit
    AND dmm.school_a_id IS NOT NULL
    AND dmm.wrestler_a_id IS NOT NULL   -- require wrestler identity to attribute win correctly

  UNION ALL

  SELECT
    dmm.school_b_id,
    (dmm.winner_id IS NOT NULL AND dmm.winner_id = dmm.wrestler_b_id),
    dmm.result_type,
    dmm.fall_time_seconds,
    dmm.is_forfeit_win
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE dm.season_id = p_season_id
    AND dm.gender    = p_gender
    AND dm.is_playoff = false
    AND NOT dmm.is_double_forfeit
    AND dmm.school_b_id IS NOT NULL
    AND dmm.wrestler_b_id IS NOT NULL
)

SELECT
  s.id                AS school_id,
  s.display_name      AS school_name,
  s.section,
  s.classification,
  s.athletic_conference,
  s.logo_url,
  s.color_primary,
  COUNT(*) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit_win)
                                                                           AS pin_count,
  MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit_win)
                                                                           AS fastest_pin,
  COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type = 'Fall' AND NOT r.is_forfeit_win), 0)::bigint
                                                                           AS pin_total_time,
  COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit_win)
                                                                           AS tf_count,
  MIN(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit_win)
                                                                           AS fastest_tf,
  COALESCE(SUM(r.fall_time_seconds) FILTER (WHERE r.won AND r.result_type IN ('TF','TF-1.5') AND NOT r.is_forfeit_win), 0)::bigint
                                                                           AS tf_total_time,
  COUNT(*) FILTER (WHERE r.won AND r.result_type IN ('Fall','TF','TF-1.5','MD') AND NOT r.is_forfeit_win)
                                                                           AS bonus_wins,
  COUNT(*)                                                                 AS total_matches,
  COALESCE(SUM(
    CASE
      WHEN r.is_forfeit_win THEN 0
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
JOIN schools s ON s.id = r.sid
GROUP BY s.id, s.display_name, s.section, s.classification, s.athletic_conference, s.logo_url, s.color_primary
$$;

-- Grant read access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION lb_rs_individual_stats(int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION lb_rs_team_stats(int, text)       TO anon, authenticated;
