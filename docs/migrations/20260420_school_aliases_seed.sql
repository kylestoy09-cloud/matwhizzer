-- Migration: 20260420_school_aliases_seed.sql
-- Inserts missing conference_standings aliases from 20260404_school_aliases.sql
-- which was never applied to production.
--
-- Of the original 21 aliases in 20260404_school_aliases.sql:
--   19 already exist with correct school_ids — no action needed.
--    2 exist with updated IDs post-consolidation (DB is correct):
--      Monmouth: migration said 161, DB has 384 (Monmouth) — school 161 deleted.
--      St. Joseph (Mont.): migration said 47, DB has 394 (St Joseph Montvale HS) — school 47 deleted.
--    1 genuinely missing: Matawan → 382 (Matawan)
--      Note: original migration said school_id 194, but that school no longer exists.
--      382 is the current canonical Matawan record.
--
-- ROLLBACK:
--   DELETE FROM school_aliases WHERE alias = 'Matawan' AND alias_type = 'conference_standings';

INSERT INTO school_aliases (alias, school_id, alias_type)
SELECT 'Matawan', 382, 'conference_standings'
WHERE NOT EXISTS (
  SELECT 1 FROM school_aliases WHERE alias = 'Matawan'
);
