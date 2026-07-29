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
-- Run this first. Shows every wrestler with '(' or ')' in their name fields.
-- The "refs" column shows which tables still reference them.

SELECT
  w.id,
  w.first_name,
  w.last_name,
  w.is_oos,
  w.created_at,
  a.raw_name,
  s.display_name AS school_name,
  (SELECT COUNT(*) FROM tournament_bouts      WHERE wrestler1_id = w.id OR wrestler2_id = w.id) AS bout_refs,
  (SELECT COUNT(*) FROM tournament_placements WHERE wrestler_id  = w.id)                         AS placement_refs,
  (SELECT COUNT(*) FROM tournament_entries    WHERE wrestler_id  = w.id)                         AS entry_refs
FROM wrestlers w
LEFT JOIN wrestler_name_aliases a ON a.wrestler_id = w.id
LEFT JOIN schools s ON s.id = a.school_id
WHERE w.first_name LIKE '%(%' OR w.first_name LIKE '%)%'
   OR w.last_name  LIKE '%(%' OR w.last_name  LIKE '%)%'
ORDER BY w.created_at DESC;


-- ── STEP 2a: Fix names — wrestlers that are still referenced anywhere ─────────
-- Run AFTER force-reimporting all affected tournaments.
-- For any bad wrestler that still has tournament_entries (postseason) or other
-- references, strip the school fragment from their name instead of deleting.
--
-- Logic: concatenate first_name + last_name, strip everything from '(' onward,
-- then re-split on the last space to get first_name and last_name.

WITH cleaned AS (
  SELECT
    id,
    trim(regexp_replace(first_name || ' ' || last_name, '\s*\(.*$', '')) AS clean_name
  FROM wrestlers
  WHERE first_name LIKE '%(%' OR first_name LIKE '%)%'
     OR last_name  LIKE '%(%' OR last_name  LIKE '%)%'
)
UPDATE wrestlers w
SET
  first_name = CASE
    WHEN c.clean_name LIKE '% %' THEN regexp_replace(c.clean_name, '\s+\S+$', '')
    ELSE c.clean_name
  END,
  last_name = CASE
    WHEN c.clean_name LIKE '% %' THEN regexp_replace(c.clean_name, '^.*\s+', '')
    ELSE ''
  END
FROM cleaned c
WHERE w.id = c.id
  AND (
    w.id IN (SELECT wrestler1_id FROM tournament_bouts      WHERE wrestler1_id IS NOT NULL)
    OR w.id IN (SELECT wrestler2_id FROM tournament_bouts   WHERE wrestler2_id IS NOT NULL)
    OR w.id IN (SELECT wrestler_id  FROM tournament_placements WHERE wrestler_id IS NOT NULL)
    OR w.id IN (SELECT wrestler_id  FROM tournament_entries    WHERE wrestler_id IS NOT NULL)
  );


-- ── STEP 2b: Delete — wrestlers with no remaining references at all ───────────
-- Deletes wrestler rows that still have paren junk (not fixed by 2a because
-- they have no references) and have nothing pointing at them.
-- Aliases cascade automatically.

DELETE FROM wrestlers
WHERE (first_name LIKE '%(%' OR first_name LIKE '%)%'
    OR last_name  LIKE '%(%' OR last_name  LIKE '%)%')
  AND id NOT IN (
    SELECT wrestler1_id FROM tournament_bouts      WHERE wrestler1_id IS NOT NULL
    UNION
    SELECT wrestler2_id FROM tournament_bouts      WHERE wrestler2_id IS NOT NULL
    UNION
    SELECT wrestler_id  FROM tournament_placements WHERE wrestler_id  IS NOT NULL
    UNION
    SELECT wrestler_id  FROM tournament_entries    WHERE wrestler_id  IS NOT NULL
  );
