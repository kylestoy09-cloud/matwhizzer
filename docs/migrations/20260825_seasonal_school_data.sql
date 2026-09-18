-- Seasonal school data: add season_id to school_districts and school_regions,
-- create school_conferences table, backfill from schools.athletic_conference.
--
-- school_districts and school_regions both have a PK on (school_id, district_id)
-- and (school_id, region_id) respectively. We must drop and recreate those PKs
-- to include season_id before we can insert season-2 copies of the rows.
-- All DML referencing newly-added columns uses EXECUTE (dynamic SQL) to avoid
-- PL/pgSQL compile-time "column does not exist" errors.
-- NOT YET APPLIED — review and run manually in Supabase SQL editor.

DO $$ BEGIN

  -- ── school_districts ────────────────────────────────────────────────────────

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'school_districts' AND column_name = 'season_id'
  ) THEN
    -- Add column nullable first so we can backfill before making it NOT NULL
    ALTER TABLE school_districts ADD COLUMN season_id integer REFERENCES seasons(id);
    -- Backfill all existing rows to season 1
    EXECUTE 'UPDATE school_districts SET season_id = 1';
    -- Drop old PK (school_id, district_id) and recreate with season_id included
    ALTER TABLE school_districts DROP CONSTRAINT school_districts_pkey;
    ALTER TABLE school_districts ADD PRIMARY KEY (school_id, district_id, season_id);
    ALTER TABLE school_districts ALTER COLUMN season_id SET NOT NULL;
  END IF;

  -- Copy season-1 rows → season-2 (backfill current season)
  EXECUTE $sql$
    INSERT INTO school_districts (school_id, district_id, season_id)
    SELECT sd.school_id, sd.district_id, 2
    FROM school_districts sd
    WHERE sd.season_id = 1
    ON CONFLICT DO NOTHING
  $sql$;

  EXECUTE 'CREATE INDEX IF NOT EXISTS school_districts_season_idx ON school_districts(school_id, season_id)';

  -- ── school_regions ──────────────────────────────────────────────────────────

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'school_regions' AND column_name = 'season_id'
  ) THEN
    ALTER TABLE school_regions ADD COLUMN season_id integer REFERENCES seasons(id);
    EXECUTE 'UPDATE school_regions SET season_id = 1';
    -- Drop old PK (school_id, region_id) and recreate with season_id included
    ALTER TABLE school_regions DROP CONSTRAINT school_regions_pkey;
    ALTER TABLE school_regions ADD PRIMARY KEY (school_id, region_id, season_id);
    ALTER TABLE school_regions ALTER COLUMN season_id SET NOT NULL;
  END IF;

  -- Copy season-1 rows → season-2
  EXECUTE $sql$
    INSERT INTO school_regions (school_id, region_id, season_id)
    SELECT sr.school_id, sr.region_id, 2
    FROM school_regions sr
    WHERE sr.season_id = 1
    ON CONFLICT DO NOTHING
  $sql$;

  EXECUTE 'CREATE INDEX IF NOT EXISTS school_regions_season_idx ON school_regions(school_id, season_id)';

  -- ── coaches: add season_id (safety net if applied before this fix) ───────────

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coaches') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'coaches' AND column_name = 'season_id'
    ) THEN
      ALTER TABLE coaches ADD COLUMN season_id integer REFERENCES seasons(id);
    END IF;
    EXECUTE 'CREATE INDEX IF NOT EXISTS coaches_season_idx ON coaches(school_id, season_id)';
  END IF;

END $$;

-- ── school_conferences table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS school_conferences (
  school_id  integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id  integer NOT NULL REFERENCES seasons(id),
  conference text    NOT NULL,
  PRIMARY KEY (school_id, season_id)
);

GRANT SELECT ON school_conferences TO anon, authenticated;
GRANT ALL    ON school_conferences TO service_role;

INSERT INTO school_conferences (school_id, season_id, conference)
SELECT id, 1, athletic_conference
FROM schools
WHERE athletic_conference IS NOT NULL AND trim(athletic_conference) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO school_conferences (school_id, season_id, conference)
SELECT id, 2, athletic_conference
FROM schools
WHERE athletic_conference IS NOT NULL AND trim(athletic_conference) <> ''
ON CONFLICT DO NOTHING;
