-- docs/migrations/20260919_season_columns_roster_import_microcheck.sql
--
-- 1. roster_grade_import.season_id — every roster batch belongs to a season.
--    Existing rows (2026-09-15_track_master) are 2025-26 rosters (season 2).
--    NOT NULL, no default: every future load must state its season.
-- 2. microcheck_tasks.season_id — each task carries the season it's about
--    (e.g. review 2024-25 matches, collect 2026-27 coaches). Nullable for tasks
--    that aren't season-specific. Existing tie tasks take it from metadata.

ALTER TABLE roster_grade_import
  ADD COLUMN IF NOT EXISTS season_id integer REFERENCES seasons(id);

UPDATE roster_grade_import SET season_id = 2 WHERE season_id IS NULL;

ALTER TABLE roster_grade_import ALTER COLUMN season_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rgi_season_status ON roster_grade_import (season_id, status);

ALTER TABLE microcheck_tasks
  ADD COLUMN IF NOT EXISTS season_id integer REFERENCES seasons(id);

UPDATE microcheck_tasks
SET season_id = (metadata->>'season_id')::integer
WHERE season_id IS NULL AND metadata ? 'season_id';

-- Verify: expect roster rows all season 2; tie tasks all season 2
SELECT 'roster_grade_import' AS tbl, season_id, COUNT(*) FROM roster_grade_import GROUP BY season_id
UNION ALL
SELECT 'microcheck_tasks', season_id, COUNT(*) FROM microcheck_tasks GROUP BY season_id;
