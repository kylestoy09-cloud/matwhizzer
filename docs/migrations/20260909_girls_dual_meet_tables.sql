-- ─────────────────────────────────────────────────────────────────────────────
-- 20260909_girls_dual_meet_tables.sql
--
-- Creates separate girls dual meet tables and migrates existing girls data
-- out of the shared boys/girls tables.
--
-- New tables:
--   dual_meets_girls        — girls dual meet events
--   dual_meet_matches_girls — girls bout results
--
-- After applying:
--   1. Existing gender='F' rows in dual_meets are copied to dual_meets_girls
--   2. Their child rows in dual_meet_matches are copied to dual_meet_matches_girls
--   3. The girls rows in the original tables are deleted
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── dual_meets_girls ──────────────────────────────────────────────────────────

CREATE TABLE dual_meets_girls (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id                   integer     NOT NULL REFERENCES seasons(id),
  team1_school_id             integer     REFERENCES schools(id),
  team2_school_id             integer     REFERENCES schools(id),
  team1_school_name_raw       text,
  team2_school_name_raw       text,
  meet_date                   date        NOT NULL,
  team1_score                 integer,
  team2_score                 integer,
  status                      text        NOT NULL DEFAULT 'final',
  is_playoff                  boolean     NOT NULL DEFAULT false,
  criteria_winner_school_id   integer     REFERENCES schools(id),
  confirmed_by_both_schools   boolean     NOT NULL DEFAULT false,
  schedule_source             text,
  meet_time                   time,
  is_complete                 boolean     NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dual_meets_girls_teams_date
  ON dual_meets_girls (team1_school_id, team2_school_id, meet_date);

CREATE INDEX idx_dual_meets_girls_season
  ON dual_meets_girls (season_id, meet_date);

CREATE INDEX idx_dual_meets_girls_is_playoff
  ON dual_meets_girls (season_id, is_playoff) WHERE is_playoff = true;

CREATE UNIQUE INDEX idx_dual_meets_girls_unique_matchup
  ON dual_meets_girls (season_id, team1_school_id, team2_school_id, meet_date);

-- ── dual_meet_matches_girls ───────────────────────────────────────────────────

CREATE TABLE dual_meet_matches_girls (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  dual_meet_id          uuid        NOT NULL REFERENCES dual_meets_girls(id) ON DELETE CASCADE,
  weight_class          integer     NOT NULL,
  order_index           integer,
  wrestler_a_id         uuid        REFERENCES wrestlers(id),
  wrestler_b_id         uuid        REFERENCES wrestlers(id),
  wrestler_a_name_raw   text,
  wrestler_b_name_raw   text,
  school_a_id           integer     REFERENCES schools(id),
  school_b_id           integer     REFERENCES schools(id),
  winner_id             uuid        REFERENCES wrestlers(id),
  result_type           text,
  result_detail         text,
  fall_time_seconds     integer,
  result_time_estimated boolean     NOT NULL DEFAULT false,
  winner_score          smallint,
  loser_score           smallint,
  team1_points          integer,
  team2_points          integer,
  is_double_forfeit     boolean     NOT NULL DEFAULT false,
  is_forfeit_win        boolean     NOT NULL DEFAULT false,
  validated             boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dual_meet_matches_girls_meet_id
  ON dual_meet_matches_girls (dual_meet_id);

-- No unique constraint on (dual_meet_id, weight_class) for girls —
-- tri-meets and jamborees legitimately have multiple bouts per weight class.

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE dual_meets_girls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dual_meet_matches_girls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON dual_meets_girls
  FOR SELECT USING (true);

CREATE POLICY "public read" ON dual_meet_matches_girls
  FOR SELECT USING (true);

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT ON dual_meets_girls        TO anon, authenticated;
GRANT SELECT ON dual_meet_matches_girls TO anon, authenticated;
GRANT ALL    ON dual_meets_girls        TO service_role;
GRANT ALL    ON dual_meet_matches_girls TO service_role;

-- ── Migrate existing girls data ───────────────────────────────────────────────

-- Copy girls meets (preserve original UUIDs so match FK references stay intact)
INSERT INTO dual_meets_girls (
  id, season_id, team1_school_id, team2_school_id,
  team1_school_name_raw, team2_school_name_raw,
  meet_date, team1_score, team2_score, status,
  is_playoff, criteria_winner_school_id,
  confirmed_by_both_schools, schedule_source,
  meet_time, created_at
)
SELECT
  id, season_id, team1_school_id, team2_school_id,
  team1_school_name_raw, team2_school_name_raw,
  meet_date, team1_score, team2_score, status,
  COALESCE(is_playoff, false), criteria_winner_school_id,
  COALESCE(confirmed_by_both_schools, false), schedule_source,
  meet_time, created_at
FROM dual_meets
WHERE gender = 'F';

-- Copy girls match rows — FK now points to dual_meets_girls
INSERT INTO dual_meet_matches_girls (
  id, dual_meet_id, weight_class, order_index,
  wrestler_a_id, wrestler_b_id,
  wrestler_a_name_raw, wrestler_b_name_raw,
  school_a_id, school_b_id, winner_id,
  result_type, result_detail,
  fall_time_seconds, result_time_estimated,
  winner_score, loser_score,
  team1_points, team2_points,
  is_double_forfeit, is_forfeit_win,
  validated, created_at
)
SELECT
  dmm.id, dmm.dual_meet_id, dmm.weight_class, dmm.order_index,
  dmm.wrestler_a_id, dmm.wrestler_b_id,
  dmm.wrestler_a_name_raw, dmm.wrestler_b_name_raw,
  dmm.school_a_id, dmm.school_b_id, dmm.winner_id,
  dmm.result_type, dmm.result_detail,
  dmm.fall_time_seconds, COALESCE(dmm.result_time_estimated, false),
  dmm.winner_score, dmm.loser_score,
  dmm.team1_points, dmm.team2_points,
  dmm.is_double_forfeit, dmm.is_forfeit_win,
  dmm.validated, dmm.created_at
FROM dual_meet_matches dmm
JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
WHERE dm.gender = 'F';

-- Remove girls rows from shared tables
DELETE FROM dual_meet_matches
WHERE dual_meet_id IN (SELECT id FROM dual_meets WHERE gender = 'F');

DELETE FROM dual_meets WHERE gender = 'F';

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
-- DROP TABLE IF EXISTS dual_meet_matches_girls;
-- DROP TABLE IF EXISTS dual_meets_girls;
-- COMMIT;
