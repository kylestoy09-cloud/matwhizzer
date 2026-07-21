-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260608_tournament_tables_grants.sql
--
-- Patch: grant missing table-level privileges on in_season_tournaments and
-- tournament_bouts.  The original schema migration (20260608_tournament_bouts_schema.sql)
-- omitted explicit GRANTs; Supabase default-privilege rules did not auto-apply
-- them, so even service_role SELECT was denied (PG error 42501).
--
-- service_role needs ALL so the import script can INSERT rows.
-- anon + authenticated need SELECT for the public-facing tournament pages.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL     ON TABLE public.in_season_tournaments TO service_role;
GRANT SELECT  ON TABLE public.in_season_tournaments TO anon, authenticated;

GRANT ALL     ON TABLE public.tournament_bouts TO service_role;
GRANT SELECT  ON TABLE public.tournament_bouts TO anon, authenticated;
