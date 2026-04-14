-- Conference standings tables for dual-meet records

-- APPLIED: 2026-04-04
CREATE TABLE IF NOT EXISTS conferences (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  season_id INTEGER REFERENCES seasons(id)
);

CREATE TABLE IF NOT EXISTS conference_standings (
  id SERIAL PRIMARY KEY,
  conference_slug TEXT NOT NULL,
  division TEXT NOT NULL,
  school_id INTEGER REFERENCES schools(id),
  school_name TEXT NOT NULL,
  season_id INTEGER REFERENCES seasons(id),
  overall_wins INTEGER,
  overall_losses INTEGER,
  div_wins INTEGER,
  div_losses INTEGER,
  pf INTEGER,
  pa INTEGER
);

CREATE INDEX IF NOT EXISTS idx_conf_standings_slug_season
  ON conference_standings(conference_slug, season_id);

CREATE INDEX IF NOT EXISTS idx_conf_standings_division
  ON conference_standings(conference_slug, season_id, division);

-- ROLLBACK:
-- DROP INDEX IF EXISTS idx_conf_standings_division;
-- DROP INDEX IF EXISTS idx_conf_standings_slug_season;
-- DROP TABLE IF EXISTS conference_standings;
-- DROP TABLE IF EXISTS conferences;
