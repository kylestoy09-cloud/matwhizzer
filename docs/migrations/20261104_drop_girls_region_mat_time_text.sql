-- Drop the old text copy of girls_region_mat_time (2026-11-04, found in review)
--
-- Two copies existed: (p_region integer, p_season smallint) and (p_region text, p_season smallint
-- DEFAULT 2). A call with p_region and p_season matches both, so every call failed with "could not
-- choose the best candidate function": the girls region page's "The Terminators" box and the
-- Terminator badge on girls wrestler profiles were empty. The integer copy is the current rule,
-- the same as district_mat_time and region_mat_time: district and region wins only, at least 3,
-- wrestlers with a loss left out. The text copy (any postseason bout, losses included, at least 5)
-- is an old version. Callers pass the region number; "1" from a page address casts to integer.

DROP FUNCTION IF EXISTS public.girls_region_mat_time(text, smallint);

-- ROLLBACK: the text definition is in docs/migrations/backups/20261103_name_functions_before.sql
-- (section "girls_region_mat_time(p_region text, p_season smallint)"), with s.display_name names.
