-- Creates in_season_tournament_seeds — bracket seeds per weight class for in-season tournaments.
-- Used by the Tournament Hub detail page (Seeds tab) to record and display seeding.

CREATE TABLE IF NOT EXISTS in_season_tournament_seeds (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  in_season_tournament_id uuid        NOT NULL REFERENCES in_season_tournaments(id) ON DELETE CASCADE,
  weight_class            int         NOT NULL,
  seed                    int         NOT NULL,
  wrestler_name_raw       text        NOT NULL,
  school_name_raw         text        NOT NULL DEFAULT '',
  wrestler_id             uuid        REFERENCES wrestlers(id),
  school_id               int         REFERENCES schools(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (in_season_tournament_id, weight_class, seed)
);

CREATE INDEX IF NOT EXISTS idx_ist_seeds_tournament
  ON in_season_tournament_seeds (in_season_tournament_id);

ALTER TABLE in_season_tournament_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON in_season_tournament_seeds
  FOR SELECT USING (true);

GRANT SELECT ON in_season_tournament_seeds TO anon, authenticated;
GRANT ALL    ON in_season_tournament_seeds TO service_role;

-- Rollback:
--   DROP TABLE IF EXISTS in_season_tournament_seeds;
