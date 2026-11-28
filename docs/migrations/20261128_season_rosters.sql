-- docs/migrations/20261128_season_rosters.sql
--
-- Preseason step 3, the Roster Import (Kyle 2026-11-28): this season's TrackWrestling rosters, checked against what
-- last season's rollover expects at each school. "the roster import will need to confirm the updated roster matches
-- last years roll over. then we will only include the wrestlers who had varsity matches last year in this season's
-- roster on the school profile pages. everyone else will be stored until they wrestle a varsity match."
--
--   {side}_season_rosters: one row per wrestler per school per season, as Track lists them
--     wrestler_id    our wrestler (matched), or null
--     pool_id        the stored Track roster player (roster_grade_import) when not one of our wrestlers
--     match          wrestler | pool | new (not on file before: a freshman, a transfer in, a misspelling)
--     expected_grade what the rollover gave us; grade is Track's
--     varsity_last   the wrestler had a varsity bout last season → shown on the school page's preseason roster
--     last_weight    their most common varsity weight last season (the roster shows Track's weight, else this)
--     status         confirmed (auto: exact name, same grade; or Kyle) | review (Kyle settles it)
--     review_reason  why it's in review
--     last_seen      the newest load of this school that listed the wrestler (a later round that drops them leaves it)
--   {side}_roster_loads: each school's loads (round, count, the rollover's expected wrestlers Track didn't list)
-- One table per side. Service role only (the school page reads through the server). Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_season_rosters (
        id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        season_id      integer     NOT NULL REFERENCES seasons(id),
        school_id      integer     NOT NULL REFERENCES schools(id),
        name           text        NOT NULL,          -- as Track lists it
        weight         integer,
        grade          text,                          -- Track's: Fr | So | Jr | Sr
        track_gender   text,
        eligible       text,
        record         text,
        wrestler_id    uuid        REFERENCES wrestlers(id),
        pool_id        uuid        REFERENCES roster_grade_import(id),
        match          text        NOT NULL CHECK (match IN ('wrestler', 'pool', 'new')),
        expected_grade text,
        varsity_last   boolean     NOT NULL DEFAULT false,
        last_weight    integer,                       -- last season's most common varsity weight (shown when Track has none)
        status         text        NOT NULL DEFAULT 'review' CHECK (status IN ('confirmed', 'review')),
        review_reason  text,
        suggestions    jsonb       NOT NULL DEFAULT '[]',
        round          integer     NOT NULL DEFAULT 1,
        first_seen     timestamptz NOT NULL DEFAULT now(),
        last_seen      timestamptz NOT NULL DEFAULT now(),
        reviewed_at    timestamptz,
        reviewed_by    text,
        UNIQUE (season_id, school_id, name)
      );
      CREATE INDEX IF NOT EXISTS %1$s_season_rosters_wrestler ON %1$s_season_rosters (wrestler_id);
      ALTER TABLE %1$s_season_rosters ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_season_rosters TO service_role;

      CREATE TABLE IF NOT EXISTS %1$s_roster_loads (
        id          bigserial   PRIMARY KEY,
        season_id   integer     NOT NULL REFERENCES seasons(id),
        school_id   integer     NOT NULL REFERENCES schools(id),
        track_team  text        NOT NULL,
        round       integer     NOT NULL,
        listed      integer     NOT NULL,
        missing     jsonb       NOT NULL DEFAULT '[]',   -- expected by the rollover, not on Track's list
        loaded_at   timestamptz NOT NULL DEFAULT now(),
        loaded_by   text
      );
      CREATE INDEX IF NOT EXISTS %1$s_roster_loads_school ON %1$s_roster_loads (season_id, school_id);
      ALTER TABLE %1$s_roster_loads ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_roster_loads TO service_role;
      GRANT USAGE ON SEQUENCE %1$s_roster_loads_id_seq TO service_role;
    $f$, g);
  END LOOP;
END $$;

COMMIT;

-- Verify: four tables, empty
SELECT (SELECT count(*) FROM boys_season_rosters) AS boys_rosters, (SELECT count(*) FROM girls_season_rosters) AS girls_rosters,
       (SELECT count(*) FROM boys_roster_loads) AS boys_loads, (SELECT count(*) FROM girls_roster_loads) AS girls_loads;

-- ROLLBACK: DROP TABLE boys_season_rosters, girls_season_rosters, boys_roster_loads, girls_roster_loads;
