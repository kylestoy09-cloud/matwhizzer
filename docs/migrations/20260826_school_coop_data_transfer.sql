-- ============================================================
-- School co-op data transfer
-- Moves tournament/meet/scoring data from retired combined records
-- to their canonical primary school records.
--
-- VERIFY before running:
--   - tournament_entries: confirm it has tournament_id FK to in_season_tournaments
--   - power_points: confirm it has school_id + season_id columns
--   - precomputed_team_scores: confirm columns are (school_id, season_id, gender)
--
-- Run AFTER 20260826_school_coop_consolidation.sql
-- ============================================================

-- ── Jefferson-Sparta (372) → Jefferson (4): season 2 only ───

UPDATE tournament_entries
SET school_id = 4
WHERE school_id = 372
  AND tournament_id IN (
    SELECT id FROM tournaments WHERE season_id = 2
  );

UPDATE dual_meets SET team1_school_id = 4 WHERE team1_school_id = 372 AND season_id = 2;
UPDATE dual_meets SET team2_school_id = 4 WHERE team2_school_id = 372 AND season_id = 2;

UPDATE power_points SET school_id = 4 WHERE school_id = 372 AND season_id = 2;

DELETE FROM precomputed_team_scores WHERE school_id = 372 AND season_id = 2;

UPDATE school_aliases SET school_id = 4 WHERE school_id = 372;

-- ── Ramsey/Northern Highlands (392) → Ramsey (18): season 2 only ──

UPDATE tournament_entries
SET school_id = 18
WHERE school_id = 392
  AND tournament_id IN (
    SELECT id FROM tournaments WHERE season_id = 2
  );

UPDATE dual_meets SET team1_school_id = 18 WHERE team1_school_id = 392 AND season_id = 2;
UPDATE dual_meets SET team2_school_id = 18 WHERE team2_school_id = 392 AND season_id = 2;

UPDATE power_points SET school_id = 18 WHERE school_id = 392 AND season_id = 2;

DELETE FROM precomputed_team_scores WHERE school_id = 392 AND season_id = 2;

UPDATE school_aliases SET school_id = 18 WHERE school_id = 392;

-- ── Morris Hills-Morris Knolls (385) → Morris Hills (76): ALL seasons ──

UPDATE tournament_entries SET school_id = 76 WHERE school_id = 385;

UPDATE dual_meets SET team1_school_id = 76 WHERE team1_school_id = 385;
UPDATE dual_meets SET team2_school_id = 76 WHERE team2_school_id = 385;

UPDATE power_points SET school_id = 76 WHERE school_id = 385;

DELETE FROM precomputed_team_scores WHERE school_id = 385;

UPDATE school_aliases SET school_id = 76 WHERE school_id = 385;

-- ── Cliffside Park combo (365) → Cliffside Park (364): season 1 only ──
-- School 364 stays as "Cliffside Park"; its 2024-25 history absorbs the co-op data.
-- School 357 (Ridgefield Memorial) is its own school from season 2 onward.

UPDATE tournament_entries
SET school_id = 364
WHERE school_id = 365
  AND tournament_id IN (
    SELECT id FROM tournaments WHERE season_id = 1
  );

UPDATE dual_meets SET team1_school_id = 364 WHERE team1_school_id = 365 AND season_id = 1;
UPDATE dual_meets SET team2_school_id = 364 WHERE team2_school_id = 365 AND season_id = 1;

UPDATE power_points SET school_id = 364 WHERE school_id = 365 AND season_id = 1;

DELETE FROM precomputed_team_scores WHERE school_id = 365;

UPDATE school_aliases SET school_id = 364 WHERE school_id = 365;
