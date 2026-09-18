-- docs/migrations/20260806_fix_roselle_alias.sql
-- "Roselle" alias was incorrectly pointing to Roselle Park (125).
-- Roselle (358) has display_name "Roselle" and matches directly by name,
-- so the alias is redundant and wrong — remove it.

DELETE FROM school_aliases WHERE alias = 'Roselle' AND school_id = 125;
