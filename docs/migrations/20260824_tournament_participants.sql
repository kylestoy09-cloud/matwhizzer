-- Creates in_season_tournament_participants — a join table linking schools to
-- in-season tournaments ahead of results being imported.
--
-- Schools are added here via:
--   rollover_upload  — Paul uploads participant school names at rollover time (Step 5)
--   schedule_import  — inferred from each school's schedule data (Step 6)
--   manual           — added individually by an admin

CREATE TABLE IF NOT EXISTS in_season_tournament_participants (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  in_season_tournament_id uuid        NOT NULL REFERENCES in_season_tournaments(id) ON DELETE CASCADE,
  school_id               int         NOT NULL REFERENCES schools(id),
  added_via               text        NOT NULL
    CHECK (added_via IN ('rollover_upload', 'schedule_import', 'manual')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (in_season_tournament_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_istp_tournament_id
  ON in_season_tournament_participants (in_season_tournament_id);

CREATE INDEX IF NOT EXISTS idx_istp_school_id
  ON in_season_tournament_participants (school_id);

ALTER TABLE in_season_tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON in_season_tournament_participants
  FOR SELECT USING (true);

GRANT SELECT ON in_season_tournament_participants TO anon, authenticated;
GRANT ALL    ON in_season_tournament_participants TO service_role;

-- Rollback:
--   DROP TABLE IF EXISTS in_season_tournament_participants;
