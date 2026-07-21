-- =============================================================================
-- MIGRATION: 20260716_restore_roselle_358.sql
-- =============================================================================
-- Restores school 358 (Roselle / Abraham Clark HS), which was incorrectly
-- deleted by 20260420_school_dedup_final.sql.
--
-- REASON FOR DELETION (April 20):
--   The dedup migration classified 358 as an "orphan" on the basis of
--   zero postseason tournament entries. This was an error:
--   20260410_suppress_shell_schools.sql had explicitly listed 358 among the
--   schools to KEEP ACTIVE, noting it had real conference W/L data. That
--   intent was overridden ten days later without re-examining it.
--
-- POLICY NOTE (do not delete solely on "zero tournament entries"):
--   A school with real regular-season match data (conference standings, dual
--   meets) is not an orphan. "Zero postseason tournament entries" alone is
--   not sufficient grounds for deletion. The correct disposition for a school
--   with conference data but no tournament entries is is_active = true with
--   an empty postseason record — not deletion.
--
-- SOURCE:
--   All values sourced from the rollback block in
--   20260420_school_dedup_final.sql (lines 79–95) plus the color columns
--   added in 20260420_school_color_columns.sql (line 298) and
--   20260420_school_colors_reseed.sql (line 290).
--
-- POST-RUN:
--   - Run the logo upload pipeline for school_id 358 (file:
--     "358 - Roselle.svg" already exists in mascot library).
--   - Verify school appears on the UCIAC conference standings page.
-- =============================================================================

BEGIN;

-- ── 1. Restore school row ─────────────────────────────────────────────────────
-- Columns present in original rollback: id through logo_url (18 cols).
-- Additional columns added since April 20: color_primary, color_secondary,
-- color_tertiary (from school_color_columns migration), header_background,
-- is_nj (from schools_is_nj migration).
--
-- Color note: legacy secondary_color = '#454444' (Gray) per rollback block;
-- color_secondary = '#FFFFFF' (White) per colors reseed — both preserved as-is.

INSERT INTO schools (
  id, display_name, short_name, is_combined,
  section, classification,
  mascot, primary_color, secondary_color, tertiary_color,
  nickname, town, county, founded_year,
  website_url, athletic_conference, twitter_handle, logo_url,
  color_primary, color_secondary, color_tertiary, header_background,
  is_nj
)
VALUES (
  358, 'Roselle', NULL, false,
  'North II', '2',
  'Rams', '#CC0022', '#454444', NULL,
  NULL, 'Roselle', 'Union', NULL,
  'https://www.roselleschools.org/achs',
  'union-county-interscholastic-athletic-conference',
  NULL, NULL,
  '#CC0022', '#FFFFFF', '#000000', NULL,
  true
);

-- ── 2. Restore school_districts row ───────────────────────────────────────────
INSERT INTO school_districts (school_id, district_id)
VALUES (358, 16);

-- ── 3. Restore conference_standings row ───────────────────────────────────────
-- Original id 895 is confirmed absent (gap between 894 and 896 in live DB).
-- Inserting with explicit id to preserve the original primary key.
INSERT INTO conference_standings (
  id, conference_slug, division,
  school_id, school_name, season_id,
  overall_wins, overall_losses,
  div_wins, div_losses,
  pf, pa
)
VALUES (
  895, 'union-county-interscholastic-athletic-conference', 'Mountain',
  358, 'Roselle', 2,
  3, 14,
  0, 7,
  349, 930
);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT id, display_name, section, classification, mascot,
       color_primary, color_secondary, is_nj
FROM   schools
WHERE  id = 358;

SELECT id, conference_slug, division, school_id, school_name,
       season_id, overall_wins, overall_losses, div_wins, div_losses, pf, pa
FROM   conference_standings
WHERE  school_id = 358;

SELECT school_id, district_id
FROM   school_districts
WHERE  school_id = 358;

COMMIT;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
--
-- DELETE FROM conference_standings WHERE id = 895;
-- DELETE FROM school_districts     WHERE school_id = 358;
-- DELETE FROM schools               WHERE id = 358;
--
-- COMMIT;
