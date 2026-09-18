-- Add podium_depth column to in_season_tournaments.
-- Controls how many places show in the "NJSIAA on the Podium" section for OOS tournaments.
-- Defaults to 3; set to 8 for elite/national-prestige events.

ALTER TABLE in_season_tournaments
  ADD COLUMN IF NOT EXISTS podium_depth SMALLINT NOT NULL DEFAULT 3;

UPDATE in_season_tournaments
SET podium_depth = 8
WHERE name ILIKE '%beast of the east%'
   OR name ILIKE '%powerade%'
   OR name ILIKE '%iron%man%'
   OR name ILIKE '%sam cali%'
   OR name ILIKE '%doc buchanan%'
   OR name ILIKE '%escape the rock%'
   OR name ILIKE '%elite%';
