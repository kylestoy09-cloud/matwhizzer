-- Coaches table for tracking school coaching staff
-- NOT YET APPLIED — review and run manually in Supabase SQL editor

CREATE TABLE IF NOT EXISTS coaches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  school_id   integer     NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id   integer     REFERENCES seasons(id),
  title       text        NOT NULL DEFAULT 'Head Coach',
  email       text,
  phone       text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Add season_id if the table existed before this column was added
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaches' AND column_name = 'season_id'
  ) THEN
    ALTER TABLE coaches ADD COLUMN season_id integer REFERENCES seasons(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS coaches_school_id_idx ON coaches(school_id);
CREATE INDEX IF NOT EXISTS coaches_active_idx    ON coaches(school_id, is_active);
CREATE INDEX IF NOT EXISTS coaches_season_idx    ON coaches(school_id, season_id);

-- RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'coaches' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON coaches FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'coaches' AND policyname = 'Public read active coaches'
  ) THEN
    CREATE POLICY "Public read active coaches"
      ON coaches FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Keep updated_at current on any row change
CREATE OR REPLACE FUNCTION set_coaches_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'coaches_updated_at'
  ) THEN
    CREATE TRIGGER coaches_updated_at
      BEFORE UPDATE ON coaches
      FOR EACH ROW EXECUTE FUNCTION set_coaches_updated_at();
  END IF;
END $$;
