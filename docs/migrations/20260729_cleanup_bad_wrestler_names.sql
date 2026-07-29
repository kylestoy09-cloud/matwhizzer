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
-- The ref columns show which tables still reference them.

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


-- ── STEP 2: Fix + delete in a single CTE statement ───────────────────────────
-- Run AFTER force-reimporting all affected tournaments.
-- Paste the entire block below into Supabase SQL editor and run it as one query.
--
-- bad_ids:  identifies wrestlers with '(' in their names (original snapshot)
-- fixed:    UPDATE strips the "(School" fragment from every bad wrestler's name
-- The final DELETE removes bad wrestlers that have no references in any table.
-- PostgreSQL data-modifying CTEs see the same pre-modification snapshot, so
-- bad_ids is stable for both the UPDATE and the DELETE.
-- wrestler_name_aliases cascade-deletes automatically with the wrestler row.

WITH bad_ids AS (
  SELECT id
  FROM wrestlers
  WHERE first_name LIKE '%(%' OR first_name LIKE '%)%'
     OR last_name  LIKE '%(%' OR last_name  LIKE '%)%'
),
cleaned AS (
  SELECT
    w.id,
    trim(regexp_replace(w.first_name || ' ' || w.last_name, '\s*\(.*$', '')) AS clean_name
  FROM wrestlers w
  JOIN bad_ids b ON b.id = w.id
),
fixed AS (
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
  RETURNING w.id
)
DELETE FROM wrestlers
WHERE id IN (SELECT id FROM bad_ids)
  AND id NOT IN (
    SELECT wrestler1_id FROM tournament_bouts      WHERE wrestler1_id IS NOT NULL
    UNION
    SELECT wrestler2_id FROM tournament_bouts      WHERE wrestler2_id IS NOT NULL
    UNION
    SELECT wrestler_id  FROM tournament_placements WHERE wrestler_id  IS NOT NULL
    UNION
    SELECT wrestler_id  FROM tournament_entries    WHERE wrestler_id  IS NOT NULL
  );
