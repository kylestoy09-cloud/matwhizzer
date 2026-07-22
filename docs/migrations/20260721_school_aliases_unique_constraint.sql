-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260721_school_aliases_unique_constraint.sql
--
-- Add UNIQUE(alias) constraint to school_aliases.
--
-- Design decision: UNIQUE(alias) vs UNIQUE(school_id, alias)
--
-- We chose UNIQUE(alias) (globally unique alias strings) rather than
-- UNIQUE(school_id, alias) (same alias can appear for different schools).
--
-- Reason: the SPP incident taught us that one abbreviation genuinely being
-- used by two schools (South Plainfield and St. Peter's Prep) is a data
-- quality problem, not a feature.  If the same string resolves to two
-- different school_ids, matchSchools.ts uses .find() and returns the first
-- match non-deterministically — that's a silent bug, not multi-tenancy.
--
-- The right fix for true ambiguity is to use a less ambiguous alias, not to
-- allow the same string twice.  UNIQUE(alias) enforces this at the DB level.
--
-- Before applying: remove the duplicate SPP row if it was inserted by
-- 20260721_school_aliases_service_role_grants.sql:
--
--   DELETE FROM school_aliases
--   WHERE alias = 'SPP' AND school_id = 167
--   AND id NOT IN (SELECT MIN(id) FROM school_aliases WHERE alias = 'SPP');
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove duplicate SPP rows first (keep the one with the lowest id)
DELETE FROM public.school_aliases
WHERE alias = 'SPP'
  AND school_id = 167
  AND id NOT IN (
    SELECT MIN(id)
    FROM public.school_aliases
    WHERE alias = 'SPP' AND school_id = 167
  );

-- Add the unique constraint
ALTER TABLE public.school_aliases
  ADD CONSTRAINT school_aliases_alias_unique UNIQUE (alias);
