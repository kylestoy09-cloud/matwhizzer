-- Powerade: add school_id for NJ NJSIAA schools missing from team scores.
-- OOS false-positives (Malvern Prep, Blair Academy, etc.) already point to
-- is_nj=false records and are handled by the UI fix (badge checks is_nj).
-- Only CBA and St. Joseph Regional (Montvale, id=394) were confirmed NJ and missing.

WITH powerade AS (
  SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1
)
UPDATE public.in_season_tournament_team_scores s
SET school_id = CASE s.school_name
  WHEN 'Christian Brothers Academy' THEN 197
  WHEN 'St. Joseph Regional' THEN 394
END
FROM powerade
WHERE s.tournament_id = powerade.id
  AND s.school_name IN ('Christian Brothers Academy', 'St. Joseph Regional')
  AND s.school_id IS NULL;
