-- ── roster_grade_import ───────────────────────────────────────────────────────
-- Persistent staging table for Track Wrestling roster data.
-- Serves two purposes:
--   1. Retroactive grade assignment: match existing wrestlers to Track roster,
--      confirm grades, write to wrestlers.grade + grade_confirmed_source='roster_upload'
--   2. Ongoing lookup: when a new wrestler is added at a school, check this table
--      for a matching no_match entry to auto-suggest a grade
--
-- Status flow:
--   pending → school_matched → wrestler_matched → confirmed
--                            → no_match   (no live wrestler found; stays open for new wrestler lookup)
--             → skipped      (deferred school, e.g. slash-name schools)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roster_grade_import (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Raw data exactly as parsed from Track Wrestling export
  school_name_raw  text        NOT NULL,
  first_name_raw   text        NOT NULL,
  last_name_raw    text        NOT NULL DEFAULT '',
  weight_class     integer,
  grade            text        NOT NULL CHECK (grade IN ('Fr','So','Jr','Sr')),

  -- Resolution
  school_id        integer     REFERENCES schools(id),
  wrestler_id      uuid        REFERENCES wrestlers(id),

  -- Status
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','school_matched','wrestler_matched','confirmed','no_match','skipped')),

  -- Audit trail
  import_batch     text        NOT NULL,   -- e.g. '2026-09-15_track_master'
  confirmed_by     text,                   -- admin email
  confirmed_at     timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the three main access patterns
CREATE INDEX IF NOT EXISTS idx_rgi_school_id        ON roster_grade_import (school_id);
CREATE INDEX IF NOT EXISTS idx_rgi_school_status    ON roster_grade_import (school_id, status);
CREATE INDEX IF NOT EXISTS idx_rgi_wrestler_id      ON roster_grade_import (wrestler_id);
CREATE INDEX IF NOT EXISTS idx_rgi_status           ON roster_grade_import (status);
CREATE INDEX IF NOT EXISTS idx_rgi_batch            ON roster_grade_import (import_batch);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION _set_rgi_updated_at()
RETURNS trigger LANGUAGE plpgsql AS
'BEGIN NEW.updated_at = now(); RETURN NEW; END;';

DROP TRIGGER IF EXISTS trg_rgi_updated_at ON roster_grade_import;
CREATE TRIGGER trg_rgi_updated_at
  BEFORE UPDATE ON roster_grade_import
  FOR EACH ROW EXECUTE FUNCTION _set_rgi_updated_at();

-- RLS: admin-only (service role bypasses; authenticated users need the policy)
ALTER TABLE roster_grade_import ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin only" ON roster_grade_import
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
