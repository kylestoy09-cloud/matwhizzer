-- Wrestler count by primary weight — 2025-26 season
-- Primary weight rules:
--   1. Weight wrestled in districts (tournament_entries for tournament_type='districts')
--   2. Else: most common weight across all matches
--   3. Tiebreaker: higher weight
-- Only NJ boys wrestlers who competed in at least 1 match.

WITH

-- All NJ boys match appearances in 2025-26 with weight
all_matches AS (
  SELECT dmm.wrestler_a_id AS wrestler_id, dmm.weight_class AS weight
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id AND dm.season_id = 2 AND dm.gender = 'M'
  JOIN schools sc ON sc.id = dmm.school_a_id AND sc.is_nj = true
  WHERE dmm.wrestler_a_id IS NOT NULL AND NOT dmm.is_double_forfeit AND dmm.weight_class IS NOT NULL

  UNION ALL

  SELECT dmm.wrestler_b_id, dmm.weight_class
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id AND dm.season_id = 2 AND dm.gender = 'M'
  JOIN schools sc ON sc.id = dmm.school_b_id AND sc.is_nj = true
  WHERE dmm.wrestler_b_id IS NOT NULL AND NOT dmm.is_double_forfeit AND dmm.weight_class IS NOT NULL

  UNION ALL

  SELECT tb.wrestler1_id, tb.weight_class
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id AND ist.season = '2025-26'
  JOIN schools sc ON sc.id = tb.wrestler1_school_id AND sc.is_nj = true
  JOIN wrestlers w ON w.id = tb.wrestler1_id AND w.gender::text = 'M'
  WHERE tb.wrestler1_id IS NOT NULL AND tb.result_type <> 'Double Forfeit' AND tb.weight_class IS NOT NULL

  UNION ALL

  SELECT tb.wrestler2_id, tb.weight_class
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id AND ist.season = '2025-26'
  JOIN schools sc ON sc.id = tb.wrestler2_school_id AND sc.is_nj = true
  JOIN wrestlers w ON w.id = tb.wrestler2_id AND w.gender::text = 'M'
  WHERE tb.wrestler2_id IS NOT NULL AND tb.result_type <> 'Double Forfeit' AND tb.weight_class IS NOT NULL
),

-- Distinct NJ boys wrestlers who appeared in at least 1 match
active_wrestlers AS (
  SELECT DISTINCT wrestler_id FROM all_matches
),

-- District weight (from postseason tournament_entries, tournament_type = 'districts')
district_weight AS (
  SELECT DISTINCT ON (te.wrestler_id)
    te.wrestler_id,
    wc.weight AS district_wt
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
    AND t.tournament_type = 'districts'
    AND t.season_id = 2
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  WHERE te.wrestler_id IN (SELECT wrestler_id FROM active_wrestlers)
),

-- Match count per wrestler per weight (for fallback)
weight_counts AS (
  SELECT wrestler_id, weight, COUNT(*) AS cnt
  FROM all_matches
  GROUP BY wrestler_id, weight
),

-- Fallback: most common weight, higher weight wins ties
fallback_weight AS (
  SELECT DISTINCT ON (wrestler_id)
    wrestler_id,
    weight AS fallback_wt
  FROM weight_counts
  ORDER BY wrestler_id, cnt DESC, weight DESC
),

-- Assign each wrestler their primary weight
primary_weight AS (
  SELECT
    aw.wrestler_id,
    COALESCE(dw.district_wt, fw.fallback_wt) AS primary_weight
  FROM active_wrestlers aw
  LEFT JOIN district_weight dw ON dw.wrestler_id = aw.wrestler_id
  LEFT JOIN fallback_weight fw ON fw.wrestler_id = aw.wrestler_id
)

SELECT
  primary_weight AS weight,
  COUNT(*) AS wrestler_count
FROM primary_weight
WHERE primary_weight IS NOT NULL
GROUP BY primary_weight
ORDER BY primary_weight;
