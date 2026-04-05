-- school_aliases: maps alternate names to canonical school_ids
-- Used by conference standings parser, logo pipeline, and future search/matching

CREATE TABLE school_aliases (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alias      text   NOT NULL,
  school_id  int    NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  source     text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT school_aliases_alias_key UNIQUE (alias)
);

-- Fast reverse lookup: all aliases for a given school
CREATE INDEX school_aliases_school_id_idx ON school_aliases (school_id);

-- Readable by anyone, writable only by service role
ALTER TABLE school_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON school_aliases FOR SELECT USING (true);

GRANT SELECT ON school_aliases TO anon, authenticated;
GRANT ALL    ON school_aliases TO service_role;

-- ── Seed: 21 aliases from conference standings audit ─────────────────────────
INSERT INTO school_aliases (alias, school_id, source) VALUES
  -- BCSL
  ('Holy Cross Prep',      201, 'conference_standings'),  -- Holy Cross
  ('Bordentown',           227, 'conference_standings'),  -- Bordentown Regional/Florence

  -- Big North
  ('Dwight-Morrow',         41, 'conference_standings'),  -- Dwight Morrow
  ('St. Joseph (Mont.)',    47, 'conference_standings'),  -- St Joseph Regional (Montvale)
  ('DePaul',                22, 'conference_standings'),  -- Depaul Catholic

  -- Cape-Atlantic
  ('St. Joseph (Hamm.)',   356, 'conference_standings'),  -- St. Joseph''s (Hammonton)

  -- Colonial
  ('Gateway',              291, 'conference_standings'),  -- Gateway Reg/ Woodbury

  -- Greater Middlesex
  ('J.P. Stevens',         151, 'conference_standings'),  -- John P. Stevens
  ('St. Joseph (Met.)',    186, 'conference_standings'),  -- St. Joseph Metuchen
  ('Sayreville',           185, 'conference_standings'),  -- Sayreville War Memorial
  ('St. Thomas Aquinas',   234, 'conference_standings'),  -- Saint Thomas Aquinas

  -- NJAC
  ('Pope John',            117, 'conference_standings'),  -- Pope John XXIII
  ('Mount Olive',           56, 'conference_standings'),  -- Mt. Olive

  -- NJIC
  ('St. Mary (Ruth.)',      88, 'conference_standings'),  -- St. Mary High School (Rutherford)

  -- Super Essex
  ('St. Benedict''s',      118, 'conference_standings'),  -- St. Benedicts Prep School

  -- Shore
  ('Southern',             252, 'conference_standings'),  -- Southern Regional
  ('St. John Vianney',     243, 'conference_standings'),  -- Saint John Vianney
  ('Matawan',              194, 'conference_standings'),  -- Matawan Regional
  ('Pinelands',            251, 'conference_standings'),  -- Pinelands Regional
  ('Monmouth',             161, 'conference_standings'),  -- Monmouth Regional

  -- Union County
  ('Gov. Livingston',      102, 'conference_standings')   -- Governor Livingston
;
