-- Fix Gloucester (school id=259) incorrectly flagged as is_combined=true.
-- Gloucester is a standalone public school (South, Group 2).
-- RECONSTRUCTED from dashboard fix applied 2026-08-06.

UPDATE schools SET is_combined = false WHERE id = 259;

-- ROLLBACK:
-- UPDATE schools SET is_combined = true WHERE id = 259;
