-- ── Deactivate season 1 orphan wrestlers ─────────────────────────────────────
-- Season 1 wrestler records were never cleaned up when season 2 was built fresh.
-- These wrestlers are active but have no season 2 district activity, meaning their
-- season 2 counterparts exist as separate new records.
--
-- Action:
--   - Seniors (grade='Sr'):  graduated after season 1 → is_active = false
--   - Fr/So/Jr + null grade: season 1 orphans → is_active = false
--
-- Run the DRY RUN first to confirm counts, then run the DO $$ block.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── DRY RUN (read-only) ──────────────────────────────────────────────────────
-- Confirm counts match expectations before committing.
WITH s1 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 1
),
s2 AS (
  SELECT DISTINCT te.wrestler_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 2
),
orphans AS (
  SELECT w.id, w.grade
  FROM wrestlers w
  JOIN s1 ON s1.wrestler_id = w.id
  LEFT JOIN s2 ON s2.wrestler_id = w.id
  WHERE s2.wrestler_id IS NULL
    AND w.is_active = true
    AND w.gender    = 'M'
)
SELECT
  COALESCE(grade, 'null') AS grade,
  COUNT(*)                AS wrestlers,
  CASE grade
    WHEN 'Sr' THEN 'graduate'
    ELSE           'deactivate'
  END                     AS action
FROM orphans
GROUP BY grade
ORDER BY grade;

-- ─────────────────────────────────────────────────────────────────────────────
-- ── EXECUTE (run after dry run looks correct) ────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_graduated   int := 0;
  v_deactivated int := 0;
BEGIN
  -- Graduate season 1 seniors
  UPDATE wrestlers
  SET is_active = false
  WHERE gender    = 'M'
    AND is_active = true
    AND grade     = 'Sr'
    AND id IN (
      SELECT DISTINCT te.wrestler_id
      FROM tournament_entries te
      JOIN tournaments t ON t.id = te.tournament_id
      WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 1
    )
    AND id NOT IN (
      SELECT DISTINCT te.wrestler_id
      FROM tournament_entries te
      JOIN tournaments t ON t.id = te.tournament_id
      WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 2
    );
  GET DIAGNOSTICS v_graduated = ROW_COUNT;

  -- Deactivate season 1 underclassmen and ungraded orphans
  UPDATE wrestlers
  SET is_active = false
  WHERE gender    = 'M'
    AND is_active = true
    AND (grade IN ('Fr','So','Jr') OR grade IS NULL)
    AND id IN (
      SELECT DISTINCT te.wrestler_id
      FROM tournament_entries te
      JOIN tournaments t ON t.id = te.tournament_id
      WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 1
    )
    AND id NOT IN (
      SELECT DISTINCT te.wrestler_id
      FROM tournament_entries te
      JOIN tournaments t ON t.id = te.tournament_id
      WHERE t.gender = 'M' AND t.tournament_type = 'districts' AND t.season_id = 2
    );
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  RAISE NOTICE 'Season 1 cleanup complete: % seniors graduated, % underclassmen/ungraded deactivated (total affected: %)',
    v_graduated, v_deactivated, v_graduated + v_deactivated;
END $$;

-- ── POST-CHECK ───────────────────────────────────────────────────────────────
-- Run after the DO block. Active boys with grades should now be ~3,600,
-- matching the season 2 district population.
SELECT COUNT(*) AS active_boys_with_grade
FROM wrestlers
WHERE gender    = 'M'
  AND is_active = true
  AND is_oos    = false
  AND grade     IS NOT NULL;
