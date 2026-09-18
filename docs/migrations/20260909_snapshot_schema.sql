-- ─────────────────────────────────────────────────────────────────────────────
-- 20260909_snapshot_schema.sql
--
-- Snapshot Dashboard infrastructure.
--
-- New column:
--   schools.locale_section — geographic section for Non-Public schools, so the
--     snapshot section tabs can include them based on where they're located.
--
-- New tables (boys):
--   snapshot_reports         — one row per date; full computed payload as JSONB
--   snapshot_season_highs    — one row per stat_key; tracks season records
--   snapshot_streak_state    — one row per wrestler+streak_type; rolling streak
--
-- Girls mirrors (identical structure, fully separate):
--   snapshot_reports_girls
--   snapshot_season_highs_girls
--   snapshot_streak_state_girls
--
-- Run this in the Supabase SQL editor. If you hit a deadlock, wait a moment
-- for background connections to settle and run again — IF NOT EXISTS / IF NOT
-- EXISTS guards make every statement safe to retry.
-- ─────────────────────────────────────────────────────────────────────────────

-- Fail fast if we can't acquire a lock (avoids deadlock waits).
SET lock_timeout = '5s';

-- ── schools.locale_section ────────────────────────────────────────────────────

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS locale_section text
    CHECK (locale_section IN ('North I', 'North II', 'Central', 'South'));

-- ── snapshot_reports (boys) ───────────────────────────────────────────────────
-- computed_at = when the compute job ran (matches API column name)

CREATE TABLE IF NOT EXISTS snapshot_reports (
  report_date   date        NOT NULL,
  season        text        NOT NULL,
  payload       jsonb       NOT NULL DEFAULT '{}',
  computed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_date)
);

ALTER TABLE snapshot_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth read"   ON snapshot_reports FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service all" ON snapshot_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON snapshot_reports TO authenticated;
GRANT ALL    ON snapshot_reports TO service_role;

-- ── snapshot_season_highs (boys) ──────────────────────────────────────────────
-- is_lower_better: true for speed stats (faster = better record)

CREATE TABLE IF NOT EXISTS snapshot_season_highs (
  season           text        NOT NULL,
  stat_key         text        NOT NULL,
  value            numeric     NOT NULL,
  context          jsonb       NOT NULL DEFAULT '{}',
  set_on           date        NOT NULL,
  is_lower_better  boolean     NOT NULL DEFAULT false,
  PRIMARY KEY (season, stat_key)
);

ALTER TABLE snapshot_season_highs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth read"   ON snapshot_season_highs FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service all" ON snapshot_season_highs FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON snapshot_season_highs TO authenticated;
GRANT ALL    ON snapshot_season_highs TO service_role;

-- ── snapshot_streak_state (boys) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS snapshot_streak_state (
  wrestler_id   uuid        NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
  season        text        NOT NULL,
  streak_type   text        NOT NULL CHECK (streak_type IN ('pin', 'tech', 'bonus', 'win')),
  current_len   smallint    NOT NULL DEFAULT 0,
  started_on    date,
  last_updated  date,
  PRIMARY KEY (wrestler_id, season, streak_type)
);

CREATE INDEX IF NOT EXISTS idx_sss_season_type_len
  ON snapshot_streak_state (season, streak_type, current_len DESC);

ALTER TABLE snapshot_streak_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth read"   ON snapshot_streak_state FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service all" ON snapshot_streak_state FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON snapshot_streak_state TO authenticated;
GRANT ALL    ON snapshot_streak_state TO service_role;

-- ── snapshot_reports_girls ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS snapshot_reports_girls (
  report_date   date        NOT NULL,
  season        text        NOT NULL,
  payload       jsonb       NOT NULL DEFAULT '{}',
  computed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_date)
);

ALTER TABLE snapshot_reports_girls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth read"   ON snapshot_reports_girls FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service all" ON snapshot_reports_girls FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON snapshot_reports_girls TO authenticated;
GRANT ALL    ON snapshot_reports_girls TO service_role;

-- ── snapshot_season_highs_girls ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS snapshot_season_highs_girls (
  season           text        NOT NULL,
  stat_key         text        NOT NULL,
  value            numeric     NOT NULL,
  context          jsonb       NOT NULL DEFAULT '{}',
  set_on           date        NOT NULL,
  is_lower_better  boolean     NOT NULL DEFAULT false,
  PRIMARY KEY (season, stat_key)
);

ALTER TABLE snapshot_season_highs_girls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth read"   ON snapshot_season_highs_girls FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service all" ON snapshot_season_highs_girls FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON snapshot_season_highs_girls TO authenticated;
GRANT ALL    ON snapshot_season_highs_girls TO service_role;

-- ── snapshot_streak_state_girls ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS snapshot_streak_state_girls (
  wrestler_id   uuid        NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
  season        text        NOT NULL,
  streak_type   text        NOT NULL CHECK (streak_type IN ('pin', 'tech', 'bonus', 'win')),
  current_len   smallint    NOT NULL DEFAULT 0,
  started_on    date,
  last_updated  date,
  PRIMARY KEY (wrestler_id, season, streak_type)
);

CREATE INDEX IF NOT EXISTS idx_sss_girls_season_type_len
  ON snapshot_streak_state_girls (season, streak_type, current_len DESC);

ALTER TABLE snapshot_streak_state_girls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth read"   ON snapshot_streak_state_girls FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service all" ON snapshot_streak_state_girls FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON snapshot_streak_state_girls TO authenticated;
GRANT ALL    ON snapshot_streak_state_girls TO service_role;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- ALTER TABLE schools DROP COLUMN IF EXISTS locale_section;
-- DROP TABLE IF EXISTS snapshot_streak_state_girls;
-- DROP TABLE IF EXISTS snapshot_season_highs_girls;
-- DROP TABLE IF EXISTS snapshot_reports_girls;
-- DROP TABLE IF EXISTS snapshot_streak_state;
-- DROP TABLE IF EXISTS snapshot_season_highs;
-- DROP TABLE IF EXISTS snapshot_reports;
