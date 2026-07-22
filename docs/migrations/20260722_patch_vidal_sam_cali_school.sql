-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260722_patch_vidal_sam_cali_school.sql
--
-- Root cause: the Sam Cali bracket CSV used "HTWN" as Hackettstown's
-- abbreviation.  No alias existed for "HTWN" in school_aliases, so the
-- importer's fuzzy matcher resolved it to "Haddon Twp Hgh School"
-- (school_id=240, Haddon Township) instead of Hackettstown (school_id=112).
--
-- This affected all 4 Steven Vidal (wrestler_id = ccd2a21c-ac71-41bf-aaf3-db101f1a70ea)
-- bouts in Sam Cali Battle for The Belt (tournament_id = bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56):
--   R2      e2d544e5  wrestler1_school_id 240 → 112
--   QF      2639b343  wrestler1_school_id 240 → 112
--   SF      1982e138  wrestler2_school_id 240 → 112
--   3rd     64389b7e  wrestler1_school_id 240 → 112
--
-- APPLIED: 2026-07-22 via service_role PATCH.
-- ─────────────────────────────────────────────────────────────────────────────

-- Fix the 3 bouts where Vidal is wrestler1
UPDATE tournament_bouts
   SET wrestler1_school_id = 112
 WHERE id IN (
   'e2d544e5-fa0e-4cf5-8046-47b8e91805d5',
   '2639b343-fa3a-424f-aa68-81a4b6fe3e95',
   '64389b7e-1ab3-4f3c-8027-aafc6f2626f5'
 );

-- Fix the 1 bout where Vidal is wrestler2
UPDATE tournament_bouts
   SET wrestler2_school_id = 112
 WHERE id = '1982e138-eecf-4c80-98bd-c6fff647e803';

-- Add missing alias so future Sam Cali imports resolve correctly
INSERT INTO school_aliases (school_id, alias, alias_type, notes)
VALUES (
  112,
  'HTWN',
  'abbreviation',
  'Hackettstown abbreviation used in Sam Cali bracket CSV — previously fuzzy-matched wrong to Haddon Township'
)
ON CONFLICT DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT id, round, wrestler1_school_id, wrestler2_school_id
--   FROM tournament_bouts
--  WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
--    AND (nj_wrestler1_id = 'ccd2a21c-ac71-41bf-aaf3-db101f1a70ea'
--      OR nj_wrestler2_id = 'ccd2a21c-ac71-41bf-aaf3-db101f1a70ea');
-- Expected: all 4 rows show 112 in the relevant school_id column.

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- UPDATE tournament_bouts SET wrestler1_school_id = 240
--  WHERE id IN ('e2d544e5-...', '2639b343-...', '64389b7e-...');
-- UPDATE tournament_bouts SET wrestler2_school_id = 240
--  WHERE id = '1982e138-...';
-- DELETE FROM school_aliases WHERE alias = 'HTWN' AND school_id = 112;
