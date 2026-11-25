-- docs/migrations/20261113_playoff_history.sql
--
-- Playoff History (Kyle 2026-11-13): past boys postseasons (2013-2020 now, 2021-2024 next) rebuilt from TrackWrestling
-- bout exports so the district, region and state pages can go back to 2013. Boys only (girls already have theirs).
--   * seasons 2012-13 … 2019-20 (keyed by championship year, like every season)
--   * a 'history' stage: postseason pages only, hidden until Kyle switches the season on in the boys
--     Playoff History Review tool (history_public); other pages never offer these seasons
--   * team scores for these seasons are CALCULATED with the site's formula (Kyle: "let's calculate and use our numbers
--     for these years"), marked source = 'calculated' so a copied official sheet can replace them later
--   * staging: each season's parsed brackets, the school-name decisions, and the same-wrestler joins, read by the tool
-- Nothing on the site changes until a season is loaded and switched on.
-- Run in the Supabase SQL editor.

BEGIN;

-- 1. seasons + the history stage
INSERT INTO seasons (id, label, year_label, start_year, end_year)
SELECT y, (y - 1) || '-' || right(y::text, 2), (y - 1) || '-' || right(y::text, 2), y - 1, y
FROM generate_series(2013, 2020) y
ON CONFLICT (id) DO NOTHING;

ALTER TABLE season_gender_state DROP CONSTRAINT IF EXISTS season_gender_state_stage_check;
ALTER TABLE season_gender_state ADD CONSTRAINT season_gender_state_stage_check
  CHECK (stage IN ('preseason', 'season', 'postseason', 'archived', 'history'));
ALTER TABLE season_gender_state ADD COLUMN IF NOT EXISTS history_public boolean NOT NULL DEFAULT false;

INSERT INTO season_gender_state (season_id, gender, stage, is_public_default, history_public)
SELECT y, 'M', 'history', false, false FROM generate_series(2013, 2020) y
WHERE NOT EXISTS (SELECT 1 FROM season_gender_state s WHERE s.season_id = y AND s.gender = 'M');

-- 2. team scores: official (copied) or calculated
ALTER TABLE precomputed_team_scores ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'official';
ALTER TABLE precomputed_team_scores DROP CONSTRAINT IF EXISTS precomputed_team_scores_source_check;
ALTER TABLE precomputed_team_scores ADD CONSTRAINT precomputed_team_scores_source_check CHECK (source IN ('official', 'calculated'));

-- 3. staging, read by the Playoff History Review tool
CREATE TABLE IF NOT EXISTS playoff_history_seasons (
  season_id   integer     NOT NULL REFERENCES seasons(id),
  gender      char(1)     NOT NULL DEFAULT 'M' CHECK (gender IN ('M', 'F')),
  status      text        NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'loaded')),
  summary     jsonb       NOT NULL DEFAULT '{}'::jsonb,   -- files, events, bout counts, checks vs NJ Wrestling History
  problems    jsonb       NOT NULL DEFAULT '[]'::jsonb,   -- export gaps etc., one string each
  staged_at   timestamptz NOT NULL DEFAULT now(),
  loaded_at   timestamptz,
  loaded_by   text,
  PRIMARY KEY (season_id, gender)
);

CREATE TABLE IF NOT EXISTS playoff_history_bouts (
  id            bigserial   PRIMARY KEY,
  season_id     integer     NOT NULL,
  gender        char(1)     NOT NULL DEFAULT 'M',
  kind          text        NOT NULL CHECK (kind IN ('district', 'region', 'state')),
  num           integer,                                  -- district / region number; null for state
  weight        integer     NOT NULL,
  round         text        NOT NULL,                     -- the site's round code (R1 … 7th_Place)
  side          text        NOT NULL CHECK (side IN ('championship', 'consolation')),
  bout_order    integer     NOT NULL,                     -- order wrestled within the bracket
  winner        text        NOT NULL,
  winner_team   text        NOT NULL,
  loser         text,
  loser_team    text,
  win_type      text        NOT NULL,
  winner_score  integer,
  loser_score   integer,
  fall_seconds  integer,
  result_raw    text,
  round_label   text                                      -- as the export labels it
);
CREATE INDEX IF NOT EXISTS playoff_history_bouts_season ON playoff_history_bouts (season_id, gender, kind, num, weight);

