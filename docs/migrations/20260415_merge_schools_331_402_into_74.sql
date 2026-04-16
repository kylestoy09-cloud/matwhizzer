-- MIGRATION: 20260415_merge_schools_331_402_into_74.sql
-- DESCRIPTION: Merge duplicate Paterson JFK school records into canonical school_id 74
--              (John F. Kennedy). School 331 ('Paterson Kennedy') has 1 tournament_entry,
--              1 conference_standings row, 0 precomputed_team_scores, 1 school_alias.
--              School 402 ('John F. Kennedy Patterson') has 2 tournament_entries, 0
--              conference_standings, 3 precomputed_team_scores, 0 school_aliases.
--              Both are the same physical school as school_id 74 and should be consolidated.
-- APPLIED: 2026-04-15
-- NOTE: migration also required DELETE FROM school_regions WHERE school_id IN (331, 402)
--       and UPDATE school_names SET school_id = 74 WHERE school_id IN (331, 402)
--       (FK tables discovered at execution time; not in original file)
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT id, display_name FROM schools WHERE id IN (74, 331, 402);
-- Expected:
--   74  | John F. Kennedy
--   331 | Paterson Kennedy
--   402 | John F. Kennedy Patterson
--
-- SELECT school_id, COUNT(*) FROM tournament_entries      WHERE school_id IN (331, 402) GROUP BY school_id;
-- SELECT school_id, COUNT(*) FROM precomputed_team_scores WHERE school_id IN (331, 402) GROUP BY school_id;
-- SELECT school_id, COUNT(*) FROM conference_standings    WHERE school_id IN (331, 402) GROUP BY school_id;
-- SELECT school_id, COUNT(*) FROM school_aliases          WHERE school_id IN (331, 402) GROUP BY school_id;
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Re-point tournament_entries (3 rows total: 2 from 402, 1 from 331)
UPDATE tournament_entries
SET    school_id = 74
WHERE  school_id IN (331, 402);

-- Step 2: Re-point precomputed_team_scores (3 rows, all from 402)
UPDATE precomputed_team_scores
SET    school_id = 74
WHERE  school_id IN (331, 402);

-- Step 3: Re-point conference_standings (1 row from 331)
UPDATE conference_standings
SET    school_id = 74
WHERE  school_id IN (331, 402);

-- Step 4: Re-point school_aliases (1 row from 331)
UPDATE school_aliases
SET    school_id = 74
WHERE  school_id IN (331, 402);

-- Step 5: Delete the now-empty duplicate school records
DELETE FROM schools WHERE id IN (331, 402);

-- Verify
SELECT COUNT(*) AS remaining_331_or_402_entries     FROM tournament_entries      WHERE school_id IN (331, 402); -- expect 0
SELECT COUNT(*) AS remaining_331_or_402_precomputed FROM precomputed_team_scores WHERE school_id IN (331, 402); -- expect 0
SELECT COUNT(*) AS remaining_331_or_402_standings   FROM conference_standings    WHERE school_id IN (331, 402); -- expect 0
SELECT COUNT(*) AS remaining_331_or_402_aliases     FROM school_aliases          WHERE school_id IN (331, 402); -- expect 0
SELECT COUNT(*) AS remaining_schools                FROM schools                 WHERE id IN (331, 402);        -- expect 0

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Restore school 331 (Paterson Kennedy)
-- INSERT INTO schools (
--     id, display_name, short_name, is_combined,
--     section, classification, mascot,
--     primary_color, secondary_color, tertiary_color,
--     nickname, town, county, founded_year,
--     website_url, athletic_conference,
--     twitter_handle, logo_url
-- ) VALUES (
--     331, 'Paterson Kennedy', NULL, false,
--     'North I', '5', 'Knights',
--     '#CC0022', '#222222', NULL,
--     'Kennedy', 'Paterson', 'Passaic', 1965,
--     'https://jfk.paterson.k12.nj.us', 'Big North Conference',
--     NULL, NULL
-- );
--
-- -- Restore school 402 (John F. Kennedy Patterson)
-- INSERT INTO schools (
--     id, display_name, short_name, is_combined,
--     section, classification, mascot,
--     primary_color, secondary_color, tertiary_color,
--     nickname, town, county, founded_year,
--     website_url, athletic_conference,
--     twitter_handle, logo_url
-- ) VALUES (
--     402, 'John F. Kennedy Patterson', NULL, false,
--     'North I', '5', 'Knights',
--     '#CC0022', '#222222', NULL,
--     'Kennedy', 'Paterson', 'Passaic', 1965,
--     'https://jfk.paterson.k12.nj.us', 'Big North Conference',
--     NULL, NULL
-- );
--
-- -- Re-point tournament_entries back to their original school_ids
-- -- Row 2a30398b-04df-4ea5-bf0e-cd1534e3b2bb → 402 (tournament 138, school_context_raw: 'John F. Kennedy Patterson')
-- -- Row a38268ce-fd81-42a9-9380-890c30a94f03 → 402 (tournament 135, school_context_raw: 'John F. Kennedy Patterson')
-- -- Row 54103057-5916-48e7-aa2e-6944c3606406 → 331 (tournament 187, school_context_raw: 'JFK Paterson ')
-- UPDATE tournament_entries SET school_id = 402
-- WHERE id IN (
--     '2a30398b-04df-4ea5-bf0e-cd1534e3b2bb',
--     'a38268ce-fd81-42a9-9380-890c30a94f03'
-- );
-- UPDATE tournament_entries SET school_id = 331
-- WHERE id = '54103057-5916-48e7-aa2e-6944c3606406';
--
-- -- Re-point precomputed_team_scores back to 402
-- -- Row 1712: girls_districts, season 2, 6.0 pts
-- -- Row 1912: girls_regions, season 1, 26.0 pts
-- -- Row 2103: girls_regions, season 1, 24.0 pts
-- UPDATE precomputed_team_scores SET school_id = 402
-- WHERE id IN (1712, 1912, 2103);
--
-- -- Re-point conference_standings back to 331
-- -- Row 612: big-north-conference, division Liberty, school_name 'Paterson Kennedy'
-- UPDATE conference_standings SET school_id = 331
-- WHERE id = 612;
--
-- -- Re-point school_aliases back to 331
-- -- Row 408: alias 'JFK-Paterson', type 'display_name', notes 'girls only'
-- UPDATE school_aliases SET school_id = 331
-- WHERE id = 408;
--
-- COMMIT;
