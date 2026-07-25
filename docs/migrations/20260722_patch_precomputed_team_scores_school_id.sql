-- =============================================================================
-- MIGRATION: 20260722_patch_precomputed_team_scores_school_id.sql
-- =============================================================================
-- Backfills school_id on precomputed_team_scores rows where the stored
-- school_name string differs from schools.display_name — leaving school_id NULL
-- after the April 2026 backfill (20260402_add_school_id_to_precomputed.sql).
--
-- Root cause: the old scoring pipeline stored school_name in a slightly
-- different format than schools.display_name (e.g. "Pascack Valley School"
-- vs "Pascack Valley", "St Peters Preparatory School" vs "St. Peter's Prep").
-- The April backfill matched on exact equality, so any format mismatch left
-- school_id = NULL, which silently drops the school logo on the Postseason
-- Point Leaders leaderboard (logo lookup is logos.byId.get(school_id)).
--
-- Symptom: /boys, /girls, and root home page show school names correctly but
-- no logo badge for the affected schools.
--
-- This is a targeted, additive fix — it only touches rows where school_id IS
-- NULL and school_name matches exactly.  It does not delete rows, does not
-- repopulate scores, and does not touch tournament_bouts or tournament_entries.
--
-- The comprehensive fix is 20260717_rewrite_scoring_rpcs_use_school_id.sql
-- which repopulates all rows from school_id-keyed RPCs.  Once that migration
-- is applied, the rows fixed here will be replaced by correctly-keyed rows,
-- so this patch is safe to apply even when the comprehensive fix is planned.
--
-- Confirmed school_id values (cross-referenced against schools table):
--   197  Christian Brothers          ← "Christian Brothers Academy" in scores
--   167  St. Peter's Prep            ← "St Peters Preparatory School"
--    11  Don Bosco Prep              ← "Don Bosco Prep School"
--   313  St. Augustine               ← "St. Augustine Prep"
--   175  Rumson-Fair Haven           ← "Rumson-Fair Haven Regional"
--   281  Lower Cape May              ← "Lower Cape May Regional"
--    16  Pascack Valley              ← "Pascack Valley School"
--   141  Delaware Valley             ← "Delaware Valley Regional"
--   108  West Morris                 ← "West Morris Central"
--   315  Kittatinny                  ← "Newton/Kittatinny" (girls co-op;
--                                         school_aliases maps this to 315)
-- =============================================================================

BEGIN;

-- Boys: 9 schools with school_name ≠ display_name
UPDATE public.precomputed_team_scores
SET    school_id = 197
WHERE  school_name = 'Christian Brothers Academy'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 167
WHERE  school_name = 'St Peters Preparatory School'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 11
WHERE  school_name = 'Don Bosco Prep School'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 313
WHERE  school_name = 'St. Augustine Prep'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 175
WHERE  school_name = 'Rumson-Fair Haven Regional'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 281
WHERE  school_name = 'Lower Cape May Regional'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 16
WHERE  school_name = 'Pascack Valley School'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 141
WHERE  school_name = 'Delaware Valley Regional'
  AND  school_id IS NULL;

UPDATE public.precomputed_team_scores
SET    school_id = 108
WHERE  school_name = 'West Morris Central'
  AND  school_id IS NULL;

-- Girls co-op: Newton/Kittatinny → school 315 (Kittatinny is primary,
-- per school_aliases mapping alias='Newton/Kittatinny' → school_id=315)
UPDATE public.precomputed_team_scores
SET    school_id = 315
WHERE  school_name = 'Newton/Kittatinny'
  AND  school_id IS NULL;

-- Girls: Lawrence Senior → school 210 (display_name='Lawrence')
UPDATE public.precomputed_team_scores
SET    school_id = 210
WHERE  school_name = 'Lawrence Senior'
  AND  school_id IS NULL;

COMMIT;


-- =============================================================================
-- VERIFY (run after applying — expect 0 rows for each)
-- =============================================================================
--
-- SELECT school_name, COUNT(*) AS null_rows
-- FROM   precomputed_team_scores
-- WHERE  school_id IS NULL
--   AND  school_name IN (
--          'Christian Brothers Academy', 'St Peters Preparatory School',
--          'Don Bosco Prep School', 'St. Augustine Prep',
--          'Rumson-Fair Haven Regional', 'Lower Cape May Regional',
--          'Pascack Valley School', 'Delaware Valley Regional',
--          'West Morris Central', 'Newton/Kittatinny',
--          'Lawrence Senior'
--        )
-- GROUP  BY school_name;
-- -- Expect: 0 rows returned


-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- BEGIN;
-- UPDATE public.precomputed_team_scores SET school_id = NULL
-- WHERE  school_name IN (
--          'Christian Brothers Academy', 'St Peters Preparatory School',
--          'Don Bosco Prep School', 'St. Augustine Prep',
--          'Rumson-Fair Haven Regional', 'Lower Cape May Regional',
--          'Pascack Valley School', 'Delaware Valley Regional',
--          'West Morris Central', 'Newton/Kittatinny',
--          'Lawrence Senior'
--        )
--   AND  school_id IN (197, 167, 11, 313, 175, 281, 16, 141, 108, 315, 210);
-- COMMIT;
