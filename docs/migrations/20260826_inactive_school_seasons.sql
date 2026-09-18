-- inactive_school_seasons: explicit per-season deactivation of a school
-- A row here means the school has no program for that season.
-- The admin API handles removing the school from all season-specific groups.

CREATE TABLE inactive_school_seasons (
  school_id  integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id  integer NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, season_id)
);

CREATE INDEX iss_season_idx ON inactive_school_seasons (season_id);

ALTER TABLE inactive_school_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON inactive_school_seasons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read" ON inactive_school_seasons
  FOR SELECT TO anon, authenticated USING (true);

GRANT ALL    ON inactive_school_seasons TO service_role;
GRANT SELECT ON inactive_school_seasons TO anon, authenticated;
