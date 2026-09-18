-- Fix school_directory RPC to exclude is_combined=true schools.
-- Combined/co-op records (is_combined=true) were appearing in boys school search
-- when tournament_entries were incorrectly linked to a combined school record.
-- Adding the filter ensures only active single-program schools appear in results.

CREATE OR REPLACE FUNCTION public.school_directory(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(
  school        text,
  school_name   text,
  school_id     integer,
  total_points  numeric,
  wrestler_count bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH competitors AS (
    SELECT DISTINCT te.school_id, te.wrestler_id
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id AND t.season_id = p_season AND t.gender = p_gender
    JOIN wrestlers w ON w.id = te.wrestler_id AND w.first_name <> ''
    WHERE te.school_id IS NOT NULL
  ),
  pts AS (
    SELECT te.school_id,
      SUM(CASE m.bracket_side
        WHEN 'championship' THEN CASE m.win_type WHEN 'FALL' THEN 3.0 WHEN 'TF-1.5' THEN 2.5 WHEN 'TF' THEN 2.5 WHEN 'MD' THEN 2.0 WHEN 'DEC' THEN 1.0 ELSE 0 END
        WHEN 'consolation'  THEN CASE m.win_type WHEN 'FALL' THEN 2.5 WHEN 'TF-1.5' THEN 2.0 WHEN 'TF' THEN 2.0 WHEN 'MD' THEN 1.5 WHEN 'DEC' THEN 0.5 ELSE 0 END
        ELSE 0 END) AS total_pts
    FROM matches m
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season AND t.gender = p_gender
    WHERE m.validated = true AND te.school_id IS NOT NULL
    GROUP BY te.school_id
  )
  SELECT s.display_name AS school,
    s.display_name AS school_name,
    s.id AS school_id,
    COALESCE(ROUND(p.total_pts, 1), 0) AS total_points,
    COUNT(DISTINCT c.wrestler_id)::bigint AS wrestler_count
  FROM competitors c
  JOIN schools s ON s.id = c.school_id AND s.is_combined = false
  LEFT JOIN pts p ON p.school_id = c.school_id
  GROUP BY s.id, s.display_name, p.total_pts
  ORDER BY s.display_name;
$function$;
