-- =============================================================================
-- 20260731_restore_school_358_full_data.sql
--
-- Corrects the partial school 358 record created by 20260731_split_roselle_and_roselle_park.sql
-- and restores everything that was wiped by 20260725_merge_roselle_schools.sql.
--
-- History recap:
--   2026-07-16  restore_roselle_358.sql correctly rebuilt school 358 (Roselle / Abraham Clark,
--               Group 2, district 16, conference standing 3-14, website roselleschools.org/achs).
--   2026-07-24  roselle_park_alias_mascot_logo.sql added "Abraham Clark" alias + logo to 358.
--   2026-07-25  merge_roselle_schools.sql incorrectly deleted 358 again.
--   2026-07-31  split_roselle_and_roselle_park.sql recreated 358 shell — but with wrong
--               display_name ("Abraham Clark" instead of "Roselle"), wrong classification
--               ("1" instead of "2"), wrong colors, no website, no district, no conference row.
--
-- This migration:
--   1. Corrects the school 358 row to match the July-16 restore exactly.
--   2. Adds "Abraham Clark" alias (school_name type — TW sometimes uses it in schedules).
--   3. Restores conference_standings row (season 2, 3-14 overall, 0-7 div, pf 349 / pa 930).
--   4. Restores school_districts row (district 16).
--   5. Moves tournament_bouts from school_id 125 → 358 wherever school_raw = 'Roselle'.
--      These 20 bouts (Beast of the East + A-Nice Invitational, Dec 19-20 2025) are
--      Abraham Clark, not Roselle Park.
--
-- NOTE on wrestler overlap:
--   7 wrestler profiles appear in BOTH the Roselle Park dual meets (school 125) AND the
--   Abraham Clark tournament bouts. These profiles were conflated during the period when
--   "Roselle" and "Roselle Park" both routed to school 125. They need manual review:
--     Anthony Cianfrocca, Benny Abud, Cole Booth, Connor Oberlies,
--     Darryen Rodriguez, Elijah Herrera, Jake Appello.
--   Separating them is a separate task (create new profiles for one school, re-link bouts).
-- =============================================================================

BEGIN;

-- ── Step 1: Correct the school 358 row ───────────────────────────────────────
UPDATE schools
SET
  display_name        = 'Roselle',
  classification      = '2',
  section             = 'North II',
  county              = 'Union',
  town                = 'Roselle',
  mascot              = 'Rams',
  primary_color       = '#CC0022',
  secondary_color     = '#454444',
  color_primary       = '#CC0022',
  color_secondary     = '#FFFFFF',
  color_tertiary      = '#000000',
  website_url         = 'https://www.roselleschools.org/achs',
  athletic_conference = 'union-county-interscholastic-athletic-conference',
  logo_url            = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/358.png',
  is_nj               = true,
  is_combined         = false
WHERE id = 358;

-- ── Step 2: Add "Abraham Clark" alias ────────────────────────────────────────
-- TW sometimes lists Abraham Clark HS under its official name in meet schedules.
-- The "Roselle" alias (id 2109) added by the July-31 split migration is kept —
-- it is redundant with the display_name but harmless.
INSERT INTO school_aliases (school_id, alias, alias_type, notes, confirmed_at)
VALUES (358, 'Abraham Clark', 'school_name',
        'Abraham Clark HS official name — TW sometimes uses it in meet schedules',
        NOW())
ON CONFLICT DO NOTHING;

-- ── Step 3: Restore conference_standings row (id 895 is confirmed available) ─
INSERT INTO conference_standings (
  id, conference_slug, division,
  school_id, school_name, season_id,
  overall_wins, overall_losses,
  div_wins, div_losses,
  pf, pa
) VALUES (
  895,
  'union-county-interscholastic-athletic-conference',
  'Mountain',
  358, 'Roselle', 2,
  3, 14,
  0, 7,
  349, 930
);

-- ── Step 4: Restore school_districts row (district 16) ───────────────────────
INSERT INTO school_districts (school_id, district_id)
VALUES (358, 16)
ON CONFLICT DO NOTHING;

-- ── Step 5: Move tournament_bouts from school 125 → 358 (Abraham Clark bouts) ─
-- Only rows where the raw school name is "Roselle" — confirms these are Abraham Clark.
UPDATE tournament_bouts
SET wrestler1_school_id = 358
WHERE wrestler1_school_id = 125
  AND wrestler1_school_raw = 'Roselle';

UPDATE tournament_bouts
SET wrestler2_school_id = 358
WHERE wrestler2_school_id = 125
  AND wrestler2_school_raw = 'Roselle';

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT id, display_name, classification, mascot, county, website_url, is_nj
FROM schools WHERE id = 358;

SELECT id, conference_slug, division, school_name, season_id,
       overall_wins, overall_losses, div_wins, div_losses, pf, pa
FROM conference_standings WHERE school_id = 358;

SELECT school_id, district_id FROM school_districts WHERE school_id = 358;

SELECT alias, alias_type FROM school_aliases WHERE school_id = 358;

SELECT COUNT(*) AS bouts_now_at_358
FROM tournament_bouts
WHERE wrestler1_school_id = 358 OR wrestler2_school_id = 358;

COMMIT;
