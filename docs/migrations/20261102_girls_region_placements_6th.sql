-- Girls region placements to 6th (2026-11-02)
--
-- Girls regions place six (5th place bouts in all four regions); girls_region_placements read
-- only the final and the 3rd place bout. ROLLBACK: the version in 20261102_site_school_ids.sql.
CREATE OR REPLACE FUNCTION public.girls_region_placements(p_region text, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season),
  sides AS (
    SELECT wc.weight::int AS w,
      CASE m.round::text WHEN 'F' THEN 1 WHEN '3rd_Place' THEN 3 ELSE 5 END + CASE WHEN s.won THEN 0 ELSE 1 END AS p,
      CASE WHEN s.won THEN m.winner_entry_id ELSE m.loser_entry_id END AS entry_id
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    CROSS JOIN (VALUES (true), (false)) s(won)
    WHERE m.validated = true
      AND ((m.round = 'F' AND m.bracket_side = 'championship')
        OR (m.round::text IN ('3rd_Place', '5th_Place') AND m.bracket_side = 'consolation'))
  )
  SELECT sd.w, sd.p, te.wrestler_id,
    TRIM(COALESCE(wr.first_name, '') || ' ' || COALESCE(wr.last_name, '')),
    school_display_name(te.school_id, p_season, 'F'),
    school_display_name(te.school_id, p_season, 'F'),
    te.school_id
  FROM sides sd
  JOIN tournament_entries te ON te.id = sd.entry_id
  LEFT JOIN wrestlers wr ON wr.id = te.wrestler_id
  WHERE te.wrestler_id IS NOT NULL
  ORDER BY 1, 2
$function$;
