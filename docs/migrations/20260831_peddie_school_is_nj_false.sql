-- docs/migrations/20260831_peddie_school_is_nj_false.sql
--
-- The Peddie School (id=603, Hightstown NJ) is not an NJSIAA member. It was
-- added to the schools table with is_nj=true, which caused the school matcher
-- to treat it as an NJ school and stamp wrestlers from Peddie as is_oos=false.
-- Those wrestlers then appeared in the wrestler search and the wrestler directory.
--
-- Fix: set is_nj=false so the matcher treats Peddie as an untracked school
-- (confidence='oos'), and back-fill existing Peddie wrestlers to is_oos=true.
-- Only wrestlers whose ONLY tournament_entries school is Peddie are updated —
-- a wrestler who competed for both Peddie and an NJSIAA school is left alone.

-- Step 1: flag Peddie as non-NJ / non-NJSIAA
UPDATE public.schools
SET is_nj = false
WHERE id = 603;

-- Step 2: mark existing wrestlers as OOS if all their tournament entries
-- are from Peddie (school_id = 603). Excludes wrestlers who also appear
-- at other NJ schools (they would have overlapping entries).
UPDATE public.wrestlers w
SET is_oos = true
WHERE w.is_oos = false
  AND EXISTS (
    SELECT 1 FROM public.tournament_entries te
    WHERE te.wrestler_id = w.id AND te.school_id = 603
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.tournament_entries te2
    JOIN public.schools s ON s.id = te2.school_id
    WHERE te2.wrestler_id = w.id AND s.is_nj = true AND te2.school_id != 603
  );
