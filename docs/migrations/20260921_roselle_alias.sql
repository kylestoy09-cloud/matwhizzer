-- docs/migrations/20260921_roselle_alias.sql
--
-- Bare "Roselle" always means Roselle (358, Abraham Clark High School).
-- Roselle Park is its own school (125) and is always written "Roselle Park".
-- (Per the user, 2026-09-21. Replaces the earlier "flag bare Roselle for review" rule.)
--
-- 358's display name already matches "Roselle", but only when 358 is in that
-- season's program list; it isn't in the 2025-26 girls list (no girls bracket
-- entries), so girls imports for 2025-26 couldn't resolve it. An alias matches
-- regardless of the program list.

INSERT INTO school_aliases (school_id, alias, alias_type, notes)
SELECT 358, 'Roselle', 'display_name', 'Roselle = Abraham Clark HS (358); Roselle Park is 125'
WHERE NOT EXISTS (SELECT 1 FROM school_aliases WHERE lower(alias) = 'roselle');

-- Verify
SELECT alias, school_id, alias_type, notes FROM school_aliases WHERE lower(alias) IN ('roselle', 'abraham clark', 'roselle park');

-- ROLLBACK:
-- DELETE FROM school_aliases WHERE alias = 'Roselle' AND school_id = 358;
