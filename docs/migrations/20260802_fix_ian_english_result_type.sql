-- Fix dual_meet_matches row where "North Hunterdon" was written into result_type
-- instead of the actual result. Match: Anthony Molinaro (SR) dec. Ian English (NH) 7-6.

UPDATE public.dual_meet_matches
SET result_type   = 'DEC',
    result_detail = '7-6'
WHERE school_a_id           = 135
  AND school_b_id           = 252
  AND wrestler_a_name_raw   = 'Ian English'
  AND wrestler_b_name_raw   = 'Anthony Molinaro'
  AND result_type           = 'North Hunterdon';
