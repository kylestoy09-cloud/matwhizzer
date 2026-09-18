-- Rankings shared backend — three-table schema used by both the individual
-- and team rankings workbenches (Steps 14 and 15).
--
-- Design principles:
--   1. ranking_computed_variants  — immutable output of a scoring run; never edited
--   2. ranking_editorial          — admin-editable working copy; starts as a copy
--                                   of a variant but can diverge before publish
--   3. ranking_published          — permanent archive; each publish creates a new
--                                   row so week-over-week movement tracking is
--                                   possible without overwriting history
--
-- scope_id is TEXT to accommodate heterogeneous identifiers:
--   state     → NULL
--   section   → text name, e.g. 'North 1', 'South'
--   conference→ conference slug, e.g. 'big_north'
--   district  → district number as text, e.g. '7'
--   region    → region number as text, e.g. '3'
--
-- results JSONB shape (same for all three tables):
--   [
--     {
--       "rank":        1,
--       "wrestler_id": "<uuid>",         -- for individual rankings
--       "school_id":   42,               -- for team rankings (null for individual)
--       "score":       87.4,
--       "label":       "Smith J. – Hackettstown"  -- denormalized display string
--     },
--     ...
--   ]
--
-- Rollback at bottom of file.

-- ── ranking_computed_variants ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ranking_computed_variants (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ranking_type  text        NOT NULL,  -- e.g. 'individual_state', 'team_conference'
  formula_name  text        NOT NULL,  -- e.g. 'hammer_score', 'njsiaa_power_points'
  scope         text        NOT NULL
    CHECK (scope IN ('state', 'section', 'conference', 'district', 'region')),
  scope_id      text,                  -- NULL for state; see header comment for others
  season_id     integer     NOT NULL REFERENCES seasons(id),
  period_start  date        NOT NULL,
  period_end    date        NOT NULL,
  computed_at   timestamptz NOT NULL DEFAULT now(),
  results       jsonb       NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_rcv_lookup
  ON ranking_computed_variants (ranking_type, scope, scope_id, season_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_rcv_computed_at
  ON ranking_computed_variants (computed_at DESC);

-- ── ranking_editorial ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ranking_editorial (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ranking_type         text        NOT NULL,
  scope                text        NOT NULL
    CHECK (scope IN ('state', 'section', 'conference', 'district', 'region')),
  scope_id             text,
  season_id            integer     NOT NULL REFERENCES seasons(id),
  period_start         date        NOT NULL,
  period_end           date        NOT NULL,
  based_on_variant_id  uuid        REFERENCES ranking_computed_variants(id) ON DELETE SET NULL,
  results              jsonb       NOT NULL DEFAULT '[]',
  updated_by           text        NOT NULL,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_re_lookup
  ON ranking_editorial (ranking_type, scope, scope_id, season_id, updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION ranking_editorial_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER ranking_editorial_updated_at
  BEFORE UPDATE ON ranking_editorial
  FOR EACH ROW EXECUTE FUNCTION ranking_editorial_set_updated_at();

-- ── ranking_published ─────────────────────────────────────────────────────────
-- Each row is a permanent archive snapshot. Never updated after insert.

CREATE TABLE IF NOT EXISTS ranking_published (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ranking_type         text        NOT NULL,
  scope                text        NOT NULL
    CHECK (scope IN ('state', 'section', 'conference', 'district', 'region')),
  scope_id             text,
  season_id            integer     NOT NULL REFERENCES seasons(id),
  period_start         date        NOT NULL,
  period_end           date        NOT NULL,
  source_type          text        NOT NULL
    CHECK (source_type IN ('editorial', 'auto_computed')),
  source_editorial_id  uuid        REFERENCES ranking_editorial(id) ON DELETE SET NULL,
  source_variant_id    uuid        REFERENCES ranking_computed_variants(id) ON DELETE SET NULL,
  results              jsonb       NOT NULL DEFAULT '[]',
  published_at         timestamptz NOT NULL DEFAULT now(),
  published_by         text        -- NULL for auto-published runs
);

-- Primary lookup: latest published per scope (movement tracking compares rows)
CREATE INDEX IF NOT EXISTS idx_rp_lookup
  ON ranking_published (ranking_type, scope, scope_id, season_id, published_at DESC);

-- ── RLS & grants ──────────────────────────────────────────────────────────────

ALTER TABLE ranking_computed_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_editorial         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_published         ENABLE ROW LEVEL SECURITY;

-- Service role: full access (scoring runs, editorial saves, auto-publish)
CREATE POLICY "service_role_full" ON ranking_computed_variants
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full" ON ranking_editorial
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full" ON ranking_published
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated (admins): read all three tables
CREATE POLICY "authenticated_read" ON ranking_computed_variants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON ranking_editorial
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON ranking_published
  FOR SELECT TO authenticated USING (true);

-- Anon: read published rankings only (public display)
CREATE POLICY "anon_read_published" ON ranking_published
  FOR SELECT TO anon USING (true);

GRANT SELECT ON ranking_computed_variants TO authenticated;
GRANT SELECT ON ranking_editorial         TO authenticated;
GRANT SELECT ON ranking_published         TO authenticated, anon;
GRANT ALL    ON ranking_computed_variants TO service_role;
GRANT ALL    ON ranking_editorial         TO service_role;
GRANT ALL    ON ranking_published         TO service_role;

-- Rollback:
--   DROP TRIGGER IF EXISTS ranking_editorial_updated_at ON ranking_editorial;
--   DROP FUNCTION IF EXISTS ranking_editorial_set_updated_at();
--   DROP TABLE IF EXISTS ranking_published;
--   DROP TABLE IF EXISTS ranking_editorial;
--   DROP TABLE IF EXISTS ranking_computed_variants;
