-- docs/migrations/20261116_tournament_prior_edition.sql
--
-- Tournament slate (Kyle 2026-11-16): the schedule paste in the Tournament Registry matches each event to the
-- tournament already in our system and creates the rest; the Tournament Hub then marks each of this season's
-- tournaments Active (back from last season), New, or — for last season's tournaments — Not set up yet.
-- prior_id links a season's edition of a tournament to the previous season's edition (null = new that season).
-- Written by /api/admin/tournament-registry, /api/admin/tournament-hub and /api/admin/tournament-rollover
-- (service role). 2025-26 is the first season on file, so nothing to backfill. Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE in_season_tournaments       ADD COLUMN IF NOT EXISTS prior_id uuid REFERENCES in_season_tournaments(id)       ON DELETE SET NULL;
ALTER TABLE in_season_tournaments_girls ADD COLUMN IF NOT EXISTS prior_id uuid REFERENCES in_season_tournaments_girls(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS in_season_tournaments_prior_idx       ON in_season_tournaments (prior_id);
CREATE INDEX IF NOT EXISTS in_season_tournaments_girls_prior_idx ON in_season_tournaments_girls (prior_id);

COMMIT;

-- Verify: both columns exist and are empty
SELECT (SELECT count(prior_id) FROM in_season_tournaments) AS boys_linked,
       (SELECT count(prior_id) FROM in_season_tournaments_girls) AS girls_linked;

-- ROLLBACK: ALTER TABLE in_season_tournaments DROP COLUMN prior_id; ALTER TABLE in_season_tournaments_girls DROP COLUMN prior_id;
