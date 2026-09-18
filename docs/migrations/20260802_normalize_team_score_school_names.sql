-- Normalize school_name in team scores to match official schools.display_name.
-- Applies to all tournaments where school_id is set.
-- Going forward, all team score inserts must use schools.display_name when school_id is known.

UPDATE public.in_season_tournament_team_scores s
SET school_name = sc.display_name
FROM public.schools sc
WHERE sc.id = s.school_id
  AND s.school_name != sc.display_name;
