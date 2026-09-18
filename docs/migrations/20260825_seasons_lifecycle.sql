-- Seasons table lifecycle extension.
-- The seasons table already exists in the DB (created without a migration file)
-- with only an id column. This migration adds the lifecycle fields needed for
-- the three-dashboard admin structure.
-- NOT APPLIED — Paul reviews and runs manually in the Supabase SQL editor.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'year_label'
  ) THEN
    ALTER TABLE seasons ADD COLUMN year_label text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'stage'
  ) THEN
    ALTER TABLE seasons ADD COLUMN stage text NOT NULL DEFAULT 'preseason';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'is_public_default'
  ) THEN
    ALTER TABLE seasons ADD COLUMN is_public_default boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE seasons ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE seasons ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

-- Seed the two known seasons (only fills in rows where year_label is still null
-- so this is safe to re-run after partial application)
UPDATE seasons SET year_label = '2024-25', stage = 'archived', is_public_default = false
WHERE id = 1 AND year_label IS NULL;

UPDATE seasons SET year_label = '2025-26', stage = 'season',   is_public_default = true
WHERE id = 2 AND year_label IS NULL;

-- Enforce at most one public-default season at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS seasons_one_public_default
  ON seasons (is_public_default)
  WHERE is_public_default = true;

-- RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'seasons' AND policyname = 'Public read seasons'
  ) THEN
    CREATE POLICY "Public read seasons"
      ON seasons FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'seasons' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON seasons FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON seasons TO anon, authenticated;
GRANT ALL    ON seasons TO service_role;
