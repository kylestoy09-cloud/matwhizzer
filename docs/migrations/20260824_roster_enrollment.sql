-- Roster & Enrollment Data Model
-- NOT YET APPLIED — review and run manually in Supabase SQL editor

-- ── 1. Extend wrestlers table ─────────────────────────────────────────────────

ALTER TABLE wrestlers
  ADD COLUMN IF NOT EXISTS grade                  text          CHECK (grade IN ('Fr', 'So', 'Jr', 'Sr')),
  ADD COLUMN IF NOT EXISTS grade_confirmed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS grade_confirmed_source text          CHECK (grade_confirmed_source IN ('roster_upload', 'districts', 'manual')),
  ADD COLUMN IF NOT EXISTS projected_weight_class integer,
  ADD COLUMN IF NOT EXISTS confirmed_weight_class integer,
  ADD COLUMN IF NOT EXISTS is_active              boolean       NOT NULL DEFAULT true;

-- Index for quick lookup of active wrestlers by grade
CREATE INDEX IF NOT EXISTS wrestlers_grade_active_idx ON wrestlers(grade, is_active)
  WHERE grade IS NOT NULL;

-- ── 2. Create wrestler_school_history table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS wrestler_school_history (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wrestler_id            uuid        NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
  school_id              integer     NOT NULL REFERENCES schools(id),
  start_date             date        NOT NULL,
  end_date               date,
  is_confirmed_transfer  boolean     NOT NULL DEFAULT false,
  created_via            text        NOT NULL
    CHECK (created_via IN ('rollover_manual', 'import_flag', 'initial')),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wsh_wrestler_id_idx ON wrestler_school_history(wrestler_id);
CREATE INDEX IF NOT EXISTS wsh_school_id_idx   ON wrestler_school_history(school_id);
CREATE INDEX IF NOT EXISTS wsh_active_idx      ON wrestler_school_history(wrestler_id)
  WHERE end_date IS NULL;

ALTER TABLE wrestler_school_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON wrestler_school_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read"
  ON wrestler_school_history FOR SELECT
  TO anon, authenticated
  USING (true);

-- NOTE: Do NOT backfill existing wrestler-school relationships in this migration.
-- A separate follow-up migration will handle backfilling once the schema is confirmed.
