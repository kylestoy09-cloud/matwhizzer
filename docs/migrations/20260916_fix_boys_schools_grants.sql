-- Ensure PostgREST can access boys_schools and microcheck_task_log.
-- Tables created via raw SQL may not receive the automatic grants that
-- Supabase applies when creating tables through the dashboard UI.

-- boys_schools
GRANT SELECT ON TABLE public.boys_schools TO anon, authenticated, service_role;

-- microcheck_task_log (created in the microcheck schema migration)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.microcheck_task_log TO authenticated, service_role;
GRANT SELECT ON TABLE public.microcheck_task_log TO anon;

-- Sequence for microcheck_task_log (id is uuid/gen_random_uuid so no sequence needed,
-- but grant usage on all sequences in public just in case)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
