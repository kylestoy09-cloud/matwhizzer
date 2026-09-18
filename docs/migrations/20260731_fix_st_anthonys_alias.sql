-- Fix: "St. Anthonys" was incorrectly aliased to Acadiana (OOS school 712).
-- St. Anthony's is a NY school, not Acadiana (LA).
-- Creates the correct OOS school record (id=750) and re-points the alias.

-- 1. Remove the bad alias
DELETE FROM school_aliases
WHERE alias = 'St. Anthonys' AND alias_type = 'oos';

-- 2. Create the St. Anthony's OOS school
INSERT INTO schools (display_name, is_nj)
VALUES ('St. Anthony''s', false);
-- Returned id: 750

-- 3. Add correct alias pointing to school 750
INSERT INTO school_aliases (alias, alias_type, school_id, notes)
VALUES ('St. Anthonys', 'oos', 750, '750');
