-- docs/migrations/20261112_daily_challenge_polls_history.sql
--
-- Daily Challenge and Polls (Kyle 2026-11-12), under Articles in the admin. Admin only for now — no
-- grants beyond the service role; the site front end comes later.
-- 1. NJ boys wrestling history (scraped 2026-11-02 from njwrestlinghistory.info, data/njwh/): every state
--    placer and champion and every region champion, plus group and sectional team titles. The research
--    source for daily challenge questions. Loaded by scripts/load_history_20261112.mts.
-- 2. Daily challenge questions: one per date per side, kept as the archive once the date passes.
-- 3. Polls: a question with four answers, per side, kept as the archive.
-- Run in the Supabase SQL editor.

BEGIN;

-- One row per finish. level 'state' (place 1–8; tie = old shared places like "3rd/4th") or 'region'
-- (region 1–8, champions only). Weight is as listed ('157', 'Hwt'). Names and schools as listed.
CREATE TABLE IF NOT EXISTS history_finishes (
  id          bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level       text    NOT NULL CHECK (level IN ('state', 'region')),
  year        integer NOT NULL,
  region      integer CHECK (region BETWEEN 1 AND 8),
  weight      text    NOT NULL,
  place       integer NOT NULL CHECK (place BETWEEN 1 AND 8),
  tie         text,
  name        text    NOT NULL,
  school      text,
  note        text,             -- e.g. 2021 Super Region
  source      text    NOT NULL DEFAULT 'njwh'
);
CREATE INDEX IF NOT EXISTS history_finishes_lookup_idx ON history_finishes (level, year, weight);
CREATE INDEX IF NOT EXISTS history_finishes_school_idx ON history_finishes (school);

-- Team titles: kind 'group' (state group champion and runner-up) or 'sectional'
CREATE TABLE IF NOT EXISTS history_team_titles (
  id          bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind        text    NOT NULL CHECK (kind IN ('group', 'sectional')),
  year        integer NOT NULL,
  grp         text    NOT NULL,     -- 'Group 5', 'Non-Public B'
  section     text,                 -- sectional only: 'North 1', 'South', ...
  champion    text    NOT NULL,
  runner_up   text,
  source      text    NOT NULL DEFAULT 'njwh'
);

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_daily_challenges (
        id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        challenge_date  date        NOT NULL UNIQUE,
        question        text        NOT NULL,
        answer          text        NOT NULL,
        notes           text,       -- how it was worked out / source
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS %1$s_polls (
        id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        question    text        NOT NULL,
        answer_1    text        NOT NULL,
        answer_2    text        NOT NULL,
        answer_3    text        NOT NULL,
        answer_4    text        NOT NULL,
        poll_date   date,       -- when it runs
        archived    boolean     NOT NULL DEFAULT false,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE %1$s_daily_challenges ENABLE ROW LEVEL SECURITY;
      ALTER TABLE %1$s_polls ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_daily_challenges, %1$s_polls TO service_role;
    $f$, g);
  END LOOP;
END $$;

ALTER TABLE history_finishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_team_titles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON history_finishes, history_team_titles TO service_role;

COMMIT;

-- Verify: six tables, all empty
SELECT (SELECT count(*) FROM history_finishes) AS finishes, (SELECT count(*) FROM history_team_titles) AS team_titles,
       (SELECT count(*) FROM boys_daily_challenges) AS boys_q, (SELECT count(*) FROM girls_daily_challenges) AS girls_q,
       (SELECT count(*) FROM boys_polls) AS boys_polls, (SELECT count(*) FROM girls_polls) AS girls_polls;

-- ROLLBACK: DROP TABLE history_finishes, history_team_titles, boys_daily_challenges, girls_daily_challenges, boys_polls, girls_polls;
