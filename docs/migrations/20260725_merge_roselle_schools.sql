-- Merge school 358 (Roselle Rams — incorrectly created duplicate) into school 125.
--
-- Background: a request to rename "Roselle Park Panthers" (125) to "Roselle Rams"
-- instead created a new school record (358). School 358 has no FK references in
-- any table (tournament_entries, dual_meets, dual_meet_matches,
-- precomputed_team_scores, wrestler_name_aliases all confirmed at 0).
--
-- Result: school 125 becomes "Roselle Rams" with the correct logo.
-- All wrestler/meet records already linked to 125 will reflect the updated name
-- and logo automatically. School 358 is deleted.

-- Step 1: Copy name, mascot, and logo from school 358 onto school 125.
UPDATE public.schools
SET
  display_name = src.display_name,
  mascot       = src.mascot,
  logo_url     = src.logo_url
FROM (
  SELECT display_name, mascot, logo_url
  FROM public.schools
  WHERE id = 358
) AS src
WHERE public.schools.id = 125;

-- Step 2: Delete the duplicate. Safe because all FK counts for school 358 = 0.
DELETE FROM public.schools WHERE id = 358;
