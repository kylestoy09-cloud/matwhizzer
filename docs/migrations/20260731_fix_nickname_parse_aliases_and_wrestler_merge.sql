-- Fix: TrackWrestling nickname-format names like "William (Liam) McSorley (Shawnee)"
-- were being garbled by the old lazy-regex parser into name="William", school="Liam) McSorley (Shawnee".
-- The nickname resolver workaround stored those garbled strings as school aliases.
-- This migration cleans them up and merges the duplicate McSorley profile.

-- 1. Delete the 4 garbled school aliases created by the old nickname resolver workaround
DELETE FROM school_aliases
WHERE alias IN (
  'Liam) McSorley (Shawnee',
  'James) Fearon (Hunterdon Central Reg',
  'CJ) Palmisano (Whippany Park',
  'Greg) Parker (Mainland Regional'
);

-- 2. Merge duplicate William McSorley profiles
-- Bad profile (94a23f98): first_name="William", last_name="" — created by old parser grabbing only first token
-- Good profile (3c999432): first_name="William", last_name="McSorley" — created by nickname resolver
UPDATE dual_meet_matches
SET wrestler_a_id = '3c999432-6add-4c56-ade7-45f6ff0fdc02'
WHERE wrestler_a_id = '94a23f98-6fec-4a2a-92d7-a4e53c53902a';

UPDATE dual_meet_matches
SET wrestler_b_id = '3c999432-6add-4c56-ade7-45f6ff0fdc02'
WHERE wrestler_b_id = '94a23f98-6fec-4a2a-92d7-a4e53c53902a';

UPDATE dual_meet_matches
SET winner_id = '3c999432-6add-4c56-ade7-45f6ff0fdc02'
WHERE winner_id = '94a23f98-6fec-4a2a-92d7-a4e53c53902a';

UPDATE tournament_entries
SET wrestler_id = '3c999432-6add-4c56-ade7-45f6ff0fdc02'
WHERE wrestler_id = '94a23f98-6fec-4a2a-92d7-a4e53c53902a';

DELETE FROM wrestlers
WHERE id = '94a23f98-6fec-4a2a-92d7-a4e53c53902a';

-- Root cause fix: parseDualMeet.ts now uses backward-scan splitNameSchool() instead
-- of lazy regex, so nickname parens no longer confuse the school boundary.
