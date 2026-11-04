-- roster_grade_school_complete: let the service role (admin API routes) use it (2026-11-04)
-- 20261104_roster_grade_school_complete.sql created the table without grants; new tables here
-- get none by default, so the routes got "permission denied". Admin-only: no anon or
-- authenticated access (RLS stays on with no policies).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster_grade_school_complete TO service_role;

-- ROLLBACK: REVOKE ALL ON public.roster_grade_school_complete FROM service_role;
