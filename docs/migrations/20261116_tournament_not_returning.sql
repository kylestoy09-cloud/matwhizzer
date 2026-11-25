-- docs/migrations/20261116_tournament_not_returning.sql
--
-- Tournament Rollover % (Kyle 2026-11-16): the share of last season's tournaments dealt with for the new season —
-- rolled over (an edition this season points back with prior_id) or marked not returning in the Tournament Hub.
-- not_returning_at on a season's tournament = it has no edition the next season (null = not marked).
-- Written by /api/admin/tournament-hub (service role). Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE in_season_tournaments       ADD COLUMN IF NOT EXISTS not_returning_at timestamptz;
ALTER TABLE in_season_tournaments_girls ADD COLUMN IF NOT EXISTS not_returning_at timestamptz;

COMMIT;

-- Verify: both columns exist and nothing is marked yet
SELECT (SELECT count(not_returning_at) FROM in_season_tournaments) AS boys_marked,
       (SELECT count(not_returning_at) FROM in_season_tournaments_girls) AS girls_marked;

-- ROLLBACK: ALTER TABLE in_season_tournaments DROP COLUMN not_returning_at; ALTER TABLE in_season_tournaments_girls DROP COLUMN not_returning_at;
