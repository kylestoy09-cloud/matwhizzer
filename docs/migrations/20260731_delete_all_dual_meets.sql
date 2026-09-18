-- Delete all dual meet data for a clean reimport.
-- In-season tournament bouts, postseason tournament entries/matches,
-- wrestlers, and aliases are all preserved.

DELETE FROM dual_meet_matches;
DELETE FROM dual_meets;
