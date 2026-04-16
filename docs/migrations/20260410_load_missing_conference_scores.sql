-- MIGRATION: 20260410_load_missing_conference_scores.sql
-- DESCRIPTION: Insert conference W/L standings for 9 schools that appear in the
--              2025-26 Conference Standings source file but have no records in
--              the conference_standings table. Data pulled directly from
--              "Conference Standings 2025-26.txt" (2025-26 season, season_id = 2).
-- APPLIED: NOT APPLIED TO PRODUCTION
--
-- SCOPE: INSERT only — no existing rows modified.
--
-- TARGET SCHOOLS (school_id → display_name → conference):
--   321  Becton               North Jersey Interscholastic Conference (Colonial div)
--   322  Bound Brook          Skyland Conference (Mountain div)
--   330  High Point           Northwest Jersey Athletic Conference (Freedom div)
--   192  Keyport              Shore Conference (H div)
--     5  Lakeland             Big North Conference (Independence div)
--   384  Monmouth             Shore Conference (G div)
--    35  Northern Highlands   Big North Conference (Freedom div)
--   331  Paterson Kennedy     Big North Conference (Liberty div)
--   358  Roselle              Union County Interscholastic Athletic Conference (Mountain div)
--
-- NOTE: 6 of these 9 schools also appear in migration 20260410_suppress_shell_schools.sql
--       (Becton, Bound Brook, High Point, Keyport, Lakeland, Roselle). That migration
--       sets is_active = false because they have no postseason tournament entries — a school
--       can have conference W/L data without having competed in Districts/Regions/State.
--
-- NOTE: precomputed_team_scores is intentionally NOT modified here. That table stores
--       postseason tournament scoring (districts/regions/state points). These schools
--       have no postseason entries, so there are no tournament points to insert.
--       If Paul decides to backfill historical postseason data for any of these schools,
--       a separate migration should handle it.
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Safety check: confirm we are not inserting duplicate rows
-- (season_id=2, conference_slug, school_id combo should not already exist)
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM conference_standings
  WHERE season_id = 2
    AND school_id IN (321, 322, 330, 192, 5, 384, 35, 331, 358);

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'Pre-flight check failed: % row(s) already exist in conference_standings for season_id=2 and these school_ids. Aborting to prevent duplicates.',
      dup_count;
  END IF;
END $$;

-- ── Big North Conference ──────────────────────────────────────────────────────
-- Source: "Conference Standings 2025-26.txt", BIG NORTH CONFERENCE section

INSERT INTO conference_standings
  (season_id, conference_slug, division, school_id, school_name,
   overall_wins, overall_losses, div_wins, div_losses, pf, pa)
VALUES
  -- Division: Freedom
  (2, 'big-north-conference', 'Freedom',      35, 'Northern Highlands', 18,  7, 3, 1, 1156,  749),
  -- Division: Independence
  (2, 'big-north-conference', 'Independence',  5, 'Lakeland',           14,  9, 1, 4,  996,  740),
  -- Division: Liberty
  (2, 'big-north-conference', 'Liberty',      331, 'Paterson Kennedy',   6, 15, 1, 4, 4597,  943);

-- ── North Jersey Interscholastic Conference ───────────────────────────────────
-- Source: NORTH JERSEY INTERSCHOLASTIC CONFERENCE section

INSERT INTO conference_standings
  (season_id, conference_slug, division, school_id, school_name,
   overall_wins, overall_losses, div_wins, div_losses, pf, pa)
VALUES
  -- Division: Colonial
  (2, 'north-jersey-interscholastic-conference', 'Colonial', 321, 'Becton', 8, 1, 1, 4, 737, 613);

-- ── Northwest Jersey Athletic Conference ─────────────────────────────────────
-- Source: NORTHWEST JERSEY ATHLETIC CONFERENCE section

INSERT INTO conference_standings
  (season_id, conference_slug, division, school_id, school_name,
   overall_wins, overall_losses, div_wins, div_losses, pf, pa)
VALUES
  -- Division: Freedom
  (2, 'northwest-jersey-athletic-conference', 'Freedom', 330, 'High Point', 13, 12, 4, 0, 952, 784);

-- ── Shore Conference ──────────────────────────────────────────────────────────
-- Source: SHORE CONFERENCE section

INSERT INTO conference_standings
  (season_id, conference_slug, division, school_id, school_name,
   overall_wins, overall_losses, div_wins, div_losses, pf, pa)
VALUES
  -- Division: G
  (2, 'shore-conference', 'G', 384, 'Monmouth',  10, 15, 2, 3, 3881, 988),
  -- Division: H
  (2, 'shore-conference', 'H', 192, 'Keyport',    2, 18, 0, 5,  525, 934);

-- ── Skyland Conference ────────────────────────────────────────────────────────
-- Source: SKYLAND CONFERENCE section

INSERT INTO conference_standings
  (season_id, conference_slug, division, school_id, school_name,
   overall_wins, overall_losses, div_wins, div_losses, pf, pa)
VALUES
  -- Division: Mountain
  (2, 'skyland-conference', 'Mountain', 322, 'Bound Brook', 6, 16, 3, 2, 664, 977);

-- ── Union County Interscholastic Athletic Conference ──────────────────────────
-- Source: UNION COUNTY INTERSCHOLASTIC ATHLETIC CONFERENCE section

INSERT INTO conference_standings
  (season_id, conference_slug, division, school_id, school_name,
   overall_wins, overall_losses, div_wins, div_losses, pf, pa)
VALUES
  -- Division: Mountain
  (2, 'union-county-interscholastic-athletic-conference', 'Mountain', 358, 'Roselle', 3, 14, 0, 7, 349, 930);

-- Verify inserts
SELECT school_id, school_name, conference_slug, division,
       overall_wins, overall_losses, div_wins, div_losses
FROM   conference_standings
WHERE  season_id = 2
  AND  school_id IN (321, 322, 330, 192, 5, 384, 35, 331, 358)
ORDER  BY conference_slug, division, school_name;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- To undo this migration, run:
--
-- DELETE FROM conference_standings
-- WHERE season_id = 2
--   AND school_id IN (321, 322, 330, 192, 5, 384, 35, 331, 358);
