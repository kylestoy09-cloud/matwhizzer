-- docs/migrations/20261113_playoff_history_2021_24_girls.sql
--
-- Playoff History, part 2 (Kyle 2026-11-13: "we need to fill out the individual tournament for the girls data we have
-- as well … the state brackets can be recreated, match data will have to do for districts and regions").
--   * seasons 2020-21 … 2023-24 (boys 2021-2024 exports are coming; girls have 2019-2024 region + state exports)
--   * 'history' rows (hidden) for boys 2021-2024 and girls 2019-2024
-- Same rules as 20261113_playoff_history.sql: postseason pages only, hidden until switched on in each side's
-- Playoff History Review tool; getSeasons() leaves history-only seasons out. Run in the Supabase SQL editor.

BEGIN;

INSERT INTO seasons (id, label, year_label, start_year, end_year)
SELECT y, (y - 1) || '-' || right(y::text, 2), (y - 1) || '-' || right(y::text, 2), y - 1, y
FROM generate_series(2021, 2024) y
ON CONFLICT (id) DO NOTHING;

INSERT INTO season_gender_state (season_id, gender, stage, is_public_default, history_public)
SELECT y, g, 'history', false, false
FROM (SELECT y, 'M' AS g FROM generate_series(2021, 2024) y UNION ALL SELECT y, 'F' FROM generate_series(2019, 2024) y) x
WHERE NOT EXISTS (SELECT 1 FROM season_gender_state s WHERE s.season_id = x.y AND s.gender = x.g);

-- team-name decisions per side: boys and girls are separate programs (co-ops differ); the table is empty so far
ALTER TABLE playoff_history_schools ADD COLUMN IF NOT EXISTS gender char(1) NOT NULL DEFAULT 'M' CHECK (gender IN ('M', 'F'));
ALTER TABLE playoff_history_schools DROP CONSTRAINT IF EXISTS playoff_history_schools_pkey;
ALTER TABLE playoff_history_schools ADD PRIMARY KEY (gender, raw_name);

COMMIT;

-- Verify: boys 2013-2024 (12 rows), girls 2019-2024 (6 rows), all history and hidden
SELECT gender, count(*), min(season_id), max(season_id), bool_or(history_public) AS any_public
FROM season_gender_state WHERE stage = 'history' GROUP BY gender ORDER BY gender;
-- expect F 6 2019 2024 false; M 12 2013 2024 false

-- ROLLBACK: DELETE FROM season_gender_state WHERE stage = 'history' AND (season_id BETWEEN 2021 AND 2024 OR gender = 'F');
--           DELETE FROM seasons WHERE id BETWEEN 2021 AND 2024;
