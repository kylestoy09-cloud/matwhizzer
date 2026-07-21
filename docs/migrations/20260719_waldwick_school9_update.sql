-- =============================================================================
-- MIGRATION: 20260719_waldwick_school9_update.sql
-- =============================================================================
-- School: Waldwick (id = 9)
--
-- Changes:
--   1. logo_url: updated from 9.png → 9.svg (new logo file uploaded to Storage;
--      existing reference sitewide updates automatically once this migration runs)
--   2. header_background: #034CB2 → #6A7CB5 (Light Blue)
--
-- NOTE — header_text_color / font color (#104473 Navy Blue):
--   No header_text_color column currently exists in the schools table.
--   SchoolHeader computes text color dynamically using pickTextColor(), which
--   selects the candidate from [color_primary, color_secondary, color_tertiary]
--   with the highest contrast ratio against header_background.
--   Against #6A7CB5, #104473 achieves only ~2.25:1 contrast (below the 4.5:1
--   WCAG threshold the algorithm requires), so it would not be selected —
--   the algorithm would fall back to black (~5.1:1). To enforce #104473 as the
--   displayed text color, a new header_text_color column and a SchoolHeader
--   code change would be required (separate migration + PR).
--
-- Storage path: school-logos/colored/512/9.svg (upserted 2026-07-19)
-- Prior logo:   school-logos/colored/512/9.png (still in storage; not deleted)
-- =============================================================================

BEGIN;

UPDATE schools
SET
  logo_url           = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/9.svg',
  header_background  = '#6A7CB5'
WHERE id = 9;

COMMIT;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- UPDATE schools
-- SET
--   logo_url           = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/9.png',
--   header_background  = '#034CB2'
-- WHERE id = 9;
-- COMMIT;
