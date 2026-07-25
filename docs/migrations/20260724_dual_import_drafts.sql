-- MIGRATION: 20260724_dual_import_drafts.sql
--
-- Persists in-progress dual meet import sessions so they can be resumed
-- after signing out / switching devices.
--
-- Each row stores the raw pasted text + the school/wrestler override decisions
-- made so far. Resuming loads the text, re-runs school and wrestler matching,
-- then re-applies the saved overrides on top of the fresh match results.
--
-- Apply in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.dual_import_drafts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  label               text        NOT NULL DEFAULT '',
  raw_text            text        NOT NULL,
  school_overrides    jsonb       NOT NULL DEFAULT '{}',
  wrestler_overrides  jsonb       NOT NULL DEFAULT '{}',
  meet_count          int         NOT NULL DEFAULT 0,
  status              text        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'imported'))
);

CREATE INDEX IF NOT EXISTS dual_import_drafts_user_id_idx
  ON public.dual_import_drafts (user_id, updated_at DESC);

ALTER TABLE public.dual_import_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON public.dual_import_drafts
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dual_import_drafts TO authenticated;
GRANT ALL ON public.dual_import_drafts TO service_role;
