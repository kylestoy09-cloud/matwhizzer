-- docs/migrations/20261111_split_sydney_johnson.sql
--
-- Two girls named Sydney Johnson share one profile (890e6e66): Liberty High School - Bethlehem (PA) at 235
-- (Escape the Rock, 12/13/2025) and Boiling Springs (SC) at 100 (Girls Beast of the East, 12/18/2025).
-- Same season, 135 lbs apart: different wrestlers (no-alias review, Kyle 2026-11-11). The Boiling Springs
-- girl gets her own out-of-state profile; her 2 bouts and a name link move to it.
-- Run in the Supabase SQL editor.

BEGIN;

INSERT INTO wrestlers (id, first_name, last_name, gender, is_oos, main_weight)
VALUES ('a1c11420-64db-4d1b-913b-f303b2d69f9f', 'Sydney', 'Johnson', 'F', true, '100');

UPDATE tournament_bouts_girls SET wrestler2_id = 'a1c11420-64db-4d1b-913b-f303b2d69f9f'
WHERE id IN ('c5f01053-be29-4db6-9d95-a080d620be02', 'c1a4ebda-f6df-435a-8439-031131b0ace8')
  AND wrestler2_id = '890e6e66-ed20-4de4-be8e-f99271cc9ae6' AND wrestler2_school_id = 1081;

INSERT INTO wrestler_name_aliases (raw_name, school_id, wrestler_id)
VALUES ('Sydney Johnson', 1081, 'a1c11420-64db-4d1b-913b-f303b2d69f9f')
ON CONFLICT (raw_name, school_id) DO NOTHING;

COMMIT;

-- Verify: new profile has 2 bouts at 1081; the old profile keeps 1 bout at 585
SELECT wrestler2_id, wrestler2_school_id, count(*) FROM tournament_bouts_girls
WHERE wrestler2_id IN ('a1c11420-64db-4d1b-913b-f303b2d69f9f', '890e6e66-ed20-4de4-be8e-f99271cc9ae6') GROUP BY 1, 2;

-- ROLLBACK: UPDATE tournament_bouts_girls SET wrestler2_id = '890e6e66-ed20-4de4-be8e-f99271cc9ae6' WHERE wrestler2_id = 'a1c11420-64db-4d1b-913b-f303b2d69f9f';
--           DELETE FROM wrestler_name_aliases WHERE wrestler_id = 'a1c11420-64db-4d1b-913b-f303b2d69f9f'; DELETE FROM wrestlers WHERE id = 'a1c11420-64db-4d1b-913b-f303b2d69f9f';
