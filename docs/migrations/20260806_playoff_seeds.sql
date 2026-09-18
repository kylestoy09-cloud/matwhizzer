-- docs/migrations/20260806_playoff_seeds.sql
-- Stores confirmed playoff seeds for each section/group bracket.
-- Pre-filled from power_points rankings; admin can override before confirming.

CREATE TABLE IF NOT EXISTS playoff_seeds (
  id              SERIAL PRIMARY KEY,
  season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  section         TEXT NOT NULL,
  classification  TEXT NOT NULL,
  gender          TEXT NOT NULL DEFAULT 'M',
  seed            INTEGER NOT NULL CHECK (seed BETWEEN 1 AND 8),
  school_id       INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  confirmed       BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, section, classification, gender, seed)
);

CREATE INDEX IF NOT EXISTS idx_playoff_seeds_lookup
  ON playoff_seeds (season_id, section, classification, gender);

ALTER TABLE playoff_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playoff_seeds_select" ON playoff_seeds FOR SELECT USING (true);
CREATE POLICY "playoff_seeds_service_all" ON playoff_seeds FOR ALL USING (true) WITH CHECK (true);

-- ROLLBACK:
-- DROP TABLE IF EXISTS playoff_seeds;
