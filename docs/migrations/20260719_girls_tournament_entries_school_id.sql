-- =============================================================================
-- MIGRATION: 20260719_girls_tournament_entries_school_id.sql
-- =============================================================================
-- Fixes missing school_id on tournament_entries rows for 8 girls schools
-- whose school_context_raw didn't match schools.display_name during import.
--
-- Scope: season_id = 2, tournaments.gender = 'F', school_id IS NULL only.
-- The IS NULL guard ensures already-correct rows are never overwritten.
-- Newton/Kittatinny is intentionally excluded — no co-op school record yet.
--
-- Mappings:
--   'Jackson Township H.S.'     → 370  (display_name: Jackson Township)
--   'High Point Regional'       → 32   (display_name: High Point)
--   'Kingsway Regional'         → 260  (display_name: Kingsway)
--   'Rancocas Valley Regional'  → 263  (display_name: Rancocas Valley)
--   'Hunterdon Central Regional'→ 190  (display_name: Hunterdon Central)
--   'Trenton Central'           → 216  (display_name: Trenton)
--   'Passaic Co Tech-Voc'       → 391  (display_name: Passaic Tech)
--   'Gloucester City JR/SR'     → 259  (display_name: Gloucester)
--
-- After applying:
--   1. Live-query RPCs (state_placements, girls_region_schools, lb_bracket_buster,
--      lb_lowest_seeded_champs, lb_revenge_matches) — fixed automatically, no
--      additional step required.
--   2. top_postseason_team_scores reads from precomputed_team_scores (cached).
--      Run the cleanup block below (Step 2) to delete the stale cached rows.
--      Per CLAUDE.md, the RPC recomputes live once those rows are removed.
-- =============================================================================

BEGIN;

-- ── Step 1: Fix school_id in tournament_entries ───────────────────────────────

UPDATE tournament_entries te
SET school_id = CASE te.school_context_raw
  WHEN 'Jackson Township H.S.'      THEN 370
  WHEN 'High Point Regional'        THEN 32
  WHEN 'Kingsway Regional'          THEN 260
  WHEN 'Rancocas Valley Regional'   THEN 263
  WHEN 'Hunterdon Central Regional' THEN 190
  WHEN 'Trenton Central'            THEN 216
  WHEN 'Passaic Co Tech-Voc'        THEN 391
  WHEN 'Gloucester City JR/SR'      THEN 259
END
WHERE te.school_context_raw IN (
  'Jackson Township H.S.',
  'High Point Regional',
  'Kingsway Regional',
  'Rancocas Valley Regional',
  'Hunterdon Central Regional',
  'Trenton Central',
  'Passaic Co Tech-Voc',
  'Gloucester City JR/SR'
)
AND te.school_id IS NULL
AND te.tournament_id IN (
  SELECT id FROM tournaments
  WHERE season_id = 2
    AND gender = 'F'
);

-- ── Verify row counts before committing ──────────────────────────────────────
-- Run this SELECT to confirm expected rows were updated:
--
-- SELECT te.school_context_raw, te.school_id, COUNT(*)
-- FROM tournament_entries te
-- JOIN tournaments t ON t.id = te.tournament_id
-- WHERE te.school_context_raw IN (
--   'Jackson Township H.S.', 'High Point Regional', 'Kingsway Regional',
--   'Rancocas Valley Regional', 'Hunterdon Central Regional', 'Trenton Central',
--   'Passaic Co Tech-Voc', 'Gloucester City JR/SR'
-- )
-- AND t.season_id = 2 AND t.gender = 'F'
-- GROUP BY te.school_context_raw, te.school_id
-- ORDER BY te.school_context_raw;
-- Expected: each row shows the new school_id (not NULL).

COMMIT;


-- =============================================================================
-- Step 2: Purge stale precomputed_team_scores rows (run after Step 1)
-- =============================================================================
-- top_postseason_team_scores reads from precomputed_team_scores. The stale rows
-- are keyed by the old raw school_name (with school_id = NULL). Delete them so
-- the RPC recomputes live on next call with the correct school_id.
-- Run as a separate transaction after verifying Step 1.
-- =============================================================================

-- BEGIN;
--
-- DELETE FROM precomputed_team_scores
-- WHERE school_name IN (
--   'Jackson Township H.S.',
--   'High Point Regional',
--   'Kingsway Regional',
--   'Rancocas Valley Regional',
--   'Hunterdon Central Regional',
--   'Trenton Central',
--   'Passaic Co Tech-Voc',
--   'Gloucester City JR/SR'
-- )
-- AND season_id = 2;
--
-- COMMIT;


-- =============================================================================
-- ROLLBACK (Step 1 only — reverses tournament_entries update)
-- =============================================================================
-- BEGIN;
-- UPDATE tournament_entries te
-- SET school_id = NULL
-- WHERE te.school_context_raw IN (
--   'Jackson Township H.S.',
--   'High Point Regional',
--   'Kingsway Regional',
--   'Rancocas Valley Regional',
--   'Hunterdon Central Regional',
--   'Trenton Central',
--   'Passaic Co Tech-Voc',
--   'Gloucester City JR/SR'
-- )
-- AND te.school_id IN (370, 32, 260, 263, 190, 216, 391, 259)
-- AND te.tournament_id IN (
--   SELECT id FROM tournaments WHERE season_id = 2 AND gender = 'F'
-- );
-- COMMIT;
