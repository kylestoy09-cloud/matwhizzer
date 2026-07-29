-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260729_cleanup_bad_wrestler_names.sql
--
-- Cleans up wrestler records created with parenthetical school-name fragments
-- bleeding into first_name or last_name (e.g. first_name="Ryan Mitchell (St",
-- last_name="Joseph") due to a parser bug in extractNameSchool that returned
-- the full string including "(School" when no closing ')' was found.
--
-- Fix: parser was patched on 2026-07-29. After force-reimporting each affected
-- tournament (which deletes and recreates bouts with clean names), run STEP 2
-- below to delete the now-orphaned bad wrestler records (aliases cascade).
--
-- IMPORTANT: Run STEP 1 first to see what will be deleted. Only run STEP 2
-- after force-reimporting all affected tournaments so bouts no longer reference
-- the bad wrestler IDs.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── STEP 1: Diagnostic — see bad wrestler records ────────────────────────────
-- Run this first. Shows every wrestler with '(' or ')' in their name fields,
-- along with the raw alias name and school so you can verify they're all junk.

SELECT
  w.id,
  w.first_name,
  w.last_name,
  w.is_oos,
  w.created_at,
  a.raw_name,
  a.school_id,
  s.display_name AS school_name,
  -- Are any bouts still pointing at this wrestler? Should be 0 after re-import.
  (
    SELECT COUNT(*) FROM tournament_bouts
    WHERE wrestler1_id = w.id OR wrestler2_id = w.id
  ) AS active_bout_count
FROM wrestlers w
LEFT JOIN wrestler_name_aliases a ON a.wrestler_id = w.id
LEFT JOIN schools s ON s.id = a.school_id
WHERE w.first_name LIKE '%(%' OR w.first_name LIKE '%)%'
   OR w.last_name  LIKE '%(%' OR w.last_name  LIKE '%)%'
ORDER BY w.created_at DESC;


-- ── STEP 2: Cleanup — delete orphaned bad wrestler records ───────────────────
-- Only run this AFTER force-reimporting all affected tournaments.
-- Deletes wrestler rows that have paren junk in their names AND have no
-- remaining bout or placement references. Aliases cascade automatically.

DELETE FROM wrestlers
WHERE (first_name LIKE '%(%' OR first_name LIKE '%)%'
    OR last_name  LIKE '%(%' OR last_name  LIKE '%)%')
  AND id NOT IN (
    SELECT wrestler1_id FROM tournament_bouts WHERE wrestler1_id IS NOT NULL
    UNION
    SELECT wrestler2_id FROM tournament_bouts WHERE wrestler2_id IS NOT NULL
    UNION
    SELECT wrestler_id  FROM tournament_placements WHERE wrestler_id IS NOT NULL
  );
