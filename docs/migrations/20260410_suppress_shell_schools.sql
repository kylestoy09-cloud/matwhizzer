-- MIGRATION: 20260410_suppress_shell_schools.sql
-- DESCRIPTION: Add is_active column to schools table and set it to false for 7
--              schools that are complete shells — no tournament entries, no
--              precomputed team scores, and no conference standings data in 2025-26.
--              Profile pages for these schools will 404 gracefully rather than
--              showing empty content.
-- APPLIED: NOT APPLIED TO PRODUCTION
--
-- SCOPE: DDL (ALTER TABLE) + DML (UPDATE). Existing active schools unaffected
--        (is_active defaults to true).
--
-- TARGET SCHOOLS — zero tournament entries, zero precomputed scores, zero conference standings:
--   school_id  display_name                           conference
--   ─────────  ─────────────────────────────────────  ────────────────────────────────────────────────
--     332      Jackson Memorial                       Shore Conference
--      23      Kittatinny Regional Jr/Sr High School  Northwest Jersey Athletic Conference
--     336      Montville Township                     Northwest Jersey Athletic Conference
--     407      Palisades Park                         North Jersey Interscholastic Conference
--      65      Passaic County Technical-Vocational    Big North Conference
--     344      Pennsville/Eastern                     Tri-County Conference
--     348      Wall Township                          Shore Conference
--
-- NOTE: Becton (321), Bound Brook (322), High Point (330), Keyport (192), Lakeland (5),
--       and Roselle (358) were removed from this list. They have conference W/L records
--       being inserted via migration 20260410_load_missing_conference_scores.sql and
--       are kept active.
--
-- DEPENDENCY: No hard dependency on other migrations, but should be reviewed alongside
--             20260410_load_missing_conference_scores.sql before either runs in production.
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Add is_active column if it doesn't already exist.
-- Default true ensures every existing school stays visible.
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Step 2: Suppress the 7 shell schools
UPDATE schools
SET    is_active = false
WHERE  id IN (332, 23, 336, 407, 65, 344, 348);

-- Verify: confirm exactly 7 rows updated, all existing active schools unchanged
SELECT
  COUNT(*) FILTER (WHERE is_active = false) AS suppressed_count,
  COUNT(*) FILTER (WHERE is_active = true)  AS active_count,
  COUNT(*)                                  AS total_schools
FROM schools;

-- Detail view of suppressed schools
SELECT id, display_name, is_active
FROM   schools
WHERE  is_active = false
ORDER  BY display_name;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- Option A — undo suppression only, keep the column:
--
-- UPDATE schools SET is_active = true
-- WHERE id IN (332, 23, 336, 407, 65, 344, 348);
--
-- Option B — remove the column entirely (only safe if no application code references it yet):
--
-- ALTER TABLE schools DROP COLUMN IF EXISTS is_active;
--
-- ── APPLICATION CODE NOTE ─────────────────────────────────────────────────────
-- After running this migration, the school profile page at
-- src/app/schools/[school]/page.tsx must be updated to check is_active and call
-- notFound() when false. Example:
--
--   const { data: school } = await supabase
--     .from('schools')
--     .select('id, display_name, is_active, ...')
--     .eq('id', schoolId)
--     .single()
--
--   if (!school || !school.is_active) notFound()
