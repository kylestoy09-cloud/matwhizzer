-- docs/migrations/20260918_grant_microcheck_task_priority.sql
-- Grants access to microcheck_task_priority for all Supabase roles.

GRANT ALL ON public.microcheck_task_priority TO postgres, service_role, authenticated, anon;

-- Seed rows while we're here (no-op if already present)
INSERT INTO public.microcheck_task_priority (task_type, label, sort_order, enabled) VALUES
  ('school_profile', 'School Profile', 1, true),
  ('tie_resolution',  'Tie Resolution',  2, true)
ON CONFLICT (task_type) DO NOTHING;
