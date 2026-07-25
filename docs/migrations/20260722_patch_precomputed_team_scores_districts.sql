-- =============================================================================
-- MIGRATION: 20260722_patch_precomputed_team_scores_districts.sql
-- =============================================================================
-- Follow-up to 20260722_patch_precomputed_team_scores_school_id.sql.
--
-- The first patch was derived by sampling top_postseason_team_scores(limit=30),
-- which only surfaces teams ranked in the top 30 by aggregated postseason total.
-- Four district-level rows with NULL school_id were below that cut and missed.
-- These rows were found by the correct diagnostic:
--   SELECT * FROM precomputed_team_scores WHERE school_id IS NULL
-- which should always be the starting point for this type of audit.
--
-- All four are boys_districts rows (season_id=2, no season filter needed):
--   id=2185  "West Windsor-Plainsboro South"  tournament_id=158
--   id=2187  "West Windsor-Plainsboro North"   tournament_id=158
--   id=2245  "Haddon Township"                 tournament_id=164
--   id=2282  "St Joseph (Hammonton)"           tournament_id=168
--
-- The first three (West Windsor South/North, Haddon Township) have school_names
-- that exactly match schools.display_name. They were not caught by the April
-- 2026 backfill because their rows were inserted into precomputed_team_scores
-- after that backfill ran. The targeted patches from the first migration also
-- missed them because those patches only listed known name-mismatch schools.
--
-- "St Joseph (Hammonton)" is a name-format miss:
--   stored as: "St Joseph (Hammonton)"
--   display_name: "St. Joseph's (Hammonton)"  (school_id=356)
-- The bullet importer's _NJ_SCHOOL_OVERRIDES already maps "St. Joseph (Hammonton)"
-- → 356, confirming this ID.
--
-- After this migration, SELECT * FROM precomputed_team_scores WHERE school_id IS
-- NULL should return 0 rows.
--
-- Confirmed school_id values (all four schools have logo_url set):
--   176  West Windsor-Plainsboro North   (display_name exact match)
--   177  West Windsor-Plainsboro South   (display_name exact match)
--   240  Haddon Township                 (display_name exact match)
--   356  St. Joseph's (Hammonton)        ← stored as "St Joseph (Hammonton)"
--
-- Other tables audited — none have the same school_name-as-key pattern:
--   tournament_bouts:   uses wrestler1_school_id / wrestler2_school_id (typed IDs)
--   tournament_entries: uses school_id directly
--   No other precomputed/cache tables with this structure exist.
-- =============================================================================

BEGIN;

UPDATE public.precomputed_team_scores
SET    school_id = 177
WHERE  school_name = 'West Windsor-Plainsboro South'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 176
WHERE  school_name = 'West Windsor-Plainsboro North'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 240
WHERE  school_name = 'Haddon Township'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 356
WHERE  school_name = 'St Joseph (Hammonton)'
  AND  school_id IS NULL;

COMMIT;


-- =============================================================================
-- VERIFY (run after applying — expect 0 rows)
-- =============================================================================
--
-- SELECT id, school_name, school_id
-- FROM   precomputed_team_scores
-- WHERE  school_id IS NULL;
-- -- Expect: 0 rows returned


-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- BEGIN;
-- UPDATE public.precomputed_team_scores SET school_id = NULL
-- WHERE  (school_name = 'West Windsor-Plainsboro South' AND school_id = 177)
--    OR  (school_name = 'West Windsor-Plainsboro North' AND school_id = 176)
--    OR  (school_name = 'Haddon Township'               AND school_id = 240)
--    OR  (school_name = 'St Joseph (Hammonton)'         AND school_id = 356);
-- COMMIT;
