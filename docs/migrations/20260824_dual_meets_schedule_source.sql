-- Adds two columns to dual_meets for the bulk schedule import tool (Step 6).
--
-- confirmed_by_both_schools: true when two schools independently submitted
--   this match in the same bulk import batch (cross-confirmation).
-- schedule_source: how this record was created (bulk_schedule_import, manual, etc.)
--   NULL on pre-existing rows created before this migration.

ALTER TABLE dual_meets
  ADD COLUMN IF NOT EXISTS confirmed_by_both_schools boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_source           text;

-- Rollback:
--   ALTER TABLE dual_meets
--     DROP COLUMN IF EXISTS confirmed_by_both_schools,
--     DROP COLUMN IF EXISTS schedule_source;
