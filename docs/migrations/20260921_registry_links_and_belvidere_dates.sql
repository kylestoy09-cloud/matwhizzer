-- docs/migrations/20260921_registry_links_and_belvidere_dates.sql
--
-- Data corrections.
--
-- 1. tournament_registry (girls 2025-26)
--    - Hillsborough Holiday Brawl (12/28, jamboree) was linked to the
--      in_season_tournaments_girls row for the 2025 EB Lady Bear Invitational
--      (c7819525). Separate events: unlink it. EB Lady Bear's own registry row
--      keeps that link.
--    - Del Val Kickoff (12/12, jamboree) was marked imported, but its tournament
--      row has 0 bouts and no pairings are in dual_meets_girls. Mark not imported.
--
-- 2. Belvidere boys duals had their dates swapped. Per the source export
--    (Team Playoffs.rtf): Belvidere 12-62 Bloomfield was 02/14/2026 and
--    Union 58-22 Belvidere was 02/21/2026. Scores and bouts are unchanged.

-- ── DRY RUN (read-only) ─────────────────────────────────────────────────────
SELECT id, name, date_start, imported, in_season_tournament_id
FROM tournament_registry
WHERE id IN ('e035ffdd-974d-49ed-a292-b87b4e880975', 'c58cc783-2965-44a8-b157-399ec0919cb7',
             '764133e2-c4dd-422d-b302-eff04844e9b8');

SELECT id, meet_date, team1_school_id, team1_score, team2_score, team2_school_id
FROM dual_meets
WHERE id IN ('b9b20fe0-1e51-46d0-8dc7-d0b53e9c22f0', '6ba739c1-e89d-4588-a423-4640ecf69079');

-- ── 1. Registry ─────────────────────────────────────────────────────────────
UPDATE tournament_registry
SET in_season_tournament_id = NULL
WHERE id = 'e035ffdd-974d-49ed-a292-b87b4e880975'                  -- Hillsborough Holiday Brawl
  AND in_season_tournament_id = 'c7819525-a6dc-41b8-8605-74ca51de4ec8';

UPDATE tournament_registry
SET imported = false
WHERE id = 'c58cc783-2965-44a8-b157-399ec0919cb7';                 -- Del Val Kickoff

-- ── 2. Belvidere dates ──────────────────────────────────────────────────────
UPDATE dual_meets SET meet_date = '2026-02-14'
WHERE id = 'b9b20fe0-1e51-46d0-8dc7-d0b53e9c22f0' AND meet_date = '2026-02-21';   -- Bloomfield 62-12 Belvidere

UPDATE dual_meets SET meet_date = '2026-02-21'
WHERE id = '6ba739c1-e89d-4588-a423-4640ecf69079' AND meet_date = '2026-02-14';   -- Belvidere 22-58 Union

-- Verify (same queries as the dry run)
SELECT id, name, imported, in_season_tournament_id FROM tournament_registry
WHERE id IN ('e035ffdd-974d-49ed-a292-b87b4e880975', 'c58cc783-2965-44a8-b157-399ec0919cb7');
SELECT id, meet_date, team1_school_id, team2_school_id FROM dual_meets
WHERE id IN ('b9b20fe0-1e51-46d0-8dc7-d0b53e9c22f0', '6ba739c1-e89d-4588-a423-4640ecf69079');

-- ROLLBACK:
-- UPDATE tournament_registry SET in_season_tournament_id = 'c7819525-a6dc-41b8-8605-74ca51de4ec8' WHERE id = 'e035ffdd-974d-49ed-a292-b87b4e880975';
-- UPDATE tournament_registry SET imported = true WHERE id = 'c58cc783-2965-44a8-b157-399ec0919cb7';
-- UPDATE dual_meets SET meet_date = '2026-02-21' WHERE id = 'b9b20fe0-1e51-46d0-8dc7-d0b53e9c22f0';
-- UPDATE dual_meets SET meet_date = '2026-02-14' WHERE id = '6ba739c1-e89d-4588-a423-4640ecf69079';
