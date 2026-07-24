-- docs/migrations/20260724_oos_stubs.sql
--
-- Enables full data storage for out-of-state (OOS) opponents in dual meets.
--
-- PROBLEM: When an NJ team faced an OOS opponent, the dual meet import left
-- team1_school_id / team2_school_id NULL (no NJ school record), and all
-- individual match slots for OOS wrestlers were NULL as well.  The schedule
-- tab on school pages showed "—" for the opponent; the wrestler's match
-- history omitted every OOS bout entirely.
--
-- SOLUTION: Two small schema additions, used together with import-route logic
-- that creates lightweight "stub" records for OOS schools and wrestlers:
--
--   1. wrestlers.is_stub = true marks OOS wrestlers.  They have a real UUID,
--      first/last name, and appear on NJ wrestlers' match lists, but do not
--      have a profile page.
--
--   2. dual_meets.team{1,2}_school_name_raw always stores the raw team name
--      string from the import source, providing a human-readable fallback even
--      if the school stub was not created (e.g. import from older data).
--
-- NOTE: schools.is_nj already exists (20260422_schools_is_nj.sql) and was
-- designed for exactly this purpose — OOS stub schools receive is_nj = false.
-- No change to the schools table is needed here.
--
-- The import route (import-meets/route.ts) is updated separately to:
--   a. Pre-create OOS school stubs (is_nj=false) for all unresolved team names.
--   b. Create OOS wrestler stubs (is_stub=true) linked to those school stubs.
--   c. Write team{1,2}_school_name_raw on every dual_meets INSERT.
--
-- APPLY ORDER: Apply before running new dual meet imports. Safe to apply to
-- live data — both columns are nullable/defaulted with no NOT NULL constraint.
-- Existing rows are unaffected; they retain NULL in both new columns.

BEGIN;

-- ── 1. Wrestler stub flag ──────────────────────────────────────────────────────
ALTER TABLE public.wrestlers
  ADD COLUMN IF NOT EXISTS is_stub boolean NOT NULL DEFAULT false;

-- ── 2. Raw team name insurance on dual_meets ───────────────────────────────────
ALTER TABLE public.dual_meets
  ADD COLUMN IF NOT EXISTS team1_school_name_raw text,
  ADD COLUMN IF NOT EXISTS team2_school_name_raw text;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
-- ALTER TABLE public.wrestlers     DROP COLUMN IF EXISTS is_stub;
-- ALTER TABLE public.dual_meets    DROP COLUMN IF EXISTS team1_school_name_raw;
-- ALTER TABLE public.dual_meets    DROP COLUMN IF EXISTS team2_school_name_raw;
-- COMMIT;
