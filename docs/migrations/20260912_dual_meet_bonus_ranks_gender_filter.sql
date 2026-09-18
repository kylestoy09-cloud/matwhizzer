-- Fix: tournament bouts in dual_meet_bonus_ranks were not filtered by gender,
-- causing girls tournament pins to inflate boys rankings (and vice versa).
-- Adds AND ist.gender = p_gender to the tournament bouts branch.

CREATE OR REPLACE FUNCTION dual_meet_bonus_ranks(
  p_school_id    INT,
  p_season_id    INT     DEFAULT 2,
  p_gender       TEXT    DEFAULT 'M',
  p_season_label TEXT    DEFAULT '2025-26'
)
RETURNS TABLE(pins_rank BIGINT, techs_rank BIGINT, bonus_pct_rank BIGINT)
LANGUAGE sql STABLE AS $$
WITH wins AS (
  -- Dual meet wins (gender-filtered)
  SELECT
    CASE
      WHEN dmm.winner_id = dmm.wrestler_a_id THEN dmm.school_a_id
      WHEN dmm.winner_id = dmm.wrestler_b_id THEN dmm.school_b_id
    END                     AS school_id,
    UPPER(dmm.result_type)  AS result_type
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE dm.season_id       = p_season_id
    AND dm.gender          = p_gender
    AND NOT dmm.is_double_forfeit
    AND dmm.winner_id IS NOT NULL

  UNION ALL

  -- In-season tournament wins (season label + gender)
  SELECT
    CASE
      WHEN tb.winner = 1 THEN tb.wrestler1_school_id
      WHEN tb.winner = 2 THEN tb.wrestler2_school_id
    END                     AS school_id,
    UPPER(tb.result_type)   AS result_type
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  WHERE ist.season  = p_season_label
    AND ist.gender  = p_gender
    AND tb.winner IS NOT NULL
),
agg AS (
  SELECT
    school_id,
    COUNT(*)                                         AS total_wins,
    COUNT(*) FILTER (WHERE result_type = 'FALL')     AS pins,
    COUNT(*) FILTER (WHERE result_type = 'TF')       AS techs,
    COUNT(*) FILTER (WHERE result_type = 'MD')       AS mds
  FROM wins
  WHERE school_id IS NOT NULL
  GROUP BY school_id
),
ranked AS (
  SELECT
    school_id,
    RANK() OVER (ORDER BY pins DESC)  AS pins_rank,
    RANK() OVER (ORDER BY techs DESC) AS techs_rank,
    RANK() OVER (
      ORDER BY CASE WHEN total_wins > 0
        THEN (pins + techs + mds)::NUMERIC / total_wins
        ELSE 0
      END DESC
    )                                 AS bonus_pct_rank
  FROM agg
)
SELECT pins_rank, techs_rank, bonus_pct_rank
FROM ranked
WHERE school_id = p_school_id;
$$;
