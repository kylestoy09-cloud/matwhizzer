-- MIGRATION: 20260413_delete_schools_367_399.sql
-- DESCRIPTION: Delete forfeit placeholder schools 367 ('Forfeit') and 399 ('Team Forfeit'),
--              their associated matches rows, tournament_entries, and precomputed_team_scores.
--              All entries belong to synthetic bracket-filler wrestlers
--              (A/B/C/D/E/F/G Forfeit, I Forfeit) — no real athletes. Matches and
--              precomputed_team_scores for these schools are not recoverable and are
--              intentionally destroyed (forfeit placeholders carry no meaningful data).
-- APPLIED: NOT APPLIED
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT te.id, s.display_name, w.first_name, w.last_name, wc.weight, t.name
-- FROM tournament_entries te
-- JOIN schools s ON s.id = te.school_id
-- JOIN wrestlers w ON w.id = te.wrestler_id
-- JOIN weight_classes wc ON wc.id = te.weight_class_id
-- JOIN tournaments t ON t.id = te.tournament_id
-- WHERE te.school_id IN (367, 399)
-- ORDER BY te.school_id, t.id, wc.weight;
--
-- Expected: 11 rows, all with last_name = 'Forfeit'
--
-- ── Entries being deleted ─────────────────────────────────────────────────────
--   school 367 (Forfeit) — 7 entries, all in tourn 101 (Boy_s Districts D9, s1, M)
--     5cefcb8d  A Forfeit  wt=106
--     2174a096  B Forfeit  wt=106
--     80afe84a  C Forfeit  wt=113
--     4c31c4c5  G Forfeit  wt=120
--     27189c23  D Forfeit  wt=138
--     225e8264  E Forfeit  wt=138
--     ca6c5b4f  F Forfeit  wt=285
--
--   school 399 (Team Forfeit) — 4 entries, all in tourn 193 (Girl_s Districts D8, s2, F)
--     5480ab9f  I Forfeit  wt=145
--     78870381  I Forfeit  wt=165
--     6b818b49  I Forfeit  wt=185
--     6d1ae5fc  I Forfeit  wt=235
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Delete matches referencing forfeit entries (must precede tournament_entries deletes)
-- NOTE: Match data for forfeit placeholders is not recoverable — these rows carry no
--       meaningful bout data and are safe to destroy without a restore path.
DELETE FROM matches
WHERE winner_entry_id IN (
  SELECT id FROM tournament_entries WHERE school_id IN (367, 399)
)
OR loser_entry_id IN (
  SELECT id FROM tournament_entries WHERE school_id IN (367, 399)
);

-- ── School 367 (Forfeit) ──────────────────────────────────────────────────────

