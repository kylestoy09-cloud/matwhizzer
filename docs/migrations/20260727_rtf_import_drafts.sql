-- RTF import drafts: save/resume progress for the admin RTF tournament import pipeline.
-- Stores raw text, school overrides, reviewed data, and current step so users can
-- close the browser and resume without re-running the 30-40s matching step.

CREATE TABLE IF NOT EXISTS rtf_import_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           TEXT NOT NULL DEFAULT '',
  text            TEXT NOT NULL,
  year            INT  NOT NULL,
  selected        JSONB NOT NULL DEFAULT '[]',
  school_overrides JSONB NOT NULL DEFAULT '{}',
  dates           JSONB NOT NULL DEFAULT '{}',
  reviewed        JSONB NOT NULL DEFAULT '[]',
  step            TEXT NOT NULL DEFAULT 'input',
  tournament_count INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'imported')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only the owning user can see their drafts
ALTER TABLE rtf_import_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rtf_import_drafts_owner" ON rtf_import_drafts
  USING (user_id = auth.uid());

GRANT ALL ON rtf_import_drafts TO service_role;
