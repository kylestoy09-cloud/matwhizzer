-- docs/migrations/20261112_tournament_hubs.sql
--
-- Tournament hubs (Kyle 2026-11-12): a Middle School hub and an Offseason hub on each side (admin only,
-- to help with rankings). Each hub lists its tournaments; each tournament has a year (event) per time it
-- runs; each event holds podiums by weight (folkstyle and freestyle tracked separately, no Greco) and,
-- for duals-style events, the bouts (so each kid's record there is known).
-- Everyone who appears on a podium or in a bout becomes a prospect: one record per kid across both hubs,
-- later linked to the high school wrestler they become. State comes from the source, the wrestler or the
-- club; the leaderboard shows NJ kids.
--
-- Boys and girls are separate programs: boys_/girls_ tables. Clubs are shared, like schools (a club is the
-- same club on either side).
--
-- Replaces the unused Aug 29–30 tables (ms_*, hs_offseason_*, nonnjsiaa_clubs — all empty). They are
-- dropped by 20261112_drop_old_ms_offseason.sql once the code that reads them is gone.
-- Seed rows (the 37 researched tournaments, the NJ club list) are in 20261112_tournament_hubs_seed.sql.
-- Admin only (service role). Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS wrestling_clubs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text        NOT NULL,
  town        text,
  state       char(2)     NOT NULL DEFAULT 'NJ',
  region      text,
  website     text,
  leadership  text,
  pipelines   text,               -- high schools the club feeds
  tournaments text,               -- notable tournaments attended
  notes       text,
  aliases     text[]      NOT NULL DEFAULT '{}',   -- other spellings seen in results ("Iron Horse", "Iron Horse WC")
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wrestling_clubs_name_idx ON wrestling_clubs (lower(name));

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_hub_tournaments (
        id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        hub           text        NOT NULL CHECK (hub IN ('ms', 'offseason')),
        name          text        NOT NULL,
        location      text,
        time_of_year  text,
        in_state      text,
        format        text,       -- "Folkstyle Individual", "Folkstyle Duals", "Freestyle & Greco Individual", ...
        platform      text,
        notes         text,
        sort_order    integer     NOT NULL DEFAULT 0,
        is_active     boolean     NOT NULL DEFAULT true,
        created_at    timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS %1$s_hub_tournaments_name_idx ON %1$s_hub_tournaments (hub, lower(name));

      -- One row per time the tournament runs. season = the season it belongs to, keyed by end year
      -- (2026 = 2025-26). label separates two runs in one season (Tyrant "Fall" / "Spring").
      CREATE TABLE IF NOT EXISTS %1$s_hub_events (
        id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        tournament_id  bigint      NOT NULL REFERENCES %1$s_hub_tournaments(id) ON DELETE CASCADE,
        season         integer     NOT NULL CHECK (season BETWEEN 2000 AND 2100),
        label          text,
        start_date     date,
        end_date       date,
        notes          text,
        created_at     timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS %1$s_hub_events_uniq ON %1$s_hub_events (tournament_id, season, coalesce(label, ''));

      -- One record per kid. wrestler_id is set once they are known as a high school wrestler.
      CREATE TABLE IF NOT EXISTS %1$s_prospects (
        id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        first_name   text        NOT NULL,
        last_name    text        NOT NULL,
        state        char(2),
        club_id      bigint      REFERENCES wrestling_clubs(id) ON DELETE SET NULL,
        class_year   integer,    -- high school graduation year, when known
        wrestler_id  uuid        REFERENCES wrestlers(id) ON DELETE SET NULL,
        notes        text,
        created_at   timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS %1$s_prospects_name_idx ON %1$s_prospects (lower(last_name), lower(first_name));
      CREATE INDEX IF NOT EXISTS %1$s_prospects_wrestler_idx ON %1$s_prospects (wrestler_id);

      -- Podium finishes. name/club are kept as listed (admin only, for audit); prospect_id is who it is.
      CREATE TABLE IF NOT EXISTS %1$s_hub_placements (
        id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        event_id     bigint      NOT NULL REFERENCES %1$s_hub_events(id) ON DELETE CASCADE,
        style        text        NOT NULL DEFAULT 'folkstyle' CHECK (style IN ('folkstyle', 'freestyle')),
        division     text,
        weight       text        NOT NULL,
        place        integer     NOT NULL CHECK (place >= 1),
        name_listed  text        NOT NULL,
        club_listed  text,
        club_id      bigint      REFERENCES wrestling_clubs(id) ON DELETE SET NULL,
        prospect_id  bigint      NOT NULL REFERENCES %1$s_prospects(id),
        created_at   timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS %1$s_hub_placements_uniq ON %1$s_hub_placements (event_id, style, coalesce(division, ''), weight, place);
      CREATE INDEX IF NOT EXISTS %1$s_hub_placements_prospect_idx ON %1$s_hub_placements (prospect_id);

      -- Bouts at duals-style events (and match series like WNO): each kid's record at the event.
      CREATE TABLE IF NOT EXISTS %1$s_hub_bouts (
        id                  bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        event_id            bigint      NOT NULL REFERENCES %1$s_hub_events(id) ON DELETE CASCADE,
        style               text        NOT NULL DEFAULT 'folkstyle' CHECK (style IN ('folkstyle', 'freestyle')),
        division            text,
        weight              text        NOT NULL,
        bout_date           date,
        round               text,
        winner_listed       text        NOT NULL,
        winner_club_listed  text,
        winner_prospect_id  bigint      NOT NULL REFERENCES %1$s_prospects(id),
        loser_listed        text        NOT NULL,
        loser_club_listed   text,
        loser_prospect_id   bigint      NOT NULL REFERENCES %1$s_prospects(id),
        win_type            text,       -- Dec, MD, TF, Fall, FF, ...
        score               text,
        created_at          timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS %1$s_hub_bouts_event_idx ON %1$s_hub_bouts (event_id);
      CREATE INDEX IF NOT EXISTS %1$s_hub_bouts_winner_idx ON %1$s_hub_bouts (winner_prospect_id);
      CREATE INDEX IF NOT EXISTS %1$s_hub_bouts_loser_idx ON %1$s_hub_bouts (loser_prospect_id);

      ALTER TABLE %1$s_hub_tournaments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE %1$s_hub_events      ENABLE ROW LEVEL SECURITY;
      ALTER TABLE %1$s_prospects       ENABLE ROW LEVEL SECURITY;
      ALTER TABLE %1$s_hub_placements  ENABLE ROW LEVEL SECURITY;
      ALTER TABLE %1$s_hub_bouts       ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_hub_tournaments, %1$s_hub_events, %1$s_prospects, %1$s_hub_placements, %1$s_hub_bouts TO service_role;
    $f$, g);
  END LOOP;
END $$;

ALTER TABLE wrestling_clubs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON wrestling_clubs TO service_role;

COMMIT;

-- Verify: 11 tables, all empty
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('wrestling_clubs',
    'boys_hub_tournaments', 'boys_hub_events', 'boys_prospects', 'boys_hub_placements', 'boys_hub_bouts',
    'girls_hub_tournaments', 'girls_hub_events', 'girls_prospects', 'girls_hub_placements', 'girls_hub_bouts')
ORDER BY table_name;

-- ROLLBACK:
-- DROP TABLE boys_hub_bouts, boys_hub_placements, boys_prospects, boys_hub_events, boys_hub_tournaments,
--            girls_hub_bouts, girls_hub_placements, girls_prospects, girls_hub_events, girls_hub_tournaments,
--            wrestling_clubs;
