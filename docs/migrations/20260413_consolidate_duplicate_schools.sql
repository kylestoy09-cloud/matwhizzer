-- MIGRATION: 20260413_consolidate_duplicate_schools.sql
-- DESCRIPTION: Consolidate 26 duplicate/stale school IDs into their canonical
--              counterparts. For each loser school all dependent rows are moved
--              to the winner before the loser record is deleted.
--
-- DEPENDENT TABLES (in update order):
--   1. tournament_entries   — UPDATE school_id
--   2. school_aliases       — UPDATE school_id
--   3. school_names         — UPDATE school_id  (abbreviation → school_id lookup table)
--   4. school_districts     — INSERT winner + DELETE loser (composite PK, may conflict)
--   5. school_regions       — INSERT winner + DELETE loser (composite PK, may conflict)
--   6. precomputed_team_scores — DELETE loser rows (scores will be recomputed)
--   7. schools              — DELETE loser record
--
-- APPLIED: NOT APPLIED
--
-- NOTE ON VERIFY QUERY: The verify list at the bottom includes 102, 118, and 394,
--   which are winner (kept) IDs — they will appear in verify results. All other
--   IDs in the list are losers and should return 0 rows after this migration.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Becton  —  loser 90 → winner 321
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 321 WHERE school_id = 90;
UPDATE school_aliases        SET school_id = 321 WHERE school_id = 90;  -- 3 rows
UPDATE school_names          SET school_id = 321 WHERE school_id = 90;  -- 1 row
INSERT INTO school_districts (school_id, district_id)
    SELECT 321, district_id FROM school_districts WHERE school_id = 90
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 90;
INSERT INTO school_regions (school_id, region_id)
    SELECT 321, region_id FROM school_regions WHERE school_id = 90
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 90;
DELETE FROM precomputed_team_scores WHERE school_id = 90;               -- 8 rows
DELETE FROM schools WHERE id = 90;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Governor Livingston  —  loser 368 → winner 102
--    (368 = 'Governor Livingston Regional Hs', 102 = 'Governor Livingston')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 102 WHERE school_id = 368; -- 16 rows
-- school_aliases: no rows for 368
-- school_names:   no rows for 368
-- school_districts: no rows for 368
-- school_regions:   no rows for 368
DELETE FROM precomputed_team_scores WHERE school_id = 368;              -- 1 row
DELETE FROM schools WHERE id = 368;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. St. Benedict's Prep  —  loser 396 → winner 118
--    (396 = 'St. Benedict`s Prep', 118 = 'St. Benedicts Prep School')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 118 WHERE school_id = 396; -- 21 rows
-- school_aliases: no rows for 396
-- school_names:   no rows for 396
-- school_districts: no rows for 396
-- school_regions:   no rows for 396
DELETE FROM precomputed_team_scores WHERE school_id = 396;              -- 6 rows
DELETE FROM schools WHERE id = 396;

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. Summit  —  loser 137 → winner 397
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 397 WHERE school_id = 137; -- 25 rows
UPDATE school_aliases        SET school_id = 397 WHERE school_id = 137; -- 2 rows
UPDATE school_names          SET school_id = 397 WHERE school_id = 137; -- 1 row
INSERT INTO school_districts (school_id, district_id)
    SELECT 397, district_id FROM school_districts WHERE school_id = 137
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 137;
INSERT INTO school_regions (school_id, region_id)
    SELECT 397, region_id FROM school_regions WHERE school_id = 137
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 137;
DELETE FROM precomputed_team_scores WHERE school_id = 137;              -- 4 rows
DELETE FROM schools WHERE id = 137;

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. Bound Brook  —  loser 140 → winner 322
--    (140 = 'Bound Brook HS', 322 = 'Bound Brook')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 322 WHERE school_id = 140; -- 41 rows
UPDATE school_aliases        SET school_id = 322 WHERE school_id = 140; -- 2 rows
UPDATE school_names          SET school_id = 322 WHERE school_id = 140; -- 1 row
INSERT INTO school_districts (school_id, district_id)
    SELECT 322, district_id FROM school_districts WHERE school_id = 140
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 140;
INSERT INTO school_regions (school_id, region_id)
    SELECT 322, region_id FROM school_regions WHERE school_id = 140
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 140;
DELETE FROM precomputed_team_scores WHERE school_id = 140;              -- 11 rows
DELETE FROM schools WHERE id = 140;

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. Middlesex/Dunellen  —  loser 142 → winner 383
--    (142 = 'Middlesex/Dunellen', 383 = 'Middlesex')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 383 WHERE school_id = 142; -- 33 rows
UPDATE school_aliases        SET school_id = 383 WHERE school_id = 142; -- 2 rows
-- school_names: no rows for 142
INSERT INTO school_districts (school_id, district_id)
    SELECT 383, district_id FROM school_districts WHERE school_id = 142
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 142;
INSERT INTO school_regions (school_id, region_id)
    SELECT 383, region_id FROM school_regions WHERE school_id = 142
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 142;
DELETE FROM precomputed_team_scores WHERE school_id = 142;              -- 3 rows
DELETE FROM schools WHERE id = 142;

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. Monmouth Regional  —  loser 161 → winner 384
--    (161 = 'Monmouth Regional', 384 = 'Monmouth')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 384 WHERE school_id = 161; -- 14 rows
UPDATE school_aliases        SET school_id = 384 WHERE school_id = 161; -- 3 rows
UPDATE school_names          SET school_id = 384 WHERE school_id = 161; -- 2 rows
INSERT INTO school_districts (school_id, district_id)
    SELECT 384, district_id FROM school_districts WHERE school_id = 161
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 161;
INSERT INTO school_regions (school_id, region_id)
    SELECT 384, region_id FROM school_regions WHERE school_id = 161
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 161;
DELETE FROM precomputed_team_scores WHERE school_id = 161;              -- 4 rows
DELETE FROM schools WHERE id = 161;

