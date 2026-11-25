-- docs/migrations/20261112_daily_challenge_game.sql
--
-- The Daily Challenge game and polls (Kyle 2026-11-12). One contest across boys and girls trivia: one
-- question per date, shown 12:00 AM – 11:59 PM Eastern; signed-in fans click "Today's Challenge", the
-- server starts their clock, they have 30 seconds (per question, adjustable) and one attempt; the correct
-- answer shows once they answer. Weekly (Monday–Sunday Eastern) standings: most correct, then least total
-- time on correct answers (an exact tie goes to whoever finished first). Two winners a week: the top
-- player and one random player who answered at least once; they're emailed and asked for a shirt size and
-- mailing address. Polls: a question with four answers; signed-in fans vote once and then see percentages.
-- sandbox = test rows for the admin sandbox page: kept apart from the real game and never emailed.
--
-- Replaces the per-side boys_/girls_daily_challenges and boys_/girls_polls created earlier today (empty:
-- Kyle chose one contest for both). All access goes through the server (service role); no public grants.
-- Run in the Supabase SQL editor.

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM boys_daily_challenges) + (SELECT count(*) FROM girls_daily_challenges)
     + (SELECT count(*) FROM boys_polls) + (SELECT count(*) FROM girls_polls) > 0 THEN
    RAISE EXCEPTION 'the per-side question/poll tables have rows; stop and check';
  END IF;
END $$;
DROP TABLE boys_daily_challenges, girls_daily_challenges, boys_polls, girls_polls;

CREATE TABLE daily_challenges (
  id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sandbox         boolean     NOT NULL DEFAULT false,
  challenge_date  date        NOT NULL,
  topic           text        NOT NULL DEFAULT 'boys' CHECK (topic IN ('boys', 'girls', 'general')),
  kind            text        NOT NULL DEFAULT 'choice' CHECK (kind IN ('choice', 'rank')),
  question        text        NOT NULL,
  options         text[]      NOT NULL CHECK (array_length(options, 1) = 4),
  -- choice: [index of the right option]; rank: the option indexes in the right order
  correct         integer[]   NOT NULL,
  time_limit_sec  integer     NOT NULL DEFAULT 30 CHECK (time_limit_sec BETWEEN 5 AND 300),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sandbox, challenge_date)
);

-- One attempt per player per question. player = the user id (sandbox: 'sandbox:<name>'). Times are the
-- server's: started when the question is shown, answered when the answer arrives.
CREATE TABLE daily_challenge_plays (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  challenge_id  bigint      NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  sandbox       boolean     NOT NULL DEFAULT false,
  player        text        NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  answered_at   timestamptz,
  answer        integer[],
  is_correct    boolean,
  timed_out     boolean     NOT NULL DEFAULT false,
  elapsed_ms    integer,
  UNIQUE (challenge_id, player)
);
CREATE INDEX daily_challenge_plays_player_idx ON daily_challenge_plays (sandbox, player);

-- A finished week (week_start = its Monday) and its two winners
CREATE TABLE daily_challenge_weeks (
  sandbox          boolean     NOT NULL DEFAULT false,
  week_start       date        NOT NULL,
  finalized_at     timestamptz NOT NULL DEFAULT now(),
  top_player       text,
  top_correct      integer,
  top_ms           bigint,
  random_player    text,
  entrants         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (sandbox, week_start)
);

-- A winner's prize: notified, then their shirt size and address, then mailed
CREATE TABLE daily_challenge_claims (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sandbox       boolean     NOT NULL DEFAULT false,
  week_start    date        NOT NULL,
  kind          text        NOT NULL CHECK (kind IN ('top', 'random')),
  player        text        NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notified_at   timestamptz,
  notify_error  text,
  full_name     text,
  shirt_size    text,
  address1      text,
  address2      text,
  city          text,
  state         text,
  zip           text,
  submitted_at  timestamptz,
  mailed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sandbox, week_start, kind)
);

CREATE TABLE polls (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sandbox     boolean     NOT NULL DEFAULT false,
  topic       text        NOT NULL DEFAULT 'boys' CHECK (topic IN ('boys', 'girls', 'general')),
  question    text        NOT NULL,
  answers     text[]      NOT NULL CHECK (array_length(answers, 1) = 4),
  poll_date   date,
  archived    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE poll_votes (
  poll_id    bigint      NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  player     text        NOT NULL,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  choice     integer     NOT NULL CHECK (choice BETWEEN 0 AND 3),
  voted_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, player)
);

ALTER TABLE daily_challenges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenge_plays  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenge_weeks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenge_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes             ENABLE ROW LEVEL SECURITY;
GRANT ALL ON daily_challenges, daily_challenge_plays, daily_challenge_weeks, daily_challenge_claims, polls, poll_votes TO service_role;

COMMIT;

-- Verify: six tables, all empty
SELECT (SELECT count(*) FROM daily_challenges) AS questions, (SELECT count(*) FROM daily_challenge_plays) AS plays,
       (SELECT count(*) FROM daily_challenge_weeks) AS weeks, (SELECT count(*) FROM daily_challenge_claims) AS claims,
       (SELECT count(*) FROM polls) AS polls, (SELECT count(*) FROM poll_votes) AS votes;

-- ROLLBACK: DROP TABLE poll_votes, polls, daily_challenge_claims, daily_challenge_weeks, daily_challenge_plays, daily_challenges;
--           then re-run the per-side part of 20261112_daily_challenge_polls_history.sql
