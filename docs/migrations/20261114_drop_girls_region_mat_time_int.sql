-- docs/migrations/20261114_drop_girls_region_mat_time_int.sql
--
-- Two girls_region_mat_time functions exist: (p_region integer, …) and (p_region text, …), both from
-- 20261103_school_names_by_season.sql. The girls region page calls it with the region as text, and the API can't
-- choose between them ("Could not choose the best candidate function", PGRST203), so the live girls region pages'
-- "The Terminators" board has been empty. The text version is the one the page uses (and the one
-- 20261114_terminators_champions_only.sql rewrote to champions only); the integer one goes.
-- Found 2026-11-14 while checking the Terminators fix. Run in the Supabase SQL editor.

DROP FUNCTION IF EXISTS public.girls_region_mat_time(integer, smallint);

-- Verify: one row, the text version
SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'girls_region_mat_time';
-- expect: girls_region_mat_time(text,smallint)

-- ROLLBACK: re-create the integer version from docs/migrations/20261103_school_names_by_season.sql
