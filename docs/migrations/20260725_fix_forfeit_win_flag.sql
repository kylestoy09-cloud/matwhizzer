-- MIGRATION: 20260725_fix_forfeit_win_flag.sql
--
-- 15 dual_meet_matches rows have result_type = 'For' but is_forfeit_win = false.
-- Caused by a parser bug: TrackWrestling's "Unknown (School) (For.)" format was
-- not caught by the forfeit detection regex, so is_forfeit_win was left false.
-- All affected rows have null wrestler/winner IDs — no wrestler data to clean up.

UPDATE public.dual_meet_matches
SET is_forfeit_win = true
WHERE result_type = 'For'
  AND is_forfeit_win = false;
