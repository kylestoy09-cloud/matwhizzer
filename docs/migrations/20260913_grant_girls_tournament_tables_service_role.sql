-- Grant service_role SELECT on girls tournament tables.
-- The admin tournament hub and detail pages use the service role client.
-- Without these grants the queries return null silently, showing 0 counts.

GRANT SELECT ON TABLE public.tournament_bouts_girls TO service_role;
GRANT SELECT ON TABLE public.in_season_tournaments_girls TO service_role;
GRANT SELECT ON TABLE public.in_season_tournament_participants_girls TO service_role;
GRANT SELECT ON TABLE public.in_season_tournament_seeds_girls TO service_role;
