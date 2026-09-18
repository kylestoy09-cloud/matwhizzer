-- =============================================================================
-- 20260731_split_roselle_and_roselle_park.sql
--
-- Problem:
--   School 125 (Abraham Clark's data ended up here when it should be school 358)
--   had its display_name set to "Roselle" and "Roselle Park" added as an alias,
--   causing both schools to route to the same record. Abraham Clark HS (which
--   TrackWrestling calls "Roselle") was never given its own record.
--
--   Verified: all 3 dual meets in school 125 belong to Roselle Park.
--   No data movement needed — wrestlers and meets stay at school 125.
--
-- Fix:
--   1. Restore school 125 as Roselle Park (Panthers)
--   2. Remove the misplaced "Roselle Park" alias from school 125
--   3. Create school 358 as Abraham Clark (Rams)
--   4. Add "Roselle" as a TW alias for school 358 (TW lists Abraham Clark as "Roselle")
--   5. Advance sequence past 358 so future inserts don't conflict
-- =============================================================================

BEGIN;

-- ── Step 1: Restore school 125 as Roselle Park ────────────────────────────────
UPDATE schools
SET
  display_name = 'Roselle Park',
  mascot       = 'Panthers',
  logo_url     = NULL   -- 358.png was intended for Abraham Clark; RP logo to be added separately
WHERE id = 125;

-- ── Step 2: Remove the stale "Roselle Park" alias from school 125 ─────────────
-- Now that display_name IS "Roselle Park", the alias is redundant.
DELETE FROM school_aliases WHERE id = 135;

-- ── Step 3: Create Abraham Clark / Roselle (school 358) ──────────────────────
INSERT INTO schools (
  id,
  display_name,
  is_nj,
  section,
  classification,
  county,
  town,
  mascot,
  is_combined,
  primary_color,
  secondary_color,
  color_primary,
  color_secondary
) VALUES (
  358,
  'Abraham Clark',
  true,
  'North II',
  '1',
  'Union',
  'Roselle',
  'Rams',
  false,
  '#CC0022',
  '#000000',
  '#CC0022',
  '#000000'
);

-- ── Step 4: Add "Roselle" as a TW alias for school 358 ───────────────────────
-- TrackWrestling lists Abraham Clark as "Roselle" in dual meet headers.
INSERT INTO school_aliases (school_id, alias, alias_type, confirmed_at)
VALUES (358, 'Roselle', 'display_name', NOW());

-- ── Step 5: Advance the schools sequence ─────────────────────────────────────
-- Ensures future auto-generated IDs start above the current max (not at 359).
SELECT setval(
  pg_get_serial_sequence('schools', 'id'),
  GREATEST((SELECT MAX(id) FROM schools), 358)
);

COMMIT;
