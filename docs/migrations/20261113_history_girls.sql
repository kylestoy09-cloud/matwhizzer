-- docs/migrations/20261113_history_girls.sql
--
-- Girls postseason history in the Daily Challenge workspace (Kyle 2026-11-13: "start tracking all of the girls post
-- season history ... extract the podium for all region and states"). history_finishes gains a gender (every row
-- so far is boys) and a region name: girls regions are named — North / South (2019-2022), North I, North II,
-- Central, South (2023 on) — where the boys' are numbered 1-8. The research tabs read one gender per side; the
-- one trivia contest is shared by boys and girls.
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE history_finishes ADD COLUMN IF NOT EXISTS gender char(1) NOT NULL DEFAULT 'M';
ALTER TABLE history_finishes DROP CONSTRAINT IF EXISTS history_finishes_gender_check;
ALTER TABLE history_finishes ADD CONSTRAINT history_finishes_gender_check CHECK (gender IN ('M', 'F'));
ALTER TABLE history_finishes ADD COLUMN IF NOT EXISTS region_name text;   -- girls: 'North', 'North I', 'Central', ...
CREATE INDEX IF NOT EXISTS history_finishes_gender_idx ON history_finishes (gender, level, year);

COMMIT;

-- Verify: every existing row is boys
SELECT gender, count(*) FROM history_finishes GROUP BY gender;

-- ROLLBACK (only before girls rows are loaded):
--   ALTER TABLE history_finishes DROP COLUMN region_name; ALTER TABLE history_finishes DROP COLUMN gender;
