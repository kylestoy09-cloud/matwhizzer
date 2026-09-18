-- tournament_registry.in_season_tournament_id had REFERENCES in_season_tournaments(id) ON DELETE SET NULL.
-- Phase 3 deleted girls rows from in_season_tournaments, which nulled out all girls registry links.
-- Fix: drop the FK (can't reference two tables), then re-link girls entries via name+season match.

-- 1. Drop the FK constraint so the column can reference either boys or girls table
ALTER TABLE tournament_registry
  DROP CONSTRAINT IF EXISTS tournament_registry_in_season_tournament_id_fkey;

-- 2. Re-link girls registry entries to in_season_tournaments_girls
UPDATE tournament_registry tr
SET in_season_tournament_id = ig.id
FROM in_season_tournaments_girls ig
WHERE ig.name    = tr.name
  AND ig.season  = tr.season
  AND tr.gender  IN ('F', 'both')
  AND tr.in_season_tournament_id IS NULL;