-- Step 2: Delete 7 forfeit placeholder entries (tourn 101, Boy's Districts D9, s1)
DELETE FROM tournament_entries WHERE id = '5cefcb8d-7fb5-4308-aa48-d3b60ac0ed5a'; -- A Forfeit wt=106
DELETE FROM tournament_entries WHERE id = '2174a096-c8ee-4c2f-adc4-8a516a15b2e7'; -- B Forfeit wt=106
DELETE FROM tournament_entries WHERE id = '80afe84a-9fb9-40bd-8bbc-80a3453a2f83'; -- C Forfeit wt=113
DELETE FROM tournament_entries WHERE id = '4c31c4c5-49d7-4c97-b356-59812c47fd90'; -- G Forfeit wt=120
DELETE FROM tournament_entries WHERE id = '27189c23-1e02-4fdc-bbb0-879daf8b856e'; -- D Forfeit wt=138
DELETE FROM tournament_entries WHERE id = '225e8264-fc94-4b19-81b1-1eac2b8d917b'; -- E Forfeit wt=138
DELETE FROM tournament_entries WHERE id = 'ca6c5b4f-79ee-4b37-93f4-d671896c40eb'; -- F Forfeit wt=285

-- Step 3: Delete precomputed_team_scores for both forfeit schools (must precede schools deletes)
-- NOTE: precomputed_team_scores rows for forfeit placeholder schools are not recoverable,
--       but this is acceptable — these are synthetic schools with no real team data.
DELETE FROM precomputed_team_scores WHERE school_id IN (367, 399);

-- Step 4: Delete school 367
DELETE FROM schools WHERE id = 367;

-- ── School 399 (Team Forfeit) ─────────────────────────────────────────────────

-- Step 5: Delete 4 forfeit placeholder entries (tourn 193, Girl's Districts D8, s2)
DELETE FROM tournament_entries WHERE id = '5480ab9f-c68e-4d8e-94f6-2ac4c8898d52'; -- I Forfeit wt=145
DELETE FROM tournament_entries WHERE id = '78870381-c5c0-4070-ac64-a7ae1cb761a4'; -- I Forfeit wt=165
DELETE FROM tournament_entries WHERE id = '6b818b49-7ae2-4e17-a7aa-617677f7af39'; -- I Forfeit wt=185
DELETE FROM tournament_entries WHERE id = '6d1ae5fc-58d6-40f8-8456-47ed1ebfe212'; -- I Forfeit wt=235

-- Step 6: Delete school 399
DELETE FROM schools WHERE id = 399;

-- Verify: all should return 0
SELECT COUNT(*) AS remaining_367_entries FROM tournament_entries WHERE school_id = 367;
SELECT COUNT(*) AS remaining_399_entries FROM tournament_entries WHERE school_id = 399;
SELECT COUNT(*) AS remaining_schools     FROM schools WHERE id IN (367, 399);

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- NOTE: matches rows deleted in Step 1 and precomputed_team_scores rows deleted
-- in Step 3 are NOT recoverable. Both are acceptable losses — forfeit placeholder
-- schools have no real athletes, no meaningful bout data, and no real team scores.
-- Only tournament_entries and school records can be restored below.
--
-- -- Restore school 367
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (367, 'Forfeit', NULL, FALSE);
--
-- -- Restore school 399
-- INSERT INTO schools (id, display_name, short_name, is_combined)
-- VALUES (399, 'Team Forfeit', NULL, FALSE);
--
-- -- Restore 7 entries for school 367
-- -- (wrestler_ids for A–G Forfeit not recorded here; look up by last_name = 'Forfeit'
-- --  and first_name in ('A','B','C','D','E','F','G') in the wrestlers table)
-- INSERT INTO tournament_entries (id, wrestler_id, tournament_id, school_id, weight_class_id, school_context_raw)
-- VALUES
--     ('5cefcb8d-7fb5-4308-aa48-d3b60ac0ed5a', '<wrestler_id_A>', 101, 367, <wc_id_106_M>, 'Forfeit'),
--     ('2174a096-c8ee-4c2f-adc4-8a516a15b2e7', '<wrestler_id_B>', 101, 367, <wc_id_106_M>, 'Forfeit'),
--     ('80afe84a-9fb9-40bd-8bbc-80a3453a2f83', '<wrestler_id_C>', 101, 367, <wc_id_113_M>, 'Forfeit'),
--     ('4c31c4c5-49d7-4c97-b356-59812c47fd90', '<wrestler_id_G>', 101, 367, <wc_id_120_M>, 'Forfeit'),
--     ('27189c23-1e02-4fdc-bbb0-879daf8b856e', '<wrestler_id_D>', 101, 367, <wc_id_138_M>, 'Forfeit'),
--     ('225e8264-fc94-4b19-81b1-1eac2b8d917b', '<wrestler_id_E>', 101, 367, <wc_id_138_M>, 'Forfeit'),
--     ('ca6c5b4f-79ee-4b37-93f4-d671896c40eb', '<wrestler_id_F>', 101, 367, <wc_id_285_M>, 'Forfeit');
--
-- -- Restore 4 entries for school 399 (I Forfeit wrestler_id = 4f9f380b-27a0-4d69-992c-3b3dbed5e70e)
-- INSERT INTO tournament_entries (id, wrestler_id, tournament_id, school_id, weight_class_id, school_context_raw)
-- VALUES
--     ('5480ab9f-c68e-4d8e-94f6-2ac4c8898d52', '4f9f380b-27a0-4d69-992c-3b3dbed5e70e', 193, 399, <wc_id_145_F>, 'Team Forfeit'),
--     ('78870381-c5c0-4070-ac64-a7ae1cb761a4', '4f9f380b-27a0-4d69-992c-3b3dbed5e70e', 193, 399, <wc_id_165_F>, 'Team Forfeit'),
--     ('6b818b49-7ae2-4e17-a7aa-617677f7af39', '4f9f380b-27a0-4d69-992c-3b3dbed5e70e', 193, 399, <wc_id_185_F>, 'Team Forfeit'),
--     ('6d1ae5fc-58d6-40f8-8456-47ed1ebfe212', '4f9f380b-27a0-4d69-992c-3b3dbed5e70e', 193, 399, <wc_id_235_F>, 'Team Forfeit');
--
-- COMMIT;
