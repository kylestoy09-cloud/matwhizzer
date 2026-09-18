-- docs/migrations/20260807_fix_ridgefield_oos_stub.sql
--
-- "Ridgefield" failed to match "Ridgefield Memorial" (id=357) during a dual
-- meet import and was silently created as an OOS stub (id=671, is_nj=false).
-- This migration:
--   1. Remaps all dual_meets referencing school 671 to school 357
--   2. Adds a school_alias so future imports resolve correctly
--   3. Deletes the stub school 671

UPDATE dual_meets SET team1_school_id = 357 WHERE team1_school_id = 671;
UPDATE dual_meets SET team2_school_id = 357 WHERE team2_school_id = 671;
UPDATE tournament_bouts SET wrestler1_school_id = 357 WHERE wrestler1_school_id = 671;
UPDATE tournament_bouts SET wrestler2_school_id = 357 WHERE wrestler2_school_id = 671;

DELETE FROM school_aliases WHERE alias = 'Ridgefield';
INSERT INTO school_aliases (school_id, alias, alias_type) VALUES (357, 'Ridgefield', 'abbreviation');

DELETE FROM schools WHERE id = 671;
