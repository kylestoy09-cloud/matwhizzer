-- docs/migrations/20260907_document_school_directory_rpc.sql
--
-- RECONSTRUCTED — this function was created directly in the Supabase dashboard
-- with no migration file. Documenting it here for auditability.
--
-- school_directory(p_gender, p_season)
--   Returns all schools that have wrestlers entered in postseason tournaments
--   for the given gender and season. Drives the girls/boys school search on
--   the public site (/girls, /boys, /girls/schools, /boys/schools pages).
--
-- Gender separation: enforced by joining tournament_entries → tournaments
--   on t.gender = p_gender. Only schools with entries in gender-matching
--   tournaments appear. Boys schools cannot appear in girls results and
--   vice versa, provided tournament_entries.school_id values are correct.
--
-- Callers:
--   src/app/(site)/girls/page.tsx
--   src/app/(site)/boys/page.tsx
--   src/app/(site)/girls/schools/page.tsx
--   src/app/(site)/boys/schools/page.tsx
--   src/app/(site)/postseason/individual/girls/page.tsx
--   src/app/(site)/postseason/individual/boys/page.tsx

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
  JOIN schools s ON s.id = c.school_id
  LEFT JOIN pts p ON p.school_id = c.school_id
  GROUP BY s.id, s.display_name, p.total_pts
  ORDER BY s.display_name;
$function$;
