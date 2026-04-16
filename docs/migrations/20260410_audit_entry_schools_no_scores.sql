-- MIGRATION: 20260410_audit_entry_schools_no_scores.sql
-- DESCRIPTION: Diagnostic queries only. Investigates why Monmouth, Ridgefield
--              Memorial, Northern Highlands, and Paterson Kennedy have tournament
--              entries in tournament_entries but zero rows in precomputed_team_scores.
--              These are the only schools from the no-scores audit that actually
--              competed in postseason tournaments in 2025-26.
-- APPLIED: NOT APPLIED TO PRODUCTION
--
-- DO NOT MODIFY DATA — read-only SELECT statements throughout.
--
-- TARGET SCHOOLS:
--   384  Monmouth           — 14 entries (Boy_s Districts District 24 (M))
--   357  Ridgefield Memorial — 10 entries (Boy_s Districts District 7 (M);
--                                          Girl_s Districts District 3 (F))
--    35  Northern Highlands  —  2 entries (Girl_s Regions North 1 (F))
--   331  Paterson Kennedy    —  1 entry   (Girl_s Districts District 2 (F))
--
-- QUESTIONS THIS AUDIT ANSWERS:
--   1. What tournaments do these entries map to, and what is tournament_type + gender?
--   2. Did the build_from_gt pipeline simply not run for these tournaments,
--      or were they excluded intentionally?
--   3. Are the entries attached to valid wrestlers (no orphaned rows)?
--   4. Does any other school from the same tournament lack precomputed scores
--      (pointing to a pipeline gap rather than a school-specific issue)?
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Query 1: Entry summary by school ─────────────────────────────────────────
-- Shows how many entries each school has and which tournaments they're in.

SELECT
  s.id                  AS school_id,
  s.display_name        AS school_name,
  t.id                  AS tournament_id,
  t.name                AS tournament_name,
  t.tournament_type,
  t.gender,
  t.season_id,
  COUNT(te.id)          AS entry_count
FROM tournament_entries te
JOIN schools             s  ON s.id = te.school_id
JOIN tournaments         t  ON t.id = te.tournament_id
WHERE te.school_id IN (384, 357, 35, 331)
GROUP BY s.id, s.display_name, t.id, t.name, t.tournament_type, t.gender, t.season_id
ORDER BY s.display_name, t.season_id DESC, t.name;


-- ── Query 2: Confirm zero precomputed scores for these schools ────────────────
-- Should return no rows. If it does return rows, the original no-scores report
-- was stale and this audit is moot.

SELECT
  pts.school_id,
  pts.school_name,
  pts.tournament_type,
  pts.total_points,
  pts.season_id
FROM precomputed_team_scores pts
WHERE pts.school_id IN (384, 357, 35, 331)
ORDER BY pts.school_id, pts.season_id DESC;


-- ── Query 3: Cross-check tournament coverage ──────────────────────────────────
-- For each tournament these schools competed in, how many OTHER schools in the
-- same tournament also lack precomputed_team_scores? A high count suggests the
-- pipeline never ran for that tournament at all.

SELECT
  t.id                  AS tournament_id,
  t.name                AS tournament_name,
  t.tournament_type,
  t.gender,
  t.season_id,
  COUNT(DISTINCT te.school_id)                    AS total_schools_with_entries,
  COUNT(DISTINCT pts.school_id)                   AS schools_with_scores,
  COUNT(DISTINCT te.school_id)
    - COUNT(DISTINCT pts.school_id)               AS schools_missing_scores
FROM tournament_entries te
JOIN tournaments t ON t.id = te.tournament_id
LEFT JOIN precomputed_team_scores pts
  ON pts.school_id = te.school_id
  AND pts.season_id = t.season_id
WHERE te.school_id IN (384, 357, 35, 331)
  AND te.school_id IS NOT NULL
GROUP BY t.id, t.name, t.tournament_type, t.gender, t.season_id
ORDER BY t.season_id DESC, t.name;


-- ── Query 4: Confirm entries are linked to valid wrestlers ────────────────────
-- Checks for orphaned entries (wrestler_id pointing to a deleted or null wrestler).

SELECT
  te.id                 AS entry_id,
  te.school_id,
  s.display_name        AS school_name,
  te.wrestler_id,
  w.first_name,
  w.last_name,
  te.tournament_id,
  t.name                AS tournament_name,
  wc.weight             AS weight_class
FROM tournament_entries te
JOIN schools             s  ON s.id  = te.school_id
JOIN tournaments         t  ON t.id  = te.tournament_id
LEFT JOIN wrestlers      w  ON w.id  = te.wrestler_id
LEFT JOIN weight_classes wc ON wc.id = te.weight_class_id
WHERE te.school_id IN (384, 357, 35, 331)
ORDER BY s.display_name, t.name, wc.weight;


-- ── Query 5: Check all other schools in the same tournaments for score gaps ───
-- Full picture: list every school that entered these tournaments, whether or not
-- they have precomputed scores. Useful to determine if this is a batch gap.

SELECT
  t.name                AS tournament_name,
  t.tournament_type,
  t.gender,
  te.school_id,
  s.display_name        AS school_name,
  CASE WHEN pts.school_id IS NOT NULL THEN 'HAS SCORES' ELSE 'MISSING' END AS score_status
FROM tournament_entries te
JOIN tournaments         t   ON t.id  = te.tournament_id
JOIN schools             s   ON s.id  = te.school_id
LEFT JOIN precomputed_team_scores pts
  ON pts.school_id = te.school_id
  AND pts.season_id = t.season_id
  AND pts.tournament_type = t.tournament_type
WHERE t.id IN (
  SELECT DISTINCT tournament_id
  FROM tournament_entries
  WHERE school_id IN (384, 357, 35, 331)
)
  AND te.school_id IS NOT NULL
ORDER BY t.name, score_status, s.display_name;


-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- Not applicable — this migration contains only SELECT statements.
-- No rollback required.
