-- ============================================================
-- Migration: add tw_id column to wrestlers table
-- Date: 2026-07-20
-- Why: TrackWrestling profile IDs appear in pipe-format CSV
--      exports as tw_id_winner / tw_id_loser.  Storing tw_id on
--      the wrestler record makes every future pipe-CSV import use
--      it as the primary dedup key (more reliable than name
--      fuzzy-matching across seasons and tournament contexts).
-- ============================================================

ALTER TABLE wrestlers
  ADD COLUMN IF NOT EXISTS tw_id bigint;

-- Partial unique index: no two wrestlers share a tw_id,
-- but tw_id = NULL is allowed for wrestlers added before pipe imports.
CREATE UNIQUE INDEX IF NOT EXISTS wrestlers_tw_id_idx
  ON wrestlers (tw_id)
  WHERE tw_id IS NOT NULL;

COMMENT ON COLUMN wrestlers.tw_id IS
  'TrackWrestling profile ID (bigint). Stable across seasons. Used as primary dedup key for pipe-format CSV imports. NULL for wrestlers added via RTF/PDF imports that predate this column.';

-- Verify: index created, column present
-- SELECT attname, atttypid::regtype FROM pg_attribute
--   WHERE attrelid = 'wrestlers'::regclass AND attname = 'tw_id';
