-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260806_power_points_table.sql
--
-- Creates the power_points table to cache computed NJSIAA Power Points
-- per school/season/gender. Populated by scripts/compute_power_points.ts.
--
-- Power Points determine team tournament seeding for public schools.
-- Formula: average of best 9 dual-meet point values (using Ranking Scale).
-- See docs/migrations/README.md and team-scoring-formula.md for context.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS power_points (
  id           SERIAL PRIMARY KEY,
  school_id    INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id    INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  gender       TEXT    NOT NULL DEFAULT 'M',   -- 'M' = boys, 'F' = girls
  power_points NUMERIC(6,2) NOT NULL,
  overall_wins    INTEGER NOT NULL DEFAULT 0,
  overall_losses  INTEGER NOT NULL DEFAULT 0,
  meets_counted   INTEGER,                     -- number of meets averaged (max 9)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, season_id, gender)
);

CREATE INDEX IF NOT EXISTS idx_power_points_season_gender
  ON power_points (season_id, gender);

CREATE INDEX IF NOT EXISTS idx_power_points_school
  ON power_points (school_id);

-- Enable RLS (read-only public access, same pattern as other tables)
ALTER TABLE power_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "power_points_select"
  ON power_points FOR SELECT USING (true);

-- ROLLBACK:
-- DROP TABLE IF EXISTS power_points;
