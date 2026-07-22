-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260722_school_aliases_oos_support.sql
--
-- Extends school_aliases to support confirmed out-of-state (OOS) school
-- decisions, and replaces the blanket UNIQUE(alias) constraint with two
-- narrower partial unique indexes.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make school_id nullable so OOS rows can store NULL.
--    PostgreSQL FKs allow NULL values by default — the FK to schools(id)
--    remains in place; NULLs simply bypass the referential check.
ALTER TABLE public.school_aliases
  ALTER COLUMN school_id DROP NOT NULL;

-- 2. Drop the full UNIQUE(alias) constraint added in
--    20260721_school_aliases_unique_constraint.sql.
--    It was correct for NJ-to-NJ disambiguation but too strict across the
--    NJ-vs-OOS boundary: "CBA" can legitimately refer to NJ's Christian
--    Brothers Academy (school_id = X) AND an out-of-state CBA (school_id
--    NULL, alias_type = 'oos').  A global unique constraint would make
--    confirming one permanently block the other.
ALTER TABLE public.school_aliases
  DROP CONSTRAINT IF EXISTS school_aliases_alias_unique;

-- 3. NJ alias uniqueness — same protection as before, scoped to rows that
--    actually point to an NJ school.  One alias string → at most one NJ
--    school.  Prevents the SPP-style bug (same abbreviation silently mapped
--    to two different NJ schools).
CREATE UNIQUE INDEX school_aliases_nj_alias_unique
  ON public.school_aliases (alias)
  WHERE school_id IS NOT NULL;

-- 4. OOS confirmation uniqueness — one OOS decision per alias string.
--    Prevents accidentally confirming the same raw name as OOS twice, which
--    would produce duplicate review-suppression rows with no harm but also
--    no benefit.
CREATE UNIQUE INDEX school_aliases_oos_alias_unique
  ON public.school_aliases (alias)
  WHERE alias_type = 'oos';

-- 5. Add confirmed_at so OOS decisions (and future NJ alias additions) carry
--    a machine-readable timestamp.  DEFAULT now() means every new insert is
--    timestamped automatically with no application changes.  Existing rows
--    get NULL, which correctly means "predates this column."
ALTER TABLE public.school_aliases
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT now();

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- ALTER TABLE public.school_aliases ALTER COLUMN school_id SET NOT NULL;
-- DROP INDEX IF EXISTS public.school_aliases_nj_alias_unique;
-- DROP INDEX IF EXISTS public.school_aliases_oos_alias_unique;
-- ALTER TABLE public.school_aliases ADD CONSTRAINT school_aliases_alias_unique UNIQUE (alias);
-- ALTER TABLE public.school_aliases DROP COLUMN IF EXISTS confirmed_at;
