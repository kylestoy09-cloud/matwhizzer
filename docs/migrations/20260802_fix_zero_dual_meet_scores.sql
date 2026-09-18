-- Fix 11 dual_meets where the losing team's score was stored as NULL instead of 0.
-- Root cause: import route used `score || null` which coerces 0 → null.
-- All scores verified by recomputing from dual_meet_matches bout data.

BEGIN;

-- team2 scored 0 (shutout losses)
UPDATE public.dual_meets SET team2_score = 0 WHERE id = 'bab5beb3-268f-4554-bf0f-8d77692f28f3' AND team2_score IS NULL;
UPDATE public.dual_meets SET team2_score = 0 WHERE id = '9a25d510-74cf-48dd-9556-1c09d2e40dbc' AND team2_score IS NULL;
UPDATE public.dual_meets SET team2_score = 0 WHERE id = '3d5177f3-04b6-497c-80ec-bf04a54cd0b6' AND team2_score IS NULL;
UPDATE public.dual_meets SET team2_score = 0 WHERE id = '949be231-dd94-4025-b03c-fc2d0d0608b6' AND team2_score IS NULL;
UPDATE public.dual_meets SET team2_score = 0 WHERE id = '55fb3193-2db0-49dd-85b3-ed7d642c7212' AND team2_score IS NULL;
UPDATE public.dual_meets SET team2_score = 0 WHERE id = '81feec29-a5b6-400e-a7f7-f6cfc06d755c' AND team2_score IS NULL;

-- team1 scored 0 (shutout losses)
UPDATE public.dual_meets SET team1_score = 0 WHERE id = '8e9578b3-e96f-4182-9b8f-6d66efb7c35e' AND team1_score IS NULL;
UPDATE public.dual_meets SET team1_score = 0 WHERE id = 'db48bbb3-f831-4a8a-a8b3-8bc6f3889417' AND team1_score IS NULL;
UPDATE public.dual_meets SET team1_score = 0 WHERE id = '5f2352ec-9c45-4e87-9bde-587666fd7404' AND team1_score IS NULL;
UPDATE public.dual_meets SET team1_score = 0 WHERE id = '989ecbd2-1d98-4932-8db9-b2072e482b76' AND team1_score IS NULL;
UPDATE public.dual_meets SET team1_score = 0 WHERE id = '5372969e-e91f-41ed-a26f-aa9025f496d7' AND team1_score IS NULL;

COMMIT;
