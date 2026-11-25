-- docs/migrations/20261112_school_season_details.sql
--
-- Past seasons keep their own school directory (Kyle 2026-11-12): "lock in the current data for 2025-26's
-- data and then i will update the 2026-27 data". Address, website, Twitter, Facebook, AD, AD email (on
-- schools) and section / group ({g}_school_profiles) have one value per school, so editing them for
-- 2026-27 overwrote 2025-26. These tables hold a past season's values per program; the live columns stay
-- the current season's. Coaches, conferences, districts, regions, inactive marks and streaming links are
-- already kept per season. One table per side, like the coaches.
-- The 2025-26 rows are filled by scripts/lock_2025_26_directory_20261112.mts (today's values, which Kyle
-- then corrects on the Past Seasons page). Admin only (service role). Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_school_season_details (
        school_id       integer     NOT NULL REFERENCES schools(id),
        season_id       integer     NOT NULL REFERENCES seasons(id),
        address         text,
        website_url     text,
        twitter_handle  text,
        facebook_url    text,
        ad_name         text,
        ad_email        text,
        section         text,
        classification  text,
        updated_at      timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (school_id, season_id)
      );
      ALTER TABLE %1$s_school_season_details ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_school_season_details TO service_role;
    $f$, g);
  END LOOP;
END $$;

COMMIT;

-- Verify: both tables exist and are empty
SELECT (SELECT count(*) FROM boys_school_season_details) AS boys_rows,
       (SELECT count(*) FROM girls_school_season_details) AS girls_rows;

-- ROLLBACK: DROP TABLE boys_school_season_details, girls_school_season_details;
