-- Grant read access on postseason tables to service_role.
-- These tables predate the project's standard grant convention and were missing
-- service_role SELECT grants, breaking the Hammer Score recalculation script.

GRANT SELECT ON public.tournaments        TO service_role;
GRANT SELECT ON public.matches            TO service_role;

-- Rollback: REVOKE SELECT ON public.tournaments, public.matches FROM service_role;
