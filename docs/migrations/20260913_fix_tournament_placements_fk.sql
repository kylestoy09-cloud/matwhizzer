-- tournament_placements.in_season_tournament_id had REFERENCES in_season_tournaments(id) ON DELETE CASCADE.
-- When Phase 3 of the gender-table split deleted girls rows from in_season_tournaments,
-- it cascade-deleted all girls placements. Re-importing girls placements now fails silently
-- because the FK rejects UUIDs that exist only in in_season_tournaments_girls.
-- Fix: drop the FK so the column can hold IDs from either boys or girls tournament table.
-- Referential integrity is maintained by application logic (same pattern as tournament_registry).

ALTER TABLE public.tournament_placements
  DROP CONSTRAINT IF EXISTS tournament_placements_in_season_tournament_id_fkey;
