-- docs/migrations/20261112_ms_hub_mixed.sql
--
-- The Middle School Hub is one mixed pool (Kyle 2026-11-12): middle school and youth divisions (Super 32
-- Middle School, 11U, 8U) mix boys and girls and the results don't say which kids are girls, so the
-- Middle School Hub's tournaments, results and prospects live in mixed_ tables that both admin sides
-- show. A mixed prospect can later be linked to a boys or girls high school wrestler. The Offseason Hub
-- stays per side (high school divisions are split by gender).
-- Moves the 17 seeded middle school tournaments (boys list, which includes the boys-only National
-- Freestyle Duals division) into mixed_hub_tournaments and removes them from boys_/girls_ (no events yet;
-- refuses otherwise). Run in the Supabase SQL editor.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM boys_hub_events e JOIN boys_hub_tournaments t ON t.id = e.tournament_id WHERE t.hub = 'ms')
     OR EXISTS (SELECT 1 FROM girls_hub_events e JOIN girls_hub_tournaments t ON t.id = e.tournament_id WHERE t.hub = 'ms') THEN
    RAISE EXCEPTION 'middle school events already entered on a side; stop and check';
  END IF;
END $$;

CREATE TABLE mixed_hub_tournaments (LIKE boys_hub_tournaments INCLUDING ALL);
CREATE TABLE mixed_hub_events (
  id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id  bigint      NOT NULL REFERENCES mixed_hub_tournaments(id) ON DELETE CASCADE,
  season         integer     NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  label          text,
  start_date     date,
  end_date       date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mixed_hub_events_uniq ON mixed_hub_events (tournament_id, season, coalesce(label, ''));

CREATE TABLE mixed_prospects (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name   text        NOT NULL,
  last_name    text        NOT NULL,
  state        char(2),
  club_id      bigint      REFERENCES wrestling_clubs(id) ON DELETE SET NULL,
  class_year   integer,
  wrestler_id  uuid        REFERENCES wrestlers(id) ON DELETE SET NULL,   -- a boys or girls HS wrestler
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mixed_prospects_name_idx ON mixed_prospects (lower(last_name), lower(first_name));
CREATE INDEX mixed_prospects_wrestler_idx ON mixed_prospects (wrestler_id);

CREATE TABLE mixed_hub_placements (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id     bigint      NOT NULL REFERENCES mixed_hub_events(id) ON DELETE CASCADE,
  style        text        NOT NULL DEFAULT 'folkstyle' CHECK (style IN ('folkstyle', 'freestyle')),
  division     text,
  weight       text        NOT NULL,
  place        integer     NOT NULL CHECK (place >= 1),
  name_listed  text        NOT NULL,
  club_listed  text,
  club_id      bigint      REFERENCES wrestling_clubs(id) ON DELETE SET NULL,
  prospect_id  bigint      NOT NULL REFERENCES mixed_prospects(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mixed_hub_placements_uniq ON mixed_hub_placements (event_id, style, coalesce(division, ''), weight, place);
CREATE INDEX mixed_hub_placements_prospect_idx ON mixed_hub_placements (prospect_id);

CREATE TABLE mixed_hub_bouts (
  id                  bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id            bigint      NOT NULL REFERENCES mixed_hub_events(id) ON DELETE CASCADE,
  style               text        NOT NULL DEFAULT 'folkstyle' CHECK (style IN ('folkstyle', 'freestyle')),
  division            text,
  weight              text        NOT NULL,
  bout_date           date,
  round               text,
  winner_listed       text        NOT NULL,
  winner_club_listed  text,
  winner_prospect_id  bigint      NOT NULL REFERENCES mixed_prospects(id),
  loser_listed        text        NOT NULL,
  loser_club_listed   text,
  loser_prospect_id   bigint      NOT NULL REFERENCES mixed_prospects(id),
  win_type            text,
  score               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mixed_hub_bouts_event_idx ON mixed_hub_bouts (event_id);
CREATE INDEX mixed_hub_bouts_winner_idx ON mixed_hub_bouts (winner_prospect_id);
CREATE INDEX mixed_hub_bouts_loser_idx ON mixed_hub_bouts (loser_prospect_id);

INSERT INTO mixed_hub_tournaments (hub, name, location, time_of_year, in_state, format, platform, notes, sort_order, is_active)
SELECT hub, name, location, time_of_year, in_state, format, platform, notes, sort_order, is_active FROM boys_hub_tournaments WHERE hub = 'ms';
DELETE FROM boys_hub_tournaments WHERE hub = 'ms';
DELETE FROM girls_hub_tournaments WHERE hub = 'ms';

ALTER TABLE mixed_hub_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixed_hub_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixed_prospects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixed_hub_placements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixed_hub_bouts       ENABLE ROW LEVEL SECURITY;
GRANT ALL ON mixed_hub_tournaments, mixed_hub_events, mixed_prospects, mixed_hub_placements, mixed_hub_bouts TO service_role;

COMMIT;

-- Verify: 17 middle school tournaments in the mixed pool, none left on a side
SELECT (SELECT count(*) FROM mixed_hub_tournaments) AS mixed_ms,
       (SELECT count(*) FROM boys_hub_tournaments WHERE hub = 'ms') AS boys_ms,
       (SELECT count(*) FROM girls_hub_tournaments WHERE hub = 'ms') AS girls_ms;

-- ROLLBACK: copy mixed_hub_tournaments back into boys_/girls_hub_tournaments, then
--           DROP TABLE mixed_hub_bouts, mixed_hub_placements, mixed_prospects, mixed_hub_events, mixed_hub_tournaments;
