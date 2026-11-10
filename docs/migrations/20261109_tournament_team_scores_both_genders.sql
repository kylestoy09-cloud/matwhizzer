-- docs/migrations/20261109_tournament_team_scores_both_genders.sql
--
-- in_season_tournament_team_scores holds tournament team standings for both genders (every reader and the RTF
-- import use it for boys and girls alike), but its tournament_id had a foreign key to the boys table only
-- (in_season_tournaments, 20260802_tournament_venues_and_scores.sql). Girls tournaments live in
-- in_season_tournaments_girls, so every girls standings insert was refused: none of the 41 girls 2025-26
-- tournaments has a team score, and the Tournaments page's Winner column is empty for girls.
-- Boys and girls tournament ids are uuids and never collide.
--   1. drop the boys-only foreign key
--   2. a trigger: a row's tournament must exist in the boys or the girls table (the check the key made)
--   3. delete triggers on both tournament tables: deleting a tournament removes its team scores
--      (the key's ON DELETE CASCADE, now for girls too)
-- No data changes. ROLLBACK: drop the triggers and functions below, then
--   ALTER TABLE in_season_tournament_team_scores ADD CONSTRAINT in_season_tournament_team_scores_tournament_id_fkey
--     FOREIGN KEY (tournament_id) REFERENCES in_season_tournaments(id) ON DELETE CASCADE;   (only if no girls rows exist)
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE public.in_season_tournament_team_scores DROP CONSTRAINT IF EXISTS in_season_tournament_team_scores_tournament_id_fkey;

CREATE OR REPLACE FUNCTION public.ists_tournament_exists() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM in_season_tournaments WHERE id = NEW.tournament_id)
     AND NOT EXISTS (SELECT 1 FROM in_season_tournaments_girls WHERE id = NEW.tournament_id) THEN
    RAISE EXCEPTION 'in_season_tournament_team_scores: tournament % is not a boys or girls in-season tournament', NEW.tournament_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ists_tournament_exists ON public.in_season_tournament_team_scores;
CREATE TRIGGER ists_tournament_exists BEFORE INSERT OR UPDATE OF tournament_id ON public.in_season_tournament_team_scores
  FOR EACH ROW EXECUTE FUNCTION public.ists_tournament_exists();

CREATE OR REPLACE FUNCTION public.ists_delete_with_tournament() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
  DELETE FROM in_season_tournament_team_scores WHERE tournament_id = OLD.id;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS ists_delete_with_tournament ON public.in_season_tournaments;
CREATE TRIGGER ists_delete_with_tournament AFTER DELETE ON public.in_season_tournaments
  FOR EACH ROW EXECUTE FUNCTION public.ists_delete_with_tournament();
DROP TRIGGER IF EXISTS ists_delete_with_tournament ON public.in_season_tournaments_girls;
CREATE TRIGGER ists_delete_with_tournament AFTER DELETE ON public.in_season_tournaments_girls
  FOR EACH ROW EXECUTE FUNCTION public.ists_delete_with_tournament();

COMMIT;

-- Verify: the key is gone and the three triggers exist
SELECT 'fkey' AS what, count(*)::text AS value FROM pg_constraint WHERE conname = 'in_season_tournament_team_scores_tournament_id_fkey'
UNION ALL SELECT 'triggers', string_agg(tgname || ' on ' || tgrelid::regclass::text, ', ')
FROM pg_trigger WHERE tgname IN ('ists_tournament_exists', 'ists_delete_with_tournament');
