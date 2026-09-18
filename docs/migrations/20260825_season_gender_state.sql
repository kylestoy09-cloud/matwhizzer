-- season_gender_state: allows boys and girls to independently advance through
-- the season lifecycle and independently control what's live on the public site,
-- while sharing the same underlying seasons (year) record.
--
-- Gender convention: 'M' (boys) / 'F' (girls) — matches wrestlers.gender,
-- dual_meets.gender, and in_season_tournaments.gender throughout the schema.
--
-- Phase 1 of 2: creates and seeds the new table.
-- Does NOT yet drop seasons.stage / seasons.is_public_default — those columns
-- remain so existing code keeps working unchanged until Phase 2 (code update
-- + follow-up DROP migration).
--
-- NOT APPLIED — Paul reviews and runs manually in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS season_gender_state (
  id               serial       PRIMARY KEY,
  season_id        integer      NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  gender           text         NOT NULL CHECK (gender IN ('M', 'F')),
  stage            text         NOT NULL DEFAULT 'preseason'
                                CHECK (stage IN ('preseason', 'season', 'postseason', 'archived')),
  is_public_default boolean     NOT NULL DEFAULT false,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  finalized_at     timestamptz
);

-- Each (season, gender) pair is unique.
ALTER TABLE season_gender_state
  ADD CONSTRAINT season_gender_state_unique UNIQUE (season_id, gender);

-- Only one row per gender may be the public default at a time.
-- This replaces the old seasons_one_public_default index which had no gender scope.
CREATE UNIQUE INDEX IF NOT EXISTS season_gender_state_one_public_default_m
  ON season_gender_state (is_public_default)
  WHERE is_public_default = true AND gender = 'M';

CREATE UNIQUE INDEX IF NOT EXISTS season_gender_state_one_public_default_f
  ON season_gender_state (is_public_default)
  WHERE is_public_default = true AND gender = 'F';

-- Seed from current seasons data.
-- Season 1 (2024-25): archived for both programs.
-- Season 2 (2025-26): currently in-season, public default for both programs.
INSERT INTO season_gender_state (season_id, gender, stage, is_public_default)
VALUES
  (1, 'M', 'archived', false),
  (1, 'F', 'archived', false),
  (2, 'M', 'season',   true),
  (2, 'F', 'season',   true)
ON CONFLICT (season_id, gender) DO NOTHING;

-- RLS: anyone can read; only service_role can write.
ALTER TABLE season_gender_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'season_gender_state' AND policyname = 'Public read season_gender_state'
  ) THEN
    CREATE POLICY "Public read season_gender_state"
      ON season_gender_state FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'season_gender_state' AND policyname = 'Service role full access season_gender_state'
  ) THEN
    CREATE POLICY "Service role full access season_gender_state"
      ON season_gender_state FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON season_gender_state TO anon, authenticated;
GRANT ALL    ON season_gender_state TO service_role;
GRANT USAGE, SELECT ON SEQUENCE season_gender_state_id_seq TO service_role;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sgs_season_gender
  ON season_gender_state (season_id, gender);

CREATE INDEX IF NOT EXISTS idx_sgs_public_default
  ON season_gender_state (is_public_default, gender)
  WHERE is_public_default = true;

-- ── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS season_gender_state;
-- (seasons.stage and seasons.is_public_default are untouched by this migration
--  so nothing needs to be restored on rollback.)
