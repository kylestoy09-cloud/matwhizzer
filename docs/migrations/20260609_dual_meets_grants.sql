-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260609_dual_meets_grants.sql
--
-- Patch: grant missing table-level privileges on dual_meets and
-- dual_meet_matches.  The original schema migration (20260422_dual_meets_schema.sql)
-- and RLS migration (20260423_dual_meets_rls.sql) omitted explicit GRANTs;
-- Supabase default-privilege rules did not auto-apply them, so even
-- service_role SELECT was denied (PG error 42501).
--
-- service_role needs ALL so the import script can INSERT rows.
-- anon + authenticated need SELECT for public-facing schedule pages.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT ALL    ON TABLE public.dual_meets         TO service_role;
GRANT SELECT ON TABLE public.dual_meets         TO anon, authenticated;

GRANT ALL    ON TABLE public.dual_meet_matches  TO service_role;
GRANT SELECT ON TABLE public.dual_meet_matches  TO anon, authenticated;
