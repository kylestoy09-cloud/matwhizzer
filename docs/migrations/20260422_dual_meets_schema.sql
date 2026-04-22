-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260422_dual_meets_schema.sql
--
-- Creates two new tables for dual meet import (Stage 5):
--   dual_meets        — one row per dual meet event
--   dual_meet_matches — one row per weight class bout within a dual meet
--
-- These are separate from the tournament-bracket `matches` table, which
-- tracks postseason bracket results and has a completely different schema.
--
-- ROLLBACK at bottom of file.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── dual_meets ────────────────────────────────────────────────────────────────

CREATE TABLE dual_meets (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id        integer NOT NULL REFERENCES seasons(id),
  team1_school_id  integer REFERENCES schools(id),
  team2_school_id  integer REFERENCES schools(id),
  meet_date        date    NOT NULL,
  team1_score      integer,
  team2_score      integer,
  gender           text    NOT NULL DEFAULT 'M',
  status           text    NOT NULL DEFAULT 'final',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- For duplicate detection: same two schools on the same date
CREATE INDEX idx_dual_meets_teams_date
  ON dual_meets (team1_school_id, team2_school_id, meet_date);

-- ── dual_meet_matches ─────────────────────────────────────────────────────────

CREATE TABLE dual_meet_matches (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  dual_meet_id       uuid    NOT NULL REFERENCES dual_meets(id) ON DELETE CASCADE,
  weight_class       integer NOT NULL,
  wrestler_a_id      uuid    REFERENCES wrestlers(id),
  wrestler_b_id      uuid    REFERENCES wrestlers(id),
  school_a_id        integer REFERENCES schools(id),
  school_b_id        integer REFERENCES schools(id),
  winner_id          uuid    REFERENCES wrestlers(id),
  result_type        text,
  result_detail      text,
  fall_time_seconds  integer,
  team1_points       integer,
  team2_points       integer,
  is_double_forfeit  boolean NOT NULL DEFAULT false,
  is_forfeit_win     boolean NOT NULL DEFAULT false,
  validated          boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- For fast per-meet lookups
CREATE INDEX idx_dual_meet_matches_dual_meet_id
  ON dual_meet_matches (dual_meet_id);

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- BEGIN;
-- DROP TABLE IF EXISTS dual_meet_matches;
-- DROP TABLE IF EXISTS dual_meets;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
