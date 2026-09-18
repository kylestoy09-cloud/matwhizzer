-- Delete two empty shell school entries with no program data.
--
-- id=365  Cliffside Park/Ridgefield Memorial  (is_combined=true, zero data attached)
--         Originally created as a co-op entry; both schools run independent
--         programs and exist separately (Cliffside Park=364, Ridgefield Memorial=357).
--
-- id=381  Mary Help of Christians Academy  (all-girls school, no wrestling program)
--         Inflating boys dashboard count via is_nj=true; one orphaned alias row exists.

-- Clean up orphaned alias for Mary Help
DELETE FROM wrestler_name_aliases WHERE school_id IN (365, 381);

-- Clean up inactive_school_seasons entries (365 was marked inactive s1+s2)
DELETE FROM inactive_school_seasons WHERE school_id IN (365, 381);

-- Clean up school_coops (365 is referenced as coop_school_id)
DELETE FROM school_coops WHERE coop_school_id IN (365, 381) OR member_school_id IN (365, 381);

-- Delete the school rows
DELETE FROM schools WHERE id IN (365, 381);
