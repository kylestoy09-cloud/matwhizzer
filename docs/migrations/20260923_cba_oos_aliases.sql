-- docs/migrations/20260923_cba_oos_aliases.sql
--
-- Follow-up to 20260923_cba_oos_mixup_fix.sql. The out-of-state "Christian
-- Brothers" program (school_id 506, is_nj=false) is known by two names in
-- source data — "Christian Brothers High School" and "Christian Brothers
-- College" — and had zero aliases, so any raw import name other than an
-- exact match on its display_name ("Christian Brothers College") fell
-- through to trigram fuzzy matching, where it collided with NJ school 197
-- (Christian Brothers Academy, which already carries several
-- "Christian Brothers..." aliases and so wins the fuzzy match).
--
-- Adding exact OOS aliases for both names makes matchSchools.ts resolve
-- them at the exact-alias step (before fuzzy matching ever runs), so future
-- imports of either name land on 506 instead of colliding with 197.
--
-- OOS alias convention as actually used in production (school_aliases.school_id
-- is NOT NULL, unlike the nullable-with-notes fallback matchSchools.ts also
-- supports): alias_type='oos', school_id = the OOS school id, notes = the
-- same id as text.

INSERT INTO school_aliases (alias, alias_type, school_id, notes) VALUES
  ('Christian Brothers High School', 'oos', 506, '506'),
  ('Christian Brothers College',     'oos', 506, '506');