-- ═════════════════════════════════════════════════════════════════════════════
-- 8. Jackson Memorial  —  loser 202 → winner 370
--    (202 = 'Jackson Memorial Hs', 370 = 'Jackson Township')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 370 WHERE school_id = 202; -- 38 rows
UPDATE school_aliases        SET school_id = 370 WHERE school_id = 202; -- 2 rows
UPDATE school_names          SET school_id = 370 WHERE school_id = 202; -- 1 row
INSERT INTO school_districts (school_id, district_id)
    SELECT 370, district_id FROM school_districts WHERE school_id = 202
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 202;
INSERT INTO school_regions (school_id, region_id)
    SELECT 370, region_id FROM school_regions WHERE school_id = 202
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 202;
DELETE FROM precomputed_team_scores WHERE school_id = 202;              -- 5 rows
DELETE FROM schools WHERE id = 202;

-- ═════════════════════════════════════════════════════════════════════════════
-- 9. Northern Burlington  —  loser 212 → winner 388
--    (212 = 'Northern Burlington County Regional', 388 = 'Northern Burlington')
--    No tournament_entries for 212; aliases, districts, regions, precomputed only.
-- ═════════════════════════════════════════════════════════════════════════════
-- tournament_entries: 0 rows for 212, nothing to re-point
UPDATE school_aliases        SET school_id = 388 WHERE school_id = 212; -- 4 rows
UPDATE school_names          SET school_id = 388 WHERE school_id = 212; -- 1 row
INSERT INTO school_districts (school_id, district_id)
    SELECT 388, district_id FROM school_districts WHERE school_id = 212
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 212;
INSERT INTO school_regions (school_id, region_id)
    SELECT 388, region_id FROM school_regions WHERE school_id = 212
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 212;
DELETE FROM precomputed_team_scores WHERE school_id = 212;              -- 1 row
DELETE FROM schools WHERE id = 212;

-- ═════════════════════════════════════════════════════════════════════════════
-- 10. Bordentown  —  loser 323 (delete only — no tournament_entries)
--     (323 = 'Bordentown/Florence', 227 = 'Bordentown Regional/Florence' is winner)
--     Only has 1 alias row and 1 school_regions row; no entries, no precomputed.
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE school_aliases        SET school_id = 227 WHERE school_id = 323; -- 1 row
-- school_names: 0 rows for 323
-- school_districts: 0 rows for 323
INSERT INTO school_regions (school_id, region_id)
    SELECT 227, region_id FROM school_regions WHERE school_id = 323
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 323;
-- precomputed_team_scores: 0 rows for 323
DELETE FROM schools WHERE id = 323;

-- ═════════════════════════════════════════════════════════════════════════════
-- 11. North Brunswick  —  loser 337 → winner 162
--     (337 = 'North Brunswick Township', 162 = 'North Brunswick')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 162 WHERE school_id = 337; -- 48 rows
UPDATE school_aliases        SET school_id = 162 WHERE school_id = 337; -- 1 row
UPDATE school_names          SET school_id = 162 WHERE school_id = 337; -- 1 row
-- school_districts: 0 rows for 337
INSERT INTO school_regions (school_id, region_id)
    SELECT 162, region_id FROM school_regions WHERE school_id = 337
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 337;
DELETE FROM precomputed_team_scores WHERE school_id = 337;              -- 5 rows
DELETE FROM schools WHERE id = 337;

