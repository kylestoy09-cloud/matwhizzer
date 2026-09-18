-- Fix: in_season_tournament_team_scores was created without explicit grants,
-- causing "permission denied" errors for the service role during import.
GRANT ALL ON public.in_season_tournament_team_scores TO service_role;
GRANT SELECT ON public.in_season_tournament_team_scores TO authenticated;
GRANT SELECT ON public.in_season_tournament_team_scores TO anon;
