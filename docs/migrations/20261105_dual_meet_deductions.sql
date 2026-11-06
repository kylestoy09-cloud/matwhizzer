-- docs/migrations/20261105_dual_meet_deductions.sql
--
-- Team point deductions in duals (unsportsmanlike conduct, coach misconduct, ...). TrackWrestling
-- lists them after the bouts, before "Team Score:", e.g. "Coach Misconduct  0  -1.0". The dual
-- parser (src/lib/parseDualMeet.ts) skipped them, so a dual's stored bouts didn't add up to its
-- final score (Shawnee 43-27 West Deptford 2025-12-13: bouts 43-28, West Deptford -1). The parser
-- now reads them and the importers save them here; scripts/backfill_dual_deductions_20261105.mts
-- loads 2025-26 from the source files.
-- One table per program, like dual_meets / dual_meets_girls. team1/team2 follow the meet's sides.
-- Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS dual_meet_deductions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dual_meet_id  uuid    NOT NULL REFERENCES dual_meets(id) ON DELETE CASCADE,
  label         text    NOT NULL,
  team1_points  numeric NOT NULL DEFAULT 0 CHECK (team1_points <= 0),
  team2_points  numeric NOT NULL DEFAULT 0 CHECK (team2_points <= 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dual_meet_deductions_meet_idx ON dual_meet_deductions (dual_meet_id);

CREATE TABLE IF NOT EXISTS dual_meet_deductions_girls (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dual_meet_id  uuid    NOT NULL REFERENCES dual_meets_girls(id) ON DELETE CASCADE,
  label         text    NOT NULL,
  team1_points  numeric NOT NULL DEFAULT 0 CHECK (team1_points <= 0),
  team2_points  numeric NOT NULL DEFAULT 0 CHECK (team2_points <= 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dual_meet_deductions_girls_meet_idx ON dual_meet_deductions_girls (dual_meet_id);

ALTER TABLE dual_meet_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dual_meet_deductions_girls ENABLE ROW LEVEL SECURITY;
GRANT ALL ON dual_meet_deductions, dual_meet_deductions_girls TO service_role;

COMMIT;

-- Verify: both tables readable, empty
SELECT (SELECT count(*) FROM dual_meet_deductions) AS boys, (SELECT count(*) FROM dual_meet_deductions_girls) AS girls;

-- ROLLBACK: DROP TABLE dual_meet_deductions, dual_meet_deductions_girls;