-- ═════════════════════════════════════════════════════════════════════════════
-- 12. Northern Highlands  —  loser 339 → winner 35
--     (339 = 'Northern Highlands Regional', 35 = 'Northern Highlands')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 35  WHERE school_id = 339; -- 43 rows
UPDATE school_aliases        SET school_id = 35  WHERE school_id = 339; -- 2 rows
UPDATE school_names          SET school_id = 35  WHERE school_id = 339; -- 1 row
INSERT INTO school_districts (school_id, district_id)
    SELECT 35, district_id FROM school_districts WHERE school_id = 339
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 339;
INSERT INTO school_regions (school_id, region_id)
    SELECT 35, region_id FROM school_regions WHERE school_id = 339
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 339;
DELETE FROM precomputed_team_scores WHERE school_id = 339;              -- 5 rows
DELETE FROM schools WHERE id = 339;

-- ═════════════════════════════════════════════════════════════════════════════
-- 13. East Brunswick  —  loser 366 → winner 158
--     (366 = 'East Brunswick H.S.', 158 = 'East Brunswick')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 158 WHERE school_id = 366; -- 45 rows
-- school_aliases: 0 rows for 366
UPDATE school_names          SET school_id = 158 WHERE school_id = 366; -- 1 row
-- school_districts: 0 rows for 366
-- school_regions:   0 rows for 366
DELETE FROM precomputed_team_scores WHERE school_id = 366;              -- 6 rows
DELETE FROM schools WHERE id = 366;

-- ═════════════════════════════════════════════════════════════════════════════
-- 14. Kittatinny  —  loser 375 → winner 315
--     (375 = 'Kittatinny Regional Jr/Sr', 315 = 'Kittatinny')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 315 WHERE school_id = 375; -- 37 rows
-- school_aliases: 0 rows for 375
UPDATE school_names          SET school_id = 315 WHERE school_id = 375; -- 2 rows
-- school_districts: 0 rows for 375
-- school_regions:   0 rows for 375
DELETE FROM precomputed_team_scores WHERE school_id = 375;              -- 5 rows
DELETE FROM schools WHERE id = 375;

-- ═════════════════════════════════════════════════════════════════════════════
-- 15. Lakeland  —  loser 376 → winner 5
--     (376 = 'Lakeland Reg', 5 = 'Lakeland')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 5   WHERE school_id = 376; -- 48 rows
-- school_aliases: 0 rows for 376
UPDATE school_names          SET school_id = 5   WHERE school_id = 376; -- 1 row
-- school_districts: 0 rows for 376
-- school_regions:   0 rows for 376
DELETE FROM precomputed_team_scores WHERE school_id = 376;              -- 8 rows
DELETE FROM schools WHERE id = 376;

-- ═════════════════════════════════════════════════════════════════════════════
-- 16. Lenape Valley  —  loser 377 → winner 62
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 62  WHERE school_id = 377; -- 24 rows
-- school_aliases: 0 rows for 377
UPDATE school_names          SET school_id = 62  WHERE school_id = 377; -- 2 rows
-- school_districts: 0 rows for 377
-- school_regions:   0 rows for 377
DELETE FROM precomputed_team_scores WHERE school_id = 377;              -- 4 rows
DELETE FROM schools WHERE id = 377;

-- ═════════════════════════════════════════════════════════════════════════════
-- 17. Mt. Olive  —  loser 386 → winner 56
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 56  WHERE school_id = 386; -- 19 rows
-- school_aliases: 0 rows for 386
UPDATE school_names          SET school_id = 56  WHERE school_id = 386; -- 1 row
-- school_districts: 0 rows for 386
-- school_regions:   0 rows for 386
DELETE FROM precomputed_team_scores WHERE school_id = 386;              -- 3 rows
DELETE FROM schools WHERE id = 386;

-- ═════════════════════════════════════════════════════════════════════════════
-- 18. Newark Academy  —  loser 387 → winner 115
--     (387 = 'Newark Academy/Morris Catholic', 115 = 'Newark Academy')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 115 WHERE school_id = 387; -- 6 rows
-- school_aliases: 0 rows for 387
-- school_names:   0 rows for 387
-- school_districts: 0 rows for 387
-- school_regions:   0 rows for 387
DELETE FROM precomputed_team_scores WHERE school_id = 387;              -- 1 row
DELETE FROM schools WHERE id = 387;

