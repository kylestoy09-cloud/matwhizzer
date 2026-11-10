-- docs/migrations/20261110_falls_under_3s_to_6_00.sql
--
-- Pinned list: falls recorded at 0:00, 0:01 or 0:02 can't happen. Kyle 2026-11-10: set them to 6:00 (a 0:00 is a
-- time that was never entered; 0:01 / 0:02 likewise); 0:03 and up stay. Falls only: tech falls and injury
-- defaults with a 0 time (the postseason table stores 0 for "no time") are not touched, and no score text changes.
-- 30 bouts, all seasons. Backup: docs/migrations/backups/20261110_falls_under_3s_before.json
-- Run in the Supabase SQL editor.

DO $$
DECLARE n int;
BEGIN
  -- dual_meet_matches: 8 (0s ×2, 1s ×5, 2s ×1)
  UPDATE dual_meet_matches SET fall_time_seconds = 360 WHERE fall_time_seconds < 3 AND id IN (
    '96ec97fb-6479-4ad1-b812-bc7e333cdc82',
    'ac381ef4-7c5e-4826-8582-8d6d43f93bfe',
    '486c75f1-699f-44f2-a411-b5f6fd3898d2',
    '8a82197a-a0a1-448e-8683-d0c89439c524',
    'ee33482b-3b46-41b1-9a08-ff31971132e1',
    '0691ff63-a99a-4740-af49-fef1b93d012b',
    '14810674-47ea-407b-ba1c-25fb576e0d33',
    '3c6cb28d-4e73-4fbe-8c09-9a33e6a29c68');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 8 THEN RAISE EXCEPTION 'dual_meet_matches: % of 8', n; END IF;
  -- dual_meet_matches_girls: 3 (0s ×2, 2s ×1)
  UPDATE dual_meet_matches_girls SET fall_time_seconds = 360 WHERE fall_time_seconds < 3 AND id IN (
    '03535f7d-8acd-4440-941f-f2a90828041a',
    '9708f040-61d6-409a-9d0b-fba247670085',
    '6312e21a-5ecd-4af5-9aea-6019dc2957a5');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 3 THEN RAISE EXCEPTION 'dual_meet_matches_girls: % of 3', n; END IF;
  -- tournament_bouts_girls: 1 (1s ×1)
  UPDATE tournament_bouts_girls SET fall_time_seconds = 360 WHERE fall_time_seconds < 3 AND id IN (
    'fe80d0ce-ec7c-4da7-b38a-bac149f390b4');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'tournament_bouts_girls: % of 1', n; END IF;
  -- matches: 18 (0s ×17, 2s ×1)
  UPDATE matches SET fall_time_seconds = 360 WHERE fall_time_seconds < 3 AND id IN (
    '42278f0f-461f-4c0e-83d9-bc20e1a24580',
    'e3b79801-3bad-4f35-ac10-db926e3a2b96',
    '362a2101-daae-4d91-9b9e-cf539d1061b7',
    'd8ff0e2f-f474-4f4e-9e24-31da8a843580',
    '75739bdb-03b1-443e-b495-b01e5cf2bb9d',
    'faff07d5-de16-4b3c-a61c-f4760209ab61',
    '14ad4a47-8517-4692-ac28-e5852d661be5',
    '37613a15-0359-464d-8efe-794b24c24b38',
    '1c8bc733-769c-4c1e-8420-5e6556c271b4',
    'f0674de7-cdfc-4341-909e-6a85f9c8bac2',
    '4ba5a0d7-e87a-4ed0-8aa5-164be659b30f',
    'bcfa07b8-4719-4b26-ac55-a537d0e2df9c',
    '6022b42a-0b00-4a81-81ab-3c9e322203c3',
    '31fc1601-869a-4320-99c9-d605fec6a6fa',
    'd578470f-85f2-47c6-89c3-765261960188',
    '7e45447e-87e2-4b15-b126-77efcf7f28e1',
    'c174e9bf-2cc2-4361-a77b-0d58a7d6b627',
    'c48f43ce-d378-47eb-950b-3e985a6c5fd6');
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 18 THEN RAISE EXCEPTION 'matches: % of 18', n; END IF;
END $$;

-- Verify: every count 0
SELECT 'dual_meet_matches' AS t, count(*) FROM dual_meet_matches WHERE result_type = 'Fall' AND fall_time_seconds < 3
UNION ALL SELECT 'dual_meet_matches_girls', count(*) FROM dual_meet_matches_girls WHERE result_type = 'Fall' AND fall_time_seconds < 3
UNION ALL SELECT 'tournament_bouts', count(*) FROM tournament_bouts WHERE result_type = 'Fall' AND fall_time_seconds < 3
UNION ALL SELECT 'tournament_bouts_girls', count(*) FROM tournament_bouts_girls WHERE result_type = 'Fall' AND fall_time_seconds < 3
UNION ALL SELECT 'matches', count(*) FROM matches WHERE upper(win_type) = 'FALL' AND fall_time_seconds < 3;
