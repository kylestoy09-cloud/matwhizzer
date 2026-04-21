-- =============================================================================
-- MIGRATION: 20260420_lb_gp_team_points_school_id.sql
-- =============================================================================
-- Adds school_id to the lb_gp_team_points RPC return type.
-- Also adds p_season parameter (DEFAULT NULL, unused — for parity with caller).
-- school_id is resolved via LEFT JOIN schools ON display_name match.
--
-- ROLLBACK: recreate prior version with no school_id column (see fix_lb_gp_rpcs.py)
-- =============================================================================

-- Drop old 1-arg signature to avoid ambiguity
DROP FUNCTION IF EXISTS lb_gp_team_points(text);

CREATE OR REPLACE FUNCTION lb_gp_team_points(p_pool text, p_season integer DEFAULT NULL)
RETURNS TABLE(school text, school_name text, school_id integer, total_points numeric, match_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F'
      AND (
        (p_pool = 'region' AND name LIKE 'Girl_s Regions%')
        OR (p_pool = 'state'  AND name LIKE 'Girl_s%')
        OR p_pool IS NULL
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_context_raw
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_context_raw IS NOT NULL
      AND t2.name NOT LIKE '%States%' AND t2.gender = 'F'
    ORDER BY te2.wrestler_id, CASE WHEN t2.name LIKE '%Regions%' THEN 0 ELSE 1 END
  )
  SELECT
    COALESCE(te.school_context_raw, sl.school_context_raw) AS school,
    COALESCE(sn.school_name, te.school_context_raw, sl.school_context_raw) AS school_name,
    s.id AS school_id,
    ROUND(SUM(
      CASE WHEN m.bracket_side = 'championship'::bracket_side THEN
        CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 3.0
             WHEN m.win_type::text LIKE 'TF%' THEN 2.5
             WHEN m.win_type = 'MD'::win_type THEN 2.0 ELSE 1.0 END
      ELSE
        CASE WHEN m.win_type IN ('FALL'::win_type,'FORF'::win_type,'INJ'::win_type,'DQ'::win_type) THEN 2.5
             WHEN m.win_type::text LIKE 'TF%' THEN 2.0
             WHEN m.win_type = 'MD'::win_type THEN 1.5 ELSE 0.5 END
      END
    ), 1) AS total_points,
    COUNT(*) AS match_count
  FROM matches m
  JOIN pool_tournaments pt ON m.tournament_id = pt.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  LEFT JOIN school_names sn ON sn.abbreviation = COALESCE(te.school_context_raw, sl.school_context_raw)
  LEFT JOIN schools s ON s.display_name = COALESCE(sn.school_name, te.school_context_raw, sl.school_context_raw)
  WHERE m.validated = true AND m.win_type IS NOT NULL
  GROUP BY COALESCE(te.school_context_raw, sl.school_context_raw),
           COALESCE(sn.school_name, te.school_context_raw, sl.school_context_raw),
           s.id
  ORDER BY total_points DESC LIMIT 12
$$;
