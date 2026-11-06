-- docs/migrations/20261106_dual_adjustments_public_read.sql
--
-- The dual meet page (src/app/(site)/meets/[id]/page.tsx) lists a dual's team-point adjustments
-- (deductions, tie-breaker criteria points, corrections) under its bouts, so the bouts add up to
-- the final score. The page reads with the public (anon) client: allow reading these two tables.
-- Run in the Supabase SQL editor.

BEGIN;

GRANT SELECT ON dual_meet_deductions, dual_meet_deductions_girls TO anon, authenticated;
DROP POLICY IF EXISTS dual_meet_deductions_read ON dual_meet_deductions;
DROP POLICY IF EXISTS dual_meet_deductions_girls_read ON dual_meet_deductions_girls;
CREATE POLICY dual_meet_deductions_read       ON dual_meet_deductions       FOR SELECT USING (true);
CREATE POLICY dual_meet_deductions_girls_read ON dual_meet_deductions_girls FOR SELECT USING (true);

COMMIT;

-- Verify: anon can read (expect a count, not a permission error)
SET ROLE anon; SELECT count(*) FROM dual_meet_deductions; RESET ROLE;
