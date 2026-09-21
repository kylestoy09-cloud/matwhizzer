-- ─────────────────────────────────────────────────────────────────────────────
-- 20260920_conference_standings_gender.sql
--
-- conference_standings had no gender column, so boys and girls standings could
-- not be stored side by side (and the public girls conference page was reading
-- boys rows). Adds gender, defaulting every existing row to 'M' — all existing
-- rows are boys (verified: BCSL rows match the boys standings; no girls
-- standings importer has ever existed).
--
-- Safe to run before the code that uses it: the column has a default, so
-- existing readers and writers keep working unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conference_standings' AND column_name = 'gender'
  ) THEN
    ALTER TABLE conference_standings
      ADD COLUMN gender text NOT NULL DEFAULT 'M'
      CHECK (gender IN ('M', 'F'));
  END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_conf_standings_season_gender
  ON conference_standings (season_id, gender, conference_slug);

-- ROLLBACK:
-- DROP INDEX IF EXISTS idx_conf_standings_season_gender;
-- ALTER TABLE conference_standings DROP COLUMN gender;
