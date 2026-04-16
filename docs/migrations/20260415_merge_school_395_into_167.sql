-- MIGRATION: 20260415_merge_school_395_into_167.sql
-- DESCRIPTION: Merge duplicate St. Peter's Prep record (school_id 395,
--              'St Peters Preparatory School') into canonical school_id 167
--              ('St. Peter's Prep'). School 395 has 37 tournament_entries
--              across 3 tournaments, 3 precomputed_team_scores rows, and no
--              aliases or conference_standings rows.
-- APPLIED: 2026-04-15
-- NOTE: migration also required DELETE FROM school_regions/school_districts WHERE school_id = 395
--       and UPDATE school_names SET school_id = 167 WHERE school_id = 395
--       (FK tables discovered at execution time; not in original file)
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT id, display_name FROM schools WHERE id IN (167, 395);
-- Expected:
--   167 | St. Peter's Prep
--   395 | St Peters Preparatory School
--
-- SELECT school_id, COUNT(*) FROM tournament_entries      WHERE school_id = 395 GROUP BY school_id;
-- SELECT school_id, COUNT(*) FROM precomputed_team_scores WHERE school_id = 395 GROUP BY school_id;
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Re-point 37 tournament_entries from 395 → 167
UPDATE tournament_entries
SET    school_id = 167
WHERE  school_id = 395;

-- Step 2: Re-point 3 precomputed_team_scores rows from 395 → 167
UPDATE precomputed_team_scores
SET    school_id = 167
WHERE  school_id = 395;

-- Step 3: Re-point school_aliases from 395 → 167 (0 rows currently, no-op)
UPDATE school_aliases
SET    school_id = 167
WHERE  school_id = 395;

-- Step 4: Delete the now-empty school 395
DELETE FROM schools WHERE id = 395;

-- Verify
SELECT COUNT(*) AS remaining_395_entries     FROM tournament_entries      WHERE school_id = 395; -- expect 0
SELECT COUNT(*) AS remaining_395_precomputed FROM precomputed_team_scores WHERE school_id = 395; -- expect 0
SELECT COUNT(*) AS remaining_395_school      FROM schools                 WHERE id = 395;        -- expect 0

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- Restore school 395 (St Peters Preparatory School)
-- INSERT INTO schools (
--     id, display_name, short_name, is_combined,
--     section, classification, mascot,
--     primary_color, secondary_color, tertiary_color,
--     nickname, town, county, founded_year,
--     website_url, athletic_conference,
--     twitter_handle, logo_url
-- ) VALUES (
--     395, 'St Peters Preparatory School', NULL, false,
--     'Non-Public', 'A', 'Marauders',
--     '#840029', '#737272', NULL,
--     'St. Peter''s Prep', 'Jersey City', 'Hudson', 1872,
--     'https://www.spprep.org', 'Independent',
--     '@spprep', NULL
-- );
--
-- -- Re-point tournament_entries back to 395 (37 rows)
-- -- Tournament 180 (11 rows):
-- UPDATE tournament_entries SET school_id = 395 WHERE id IN (
--     '9278a4db-17ef-422c-9cbe-77e2e8389707',
--     '1c727764-9645-4582-a945-637b9dbd907f',
--     '7cd5873b-94a3-4068-8076-7bf5c1bc5404',
--     '9bc0df48-05e4-449f-ab58-8cafd42dfaf4',
--     '8b01558e-e83a-4564-8417-86ac36aec02b',
--     '9ea5cafa-79a4-4fc2-a837-b8459e355c3f',
--     'b32f204c-bc36-4f4c-8f96-6be4fc6f053e',
--     '92e618f8-7007-4746-8e04-9ffd9fd7605a',
--     '756e0f2d-26b1-478b-82b6-547d8ea7612c',
--     '41c4f424-fe07-44f5-acd3-11b207ded5a9',
--     '05e9368b-24c1-4ffb-bb9d-ecbbbe67d6cb'
-- );
-- -- Tournament 152 (14 rows):
-- UPDATE tournament_entries SET school_id = 395 WHERE id IN (
--     '03ebf84c-3c00-4867-9b4b-ddf42cad49e2',
--     '3aa00b23-58d0-4cae-a098-85c7b4944dce',
--     'e2d3fef8-fe97-4985-8ec5-192353841e18',
--     'b757ac16-5469-4348-acc4-097d97863226',
--     '8dc046fc-b90c-455a-a9c0-b09cbd30e930',
--     '01490e6b-fee8-42ef-af5b-5062da6ad41e',
--     'b6e8eaaf-988c-4fe9-94e3-545abdc37d9e',
--     '7ef4cb0d-1e91-4c08-a7d2-8dce073042bf',
--     '70de935c-4126-4030-abb4-120fd2f4b1aa',
--     'dcbd3488-6939-40d5-9893-194f977daad6',
--     'db938dc5-4ec2-489e-a8d7-da9188f2b90e',
--     'b2931375-119d-4ddc-8b11-12b965150e83',
--     '1446e11c-9c15-43ca-b86b-cfafb90882b8',
--     '968a9ddd-88a9-4979-92bc-330ef083d049'
-- );
-- -- Tournament 175 (12 rows):
-- UPDATE tournament_entries SET school_id = 395 WHERE id IN (
--     '9071c46c-fd7f-4474-a44d-8b9118c93287',
--     '65b5871f-3ed9-442a-be6b-3ce4e9f8d0f0',
--     'd7b46abb-703f-43a3-acc7-57f0a349062e',
--     '24626223-8f12-4c72-9b4a-a956dbc38556',
--     'a6039afb-259b-4e57-a171-b9d7ae97e533',
--     '87cfc633-db97-4e72-950e-d02a22d1e414',
--     '649351c4-18e2-4caa-a64d-4ae8576254c3',
--     '13a500ff-3f09-458c-ab80-7e52fb408ac2',
--     'd735c27e-8052-436b-a1ae-ca8d24e9b85a',
--     '0d1c5a12-ae00-4150-a694-c7d310ca0e1b',
--     'bf32e92c-5481-4819-99d5-5025bf7d23a6',
--     '3805e906-6373-42b5-9a72-0f94d4b31451'
-- );
--
-- -- Re-point precomputed_team_scores back to 395
-- -- Row 1621: boys_districts, season 2, 288.0 pts
-- -- Row  794: regions,        season 2, 258.0 pts
-- -- Row 1069: boys_state,     season 2, 105.0 pts
-- UPDATE precomputed_team_scores SET school_id = 395
-- WHERE id IN (1621, 794, 1069);
--
-- COMMIT;
