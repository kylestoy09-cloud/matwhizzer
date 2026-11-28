-- docs/migrations/20261128_track_teams_review.sql
--
-- Preseason step 1, the School Data Review (Kyle 2026-11-28): TrackWrestling's season "Teams" page — season team,
-- global team, abbreviation, governing body, leagues — read per program and season, each team matched to our school
-- and its district / region confirmed against ours. One row per Track team per season, kept so later rounds of the
-- roster and schedule imports know Track's team list (and new schools show up as new rows).
--   status: pending (not reviewed) | confirmed (matched, district/region settled) | skipped (a test team or not one
--           of ours) | added (created as a new school from this row)
-- One table per side, like the coaches. Admin only (service role). Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_track_teams (
        season_id    integer     NOT NULL REFERENCES seasons(id),
        season_name  text        NOT NULL,          -- Track's season team, without ", NJ"
        global_name  text        NOT NULL,          -- Track's global team, without ", NJ"
        state        text        NOT NULL DEFAULT '',
        abbr         text,
        gov_body     text,
        leagues      text[]      NOT NULL DEFAULT '{}',
        school_id    integer     REFERENCES schools(id),
        status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'skipped', 'added')),
        note         text,
        reviewed_at  timestamptz,
        reviewed_by  text,
        first_seen   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (season_id, season_name, global_name)
      );
      ALTER TABLE %1$s_track_teams ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_track_teams TO service_role;
    $f$, g);
  END LOOP;
END $$;

COMMIT;

-- Verify: both tables exist and are empty
SELECT (SELECT count(*) FROM boys_track_teams) AS boys_rows,
       (SELECT count(*) FROM girls_track_teams) AS girls_rows;

-- ROLLBACK: DROP TABLE boys_track_teams, girls_track_teams;
