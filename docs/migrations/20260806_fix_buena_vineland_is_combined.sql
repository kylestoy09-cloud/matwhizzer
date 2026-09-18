-- Fix Buena/Vineland (school id=360) missing is_combined=true flag.
-- Buena/Vineland is a girls co-op program with no boys team.
-- It was appearing in boys school lists due to the incorrect flag.
-- RECONSTRUCTED from dashboard fix applied 2026-08-06.

UPDATE schools SET is_combined = true WHERE id = 360;

-- ROLLBACK:
-- UPDATE schools SET is_combined = false WHERE id = 360;
