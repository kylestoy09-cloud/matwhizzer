-- Tournament Registry
-- Master list of all tournaments and jamborees (exists independently of import status)

CREATE TABLE tournament_registry (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season      text NOT NULL DEFAULT '2025-26',
  name        text NOT NULL,
  date_start  date,
  date_end    date,
  state       text NOT NULL DEFAULT 'NJ',
  event_type  text NOT NULL DEFAULT 'tournament' CHECK (event_type IN ('tournament', 'jamboree')),
  gender      text NOT NULL DEFAULT 'F' CHECK (gender IN ('M', 'F', 'both')),
  point_value smallint CHECK (point_value BETWEEN 1 AND 20),
  imported    boolean NOT NULL DEFAULT false,
  in_season_tournament_id uuid REFERENCES in_season_tournaments(id) ON DELETE SET NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tournament_registry_season_idx  ON tournament_registry (season);
CREATE INDEX tournament_registry_type_idx    ON tournament_registry (event_type);
CREATE INDEX tournament_registry_gender_idx  ON tournament_registry (gender);
CREATE INDEX tournament_registry_date_idx    ON tournament_registry (date_start);

ALTER TABLE tournament_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON tournament_registry
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON tournament_registry TO service_role;
GRANT SELECT ON tournament_registry TO anon, authenticated;