-- ═════════════════════════════════════════════════════════════════════════════
-- 19. Overbrook  —  loser 389 → winner 299
--     (389 = 'Overbrook Reg Senior', 299 = 'Overbrook')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 299 WHERE school_id = 389; -- 30 rows
-- school_aliases: 0 rows for 389
UPDATE school_names          SET school_id = 299 WHERE school_id = 389; -- 1 row
-- school_districts: 0 rows for 389
-- school_regions:   0 rows for 389
DELETE FROM precomputed_team_scores WHERE school_id = 389;              -- 4 rows
DELETE FROM schools WHERE id = 389;

-- ═════════════════════════════════════════════════════════════════════════════
-- 20. Parsippany Hills (co-op)  —  loser 390 → winner 78
--     (390 = 'Parsippany Hills/Parsippany', 78 = 'Parsippany Hills')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 78  WHERE school_id = 390; -- 13 rows
-- school_aliases: 0 rows for 390
-- school_names:   0 rows for 390
-- school_districts: 0 rows for 390
-- school_regions:   0 rows for 390
DELETE FROM precomputed_team_scores WHERE school_id = 390;              -- 2 rows
DELETE FROM schools WHERE id = 390;

-- ═════════════════════════════════════════════════════════════════════════════
-- 21. St Joseph (Montvale)  —  loser 47 → winner 394
--     (47 = 'St Joseph Regional', 394 = 'St Joseph (Montvale) HS')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 394 WHERE school_id = 47;  -- 37 rows
UPDATE school_aliases        SET school_id = 394 WHERE school_id = 47;  -- 3 rows
UPDATE school_names          SET school_id = 394 WHERE school_id = 47;  -- 1 row
INSERT INTO school_districts (school_id, district_id)
    SELECT 394, district_id FROM school_districts WHERE school_id = 47
    ON CONFLICT (school_id, district_id) DO NOTHING;
DELETE FROM school_districts WHERE school_id = 47;
INSERT INTO school_regions (school_id, region_id)
    SELECT 394, region_id FROM school_regions WHERE school_id = 47
    ON CONFLICT (school_id, region_id) DO NOTHING;
DELETE FROM school_regions WHERE school_id = 47;
DELETE FROM precomputed_team_scores WHERE school_id = 47;               -- 3 rows
DELETE FROM schools WHERE id = 47;

-- ═════════════════════════════════════════════════════════════════════════════
-- 22. Parsippany Hills HS  —  loser 400 → winner 78
--     (400 = 'Parsippany Hills High School', 78 = 'Parsippany Hills')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 78  WHERE school_id = 400; -- 7 rows
-- school_aliases: 0 rows for 400
-- school_names:   0 rows for 400
-- school_districts: 0 rows for 400
-- school_regions:   0 rows for 400
DELETE FROM precomputed_team_scores WHERE school_id = 400;              -- 1 row
DELETE FROM schools WHERE id = 400;

-- ═════════════════════════════════════════════════════════════════════════════
-- 23. Montville  —  loser 401 → winner 75
--     (401 = 'Montville Township High School', 75 = 'Montville')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 75  WHERE school_id = 401; -- 6 rows
-- school_aliases: 0 rows for 401
-- school_names:   0 rows for 401
-- school_districts: 0 rows for 401
-- school_regions:   0 rows for 401
DELETE FROM precomputed_team_scores WHERE school_id = 401;              -- 2 rows
DELETE FROM schools WHERE id = 401;

-- ═════════════════════════════════════════════════════════════════════════════
-- 24. Piscataway  —  loser 403 → winner 183
--     (403 = 'Piscataway High School', 183 = 'Piscataway')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 183 WHERE school_id = 403; -- 2 rows
-- school_aliases: 0 rows for 403
-- school_names:   0 rows for 403
-- school_districts: 0 rows for 403
-- school_regions:   0 rows for 403
DELETE FROM precomputed_team_scores WHERE school_id = 403;              -- 1 row
DELETE FROM schools WHERE id = 403;

-- ═════════════════════════════════════════════════════════════════════════════
-- 25. Highland  —  loser 405 → winner 369
--     (405 = 'Highland Regional High School', 369 = 'Highland')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 369 WHERE school_id = 405; -- 2 rows
-- school_aliases: 0 rows for 405
-- school_names:   0 rows for 405
-- school_districts: 0 rows for 405
-- school_regions:   0 rows for 405
DELETE FROM precomputed_team_scores WHERE school_id = 405;              -- 1 row
DELETE FROM schools WHERE id = 405;

