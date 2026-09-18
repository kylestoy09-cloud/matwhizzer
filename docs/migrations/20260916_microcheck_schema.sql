-- docs/migrations/20260916_microcheck_schema.sql
-- Microcheck preseason data-entry tool
-- Adds missing school columns and a task-log table

-- ── 1. New columns on schools ────────────────────────────────────────────────

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS address      text,
  ADD COLUMN IF NOT EXISTS facebook_url text;

COMMENT ON COLUMN schools.address      IS 'School physical mailing / street address';
COMMENT ON COLUMN schools.facebook_url IS 'School or wrestling-program Facebook page URL';

-- ── 2. microcheck_task_log ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS microcheck_task_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      uuid        NOT NULL,           -- matches app_users.id / auth.uid()
  school_id     integer     NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  gender        text        NOT NULL CHECK (gender IN ('M', 'F')),
  field         text        NOT NULL,           -- 'address' | 'website_url' | 'twitter_handle' |
                                                --  'facebook_url' | 'coach_name' | 'coach_email' |
                                                --  'ad_name' | 'ad_email' | 'roster_match'
  status        text        NOT NULL CHECK (status IN ('completed', 'cant_find')),
  value_entered text,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, gender, field)
);

CREATE INDEX IF NOT EXISTS mtl_admin_idx  ON microcheck_task_log (admin_id);
CREATE INDEX IF NOT EXISTS mtl_status_idx ON microcheck_task_log (status, gender);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE microcheck_task_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'microcheck_task_log' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON microcheck_task_log FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'microcheck_task_log' AND policyname = 'Admins read'
  ) THEN
    CREATE POLICY "Admins read"
      ON microcheck_task_log FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;
