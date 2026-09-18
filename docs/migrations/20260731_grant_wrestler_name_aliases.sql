-- The wrestler_name_aliases table was created without GRANT statements, so
-- service_role (used by all import/match routes) could not read or write it.
-- Aliases were silently failing to save and load, breaking the re-import flow.

GRANT ALL ON public.wrestler_name_aliases TO service_role;
GRANT SELECT ON public.wrestler_name_aliases TO anon, authenticated;
GRANT ALL ON SEQUENCE public.wrestler_name_aliases_id_seq TO service_role, authenticated;
