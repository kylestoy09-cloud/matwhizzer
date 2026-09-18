-- RPC for PP Audit: returns meet count per school for a given season + gender
-- Aggregates both team1 and team2 appearances in dual_meets server-side.
CREATE OR REPLACE FUNCTION get_school_meet_counts(p_season_id int, p_gender text)
RETURNS TABLE(school_id int, meet_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT school_id, COUNT(*) AS meet_count
  FROM (
    SELECT team1_school_id AS school_id
      FROM dual_meets
     WHERE season_id = p_season_id AND gender = p_gender
    UNION ALL
    SELECT team2_school_id AS school_id
      FROM dual_meets
     WHERE season_id = p_season_id AND gender = p_gender
  ) combined
  GROUP BY school_id;
$$;

GRANT EXECUTE ON FUNCTION get_school_meet_counts(int, text) TO service_role;
