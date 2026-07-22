-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260721_school_aliases_service_role_grants.sql
--
-- Patch: grant service_role USAGE on the school_aliases sequence.
--
-- service_role INSERT into school_aliases fails with:
--   "permission denied for sequence school_aliases_id_seq"
-- The authenticated role already has this grant (admin UI works fine).
-- service_role needs it so future server-side code can insert aliases if needed.
--
-- Nothing is currently broken — no live code path uses service_role to insert
-- into school_aliases. This is a hygiene fix applied at convenience.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT USAGE, SELECT ON SEQUENCE public.school_aliases_id_seq TO service_role;

-- Also add the SPP → St. Peter's Prep abbreviation alias while we're here,
-- since it cannot be inserted via service_role until the above is applied.
-- (The admin UI at /admin/schools can add it without this migration.)
INSERT INTO public.school_aliases (school_id, alias, alias_type, notes)
VALUES (167, 'SPP', 'abbreviation', 'St. Peter''s Prep tournament bracket code')
ON CONFLICT DO NOTHING;
