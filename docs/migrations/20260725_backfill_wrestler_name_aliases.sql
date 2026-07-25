-- Backfill wrestler_name_aliases from existing dual_meet_matches data.
-- Run AFTER 20260725_wrestler_name_aliases.sql creates the table.
--
-- Pulls every (raw_name, school_id, wrestler_id) triple already stored in
-- dual_meet_matches, skipping OOS school stubs (is_nj = false) and any
-- rows where the name, school, or wrestler ID is null.
-- On conflict (same name at same school seen twice) keeps the most recent
-- import's wrestler_id via DO UPDATE.

INSERT INTO public.wrestler_name_aliases (raw_name, school_id, wrestler_id)
SELECT DISTINCT raw_name, school_id, wrestler_id
FROM (
  SELECT
    dmm.wrestler_a_name_raw AS raw_name,
    dmm.school_a_id         AS school_id,
    dmm.wrestler_a_id       AS wrestler_id
  FROM public.dual_meet_matches dmm
  JOIN public.schools s ON s.id = dmm.school_a_id
  WHERE dmm.wrestler_a_name_raw IS NOT NULL
    AND dmm.school_a_id         IS NOT NULL
    AND dmm.wrestler_a_id       IS NOT NULL
    AND s.is_nj IS DISTINCT FROM FALSE

  UNION ALL

  SELECT
    dmm.wrestler_b_name_raw AS raw_name,
    dmm.school_b_id         AS school_id,
    dmm.wrestler_b_id       AS wrestler_id
  FROM public.dual_meet_matches dmm
  JOIN public.schools s ON s.id = dmm.school_b_id
  WHERE dmm.wrestler_b_name_raw IS NOT NULL
    AND dmm.school_b_id         IS NOT NULL
    AND dmm.wrestler_b_id       IS NOT NULL
    AND s.is_nj IS DISTINCT FROM FALSE
) t
ON CONFLICT (raw_name, school_id)
DO UPDATE SET wrestler_id = EXCLUDED.wrestler_id;
