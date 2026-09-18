-- Fix lb_p_most_bonus: rename total_wins → total_matches so it is unambiguous
-- (previously named total_wins but semantically is wins + losses).
-- The UNION ALL body already counts both winner and loser sides; this makes
-- the column name and the frontend formula consistent.

DROP FUNCTION IF EXISTS public.lb_p_most_bonus(gender_type, text, smallint);
CREATE OR REPLACE FUNCTION public.lb_p_most_bonus(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_pool   text        DEFAULT 'district'::text,
  p_season smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id   uuid,
  wrestler_name text,
  school        text,
  school_name   text,
  school_id     integer,
  bonus_wins    integer,
  total_matches integer
)
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = p_gender AND season_id = p_season
      AND (
        (p_pool = 'district' AND tournament_type = 'districts') OR
        (p_pool = 'region'   AND tournament_type IN ('districts','regions','girls_regions')) OR
        (p_pool = 'state'    AND TRUE)
      )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  all_matches AS (
    -- wins
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN m.win_type IN ('FALL','TF','TF-1','TF-1.5','MD') THEN 1 ELSE 0 END AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL AND m.win_type NOT IN ('BYE','FORF')
    UNION ALL
    -- losses
    SELECT te.wrestler_id,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      0 AS is_bonus
    FROM matches m
    JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL AND m.win_type NOT IN ('BYE','FORF')
      AND m.loser_entry_id IS NOT NULL
  ),
  agg AS (
    SELECT wrestler_id, school_id,
      SUM(is_bonus)::integer  AS bonus_wins,
      COUNT(*)::integer        AS total_matches
    FROM all_matches
    GROUP BY wrestler_id, school_id
    HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    s.display_name AS school,
    s.display_name AS school_name,
    s.id           AS school_id,
    agg.bonus_wins,
    agg.total_matches
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wrestler_id
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY (agg.bonus_wins::numeric / agg.total_matches) DESC, agg.bonus_wins DESC
  LIMIT 25;
$function$;
