-- docs/migrations/20260803_fix_oos_wrestler_flags.sql
--
-- Sets is_oos = true for any wrestler whose school associations
-- (via wrestler_name_aliases) are exclusively OOS (is_nj = false) schools.
-- These wrestlers were imported with is_oos = false by default but were
-- never corrected because the import route never set is_oos based on the
-- resolved school.

UPDATE public.wrestlers w
SET is_oos = true
WHERE w.is_oos = false
  AND EXISTS (
    SELECT 1
    FROM public.wrestler_name_aliases wna
    JOIN public.schools s ON s.id = wna.school_id
    WHERE wna.wrestler_id = w.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.wrestler_name_aliases wna
    JOIN public.schools s ON s.id = wna.school_id
    WHERE wna.wrestler_id = w.id
      AND s.is_nj = true
  );
