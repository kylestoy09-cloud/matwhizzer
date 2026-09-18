-- Tracks potential wrestler school transfers flagged for admin review.
--
-- Records are created by:
--   1. A manual data-health scan that finds the same (first_name, last_name)
--      appearing at multiple schools in tournament_entries
--   2. Optionally: the import flow, when matching an unconfirmed wrestler whose
--      name also appears at a different school (requires roster_enrollment migration)
--
-- This is separate from the existing wrestlers_multi_school Data Health check,
-- which flags data-quality issues. This table tracks legitimate transfer candidates.

CREATE TABLE IF NOT EXISTS pending_wrestler_transfers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wrestler_id         uuid        NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
  suspected_school_id int         NOT NULL REFERENCES schools(id),
  current_school_id   int         REFERENCES schools(id),
  detected_via        text        NOT NULL
    CHECK (detected_via IN ('data_health_scan', 'import_name_match', 'manual')),
  status              text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  resolved_by         text,
  UNIQUE (wrestler_id, suspected_school_id)
);

CREATE INDEX IF NOT EXISTS idx_pwt_wrestler_id ON pending_wrestler_transfers(wrestler_id);
CREATE INDEX IF NOT EXISTS idx_pwt_status      ON pending_wrestler_transfers(status)
  WHERE status = 'pending';

ALTER TABLE pending_wrestler_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON pending_wrestler_transfers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON pending_wrestler_transfers TO anon, authenticated;
GRANT ALL    ON pending_wrestler_transfers TO service_role;

-- Rollback:
--   DROP TABLE IF EXISTS pending_wrestler_transfers;
