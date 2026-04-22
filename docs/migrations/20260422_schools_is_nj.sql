-- Adds is_nj flag to schools table.
-- All existing rows default to true (every school currently in the DB is a NJ school).
-- Out-of-state schools imported via the dual-meet tool will have is_nj = false.

ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_nj boolean DEFAULT true;

-- ROLLBACK:
-- ALTER TABLE schools DROP COLUMN IF EXISTS is_nj;
