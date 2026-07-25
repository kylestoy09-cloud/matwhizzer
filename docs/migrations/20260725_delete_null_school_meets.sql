-- MIGRATION: 20260725_delete_null_school_meets.sql
--
-- Removes 60 dual_meets records (Dec 9–20 2025) where one or both team school IDs
-- are null. These were created by build_from_gt.py which knew one NJ team's wrestlers
-- by UUID but could not identify the OOS opponent (not in the NJ database). The
-- result is meets with null team_school_id and match records with null school_a/b_id
-- and no wrestler name text — essentially half-records that display as "— vs School"
-- in the audit tool with dashes on the opponent side.
--
-- These 60 meets will be re-imported from TrackWrestling raw text using the dual-meet
-- import tool. The import captures both teams' raw names, creates OOS school stubs
-- with is_nj = false, and re-matches NJ wrestler IDs from name + school.
--
-- Match records are deleted first to satisfy the FK constraint.

DELETE FROM public.dual_meet_matches
WHERE dual_meet_id IN (
  SELECT id
  FROM public.dual_meets
  WHERE team1_school_id IS NULL
     OR team2_school_id IS NULL
);

DELETE FROM public.dual_meets
WHERE team1_school_id IS NULL
   OR team2_school_id IS NULL;