CREATE TABLE IF NOT EXISTS playoff_history_entrants (
  id          bigserial PRIMARY KEY,
  season_id   integer   NOT NULL,
  gender      char(1)   NOT NULL DEFAULT 'M',
  kind        text      NOT NULL,
  num         integer,
  weight      integer   NOT NULL,
  name        text      NOT NULL,
  team        text      NOT NULL,
  seed        integer,                                    -- state: from the FloWrestling bracket
  place       integer,
  wrestler_id uuid      REFERENCES wrestlers(id)          -- set when the season loads
);
CREATE INDEX IF NOT EXISTS playoff_history_entrants_season ON playoff_history_entrants (season_id, gender, kind, num, weight);

-- a team name as the exports print it → one of our schools (or an empty slot)
CREATE TABLE IF NOT EXISTS playoff_history_schools (
  raw_name     text        PRIMARY KEY,
  school_id    integer     REFERENCES schools(id),
  decision     text        NOT NULL CHECK (decision IN ('auto', 'kyle', 'placeholder', 'pending')),
  coop_name    text,                                      -- the co-op's name that season, shown on its pages
  seasons      integer[]   NOT NULL DEFAULT '{}',
  suggestion   integer     REFERENCES schools(id),
  note         text,
  decided_by   text,
  decided_at   timestamptz
);

-- same wrestler in different seasons: automatic (same name + school, back-to-back) or Kyle's call
CREATE TABLE IF NOT EXISTS playoff_history_joins (
  id          bigserial   PRIMARY KEY,
  gender      char(1)     NOT NULL DEFAULT 'M',
  a_season    integer     NOT NULL, a_name text NOT NULL, a_team text NOT NULL,
  b_season    integer     NOT NULL, b_name text NOT NULL, b_team text NOT NULL,
  reason      text        NOT NULL,                       -- 'same name, other school' / 'nickname' / 'spelling'
  decision    text        NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'same', 'different')),
  decided_by  text,
  decided_at  timestamptz,
  UNIQUE (gender, a_season, a_name, a_team, b_season, b_name, b_team)
);

ALTER TABLE playoff_history_seasons  ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_history_bouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_history_entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_history_schools  ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_history_joins    ENABLE ROW LEVEL SECURITY;
GRANT ALL ON playoff_history_seasons, playoff_history_bouts, playoff_history_entrants, playoff_history_schools, playoff_history_joins TO service_role;
GRANT USAGE, SELECT ON SEQUENCE playoff_history_bouts_id_seq, playoff_history_entrants_id_seq, playoff_history_joins_id_seq TO service_role;

COMMIT;

-- Verify
SELECT s.id, s.year_label, g.stage, g.history_public FROM seasons s JOIN season_gender_state g ON g.season_id = s.id AND g.gender = 'M'
WHERE s.id BETWEEN 2013 AND 2020 ORDER BY s.id;
-- expect 8 rows, 2012-13 … 2019-20, stage history, history_public false

-- ROLLBACK (before any season is loaded):
--   DROP TABLE playoff_history_joins, playoff_history_schools, playoff_history_entrants, playoff_history_bouts, playoff_history_seasons;
--   ALTER TABLE precomputed_team_scores DROP COLUMN source;
--   DELETE FROM season_gender_state WHERE stage = 'history'; ALTER TABLE season_gender_state DROP COLUMN history_public;
--   (restore the stage check without 'history'); DELETE FROM seasons WHERE id BETWEEN 2013 AND 2020;
