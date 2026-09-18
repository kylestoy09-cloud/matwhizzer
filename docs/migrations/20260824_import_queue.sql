-- Creates import_queue — the cross-admin staging table for all imports.
--
-- Unlike dual_import_drafts / rtf_import_drafts (which are per-user and
-- write to live tables immediately), import_queue:
--   1. Is visible to all admins (no RLS user-scoping — service_role reads all)
--   2. Tracks the full status lifecycle before any live-table writes
--   3. Stores both raw input and match results so Step 9 can publish atomically
--
-- Status lifecycle:
--   draft          → item created, raw data saved, not yet matched
--   matching       → school/wrestler matching in progress
--   ready_for_review → matching done; awaiting admin approval before publish
--   published      → data committed to live tables (Step 9)
--   rejected       → discarded without publishing

CREATE TABLE IF NOT EXISTS import_queue (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email    text        NOT NULL,
  source_type    text        NOT NULL
    CHECK (source_type IN ('dual_meet', 'tournament_rtf', 'schedule', 'other')),
  status         text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'matching', 'ready_for_review', 'published', 'rejected')),
  label          text        NOT NULL DEFAULT '',
  item_count     int         NOT NULL DEFAULT 0,
  raw_data       jsonb       NOT NULL DEFAULT '{}',
  match_results  jsonb       NOT NULL DEFAULT '{}',
  reviewed_data  jsonb       NOT NULL DEFAULT '{}',
  notes          text,
  published_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_queue_status     ON import_queue(status);
CREATE INDEX IF NOT EXISTS idx_import_queue_admin      ON import_queue(admin_email);
CREATE INDEX IF NOT EXISTS idx_import_queue_updated_at ON import_queue(updated_at DESC);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION import_queue_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER import_queue_updated_at
  BEFORE UPDATE ON import_queue
  FOR EACH ROW EXECUTE FUNCTION import_queue_set_updated_at();

-- Admins can see all rows (no user-scoping)
ALTER TABLE import_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full" ON import_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_all" ON import_queue
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON import_queue TO authenticated;
GRANT ALL    ON import_queue TO service_role;

-- Rollback:
--   DROP TRIGGER IF EXISTS import_queue_updated_at ON import_queue;
--   DROP FUNCTION IF EXISTS import_queue_set_updated_at();
--   DROP TABLE IF EXISTS import_queue;