-- ═════════════════════════════════════════════════════════════════════════════
-- 26. Willingboro  —  loser 406 → winner 265
--     (406 = 'Willingboro High School', 265 = 'Willingboro')
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE tournament_entries    SET school_id = 265 WHERE school_id = 406; -- 2 rows
-- school_aliases: 0 rows for 406
-- school_names:   0 rows for 406
-- school_districts: 0 rows for 406
-- school_regions:   0 rows for 406
DELETE FROM precomputed_team_scores WHERE school_id = 406;              -- 1 row
DELETE FROM schools WHERE id = 406;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFY — should return 0 rows for all loser IDs
-- NOTE: 102, 118, 394 are winner IDs and will still appear in results.
-- ═════════════════════════════════════════════════════════════════════════════
SELECT id, display_name FROM schools
WHERE id IN (90,102,118,137,140,142,161,202,212,227,337,339,366,368,375,376,377,386,387,389,390,394,396,400,401,403,405,406)
ORDER BY id;

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- Re-inserts deleted school records. Full data rollback (re-pointing entries
-- back to loser IDs) requires the inverse UPDATE statements below or a restore
-- from backup.
-- ═════════════════════════════════════════════════════════════════════════════
-- BEGIN;
--
-- -- Re-insert deleted school records
-- INSERT INTO schools (id, display_name, short_name, is_combined) VALUES
--   (47,  'St Joseph Regional',                       NULL, FALSE),
--   (90,  'Becton',                                   NULL, TRUE),
--   (137, 'Summit',                                   NULL, TRUE),
--   (140, 'Bound Brook HS',                           NULL, FALSE),
--   (142, 'Middlesex/Dunellen',                       NULL, TRUE),
--   (161, 'Monmouth Regional',                        NULL, FALSE),
--   (202, 'Jackson Memorial Hs',                      NULL, FALSE),
--   (212, 'Northern Burlington County Regional',      NULL, FALSE),
--   (323, 'Bordentown/Florence',                      NULL, TRUE),
--   (337, 'North Brunswick Township',                 NULL, FALSE),
--   (339, 'Northern Highlands Regional',              NULL, FALSE),
--   (366, 'East Brunswick H.S.',                      NULL, FALSE),
--   (368, 'Governor Livingston Regional Hs',          NULL, FALSE),
--   (375, 'Kittatinny Regional Jr/Sr',                NULL, FALSE),
--   (376, 'Lakeland Reg',                             NULL, FALSE),
--   (377, 'Lenape Valley',                            NULL, FALSE),
--   (386, 'Mt. Olive',                                NULL, FALSE),
--   (387, 'Newark Academy/Morris Catholic',           NULL, FALSE),
--   (389, 'Overbrook Reg Senior',                     NULL, FALSE),
--   (390, 'Parsippany Hills/Parsippany',              NULL, FALSE),
--   (396, 'St. Benedict`s Prep',                      NULL, FALSE),
--   (400, 'Parsippany Hills High School',             NULL, FALSE),
--   (401, 'Montville Township High School',           NULL, FALSE),
--   (403, 'Piscataway High School',                   NULL, FALSE),
--   (405, 'Highland Regional High School',            NULL, FALSE),
--   (406, 'Willingboro High School',                  NULL, FALSE);
--
-- -- Reverse tournament_entries re-points (run in reverse order)
-- UPDATE tournament_entries SET school_id = 406 WHERE school_id = 265 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 405 WHERE school_id = 369 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 403 WHERE school_id = 183 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 401 WHERE school_id = 75  AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 400 WHERE school_id = 78  AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 47  WHERE school_id = 394 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 390 WHERE school_id = 78  AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 389 WHERE school_id = 299 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 387 WHERE school_id = 115 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 386 WHERE school_id = 56  AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 377 WHERE school_id = 62  AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 376 WHERE school_id = 5   AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 375 WHERE school_id = 315 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 396 WHERE school_id = 118 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 390 WHERE school_id = 78  AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 368 WHERE school_id = 102 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 366 WHERE school_id = 158 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 339 WHERE school_id = 35  AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 337 WHERE school_id = 162 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 2);
-- UPDATE tournament_entries SET school_id = 202 WHERE school_id = 370 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 161 WHERE school_id = 384 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 142 WHERE school_id = 383 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 140 WHERE school_id = 322 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 137 WHERE school_id = 397 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
-- UPDATE tournament_entries SET school_id = 90  WHERE school_id = 321 AND tournament_id IN (SELECT id FROM tournaments WHERE season_id = 1);
--
-- COMMIT;
