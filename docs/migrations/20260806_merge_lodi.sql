-- docs/migrations/20260806_merge_lodi.sql
-- Merge Lodi (id=55) and Saddle Brook (id=59) into Lodi/Saddle Brook (id=379).
-- Both shell records have zero meets and zero wrestlers; all activity is under the co-op (379).

-- Redirect all aliases to the active co-op
UPDATE school_aliases SET school_id = 379 WHERE school_id IN (55, 59);

-- Remove stale power_points entries
DELETE FROM power_points WHERE school_id IN (55, 59);

-- Remove district assignments for the shell schools
DELETE FROM school_districts WHERE school_id IN (55, 59);

-- Remove any other referencing rows
DELETE FROM precomputed_team_scores WHERE school_id IN (55, 59);
DELETE FROM playoff_seeds WHERE school_id IN (55, 59);

-- Delete the empty shell records
DELETE FROM schools WHERE id IN (55, 59);
