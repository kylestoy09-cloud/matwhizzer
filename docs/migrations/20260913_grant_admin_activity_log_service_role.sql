-- Grant service_role read access to admin_activity_log
-- Required for the /admin/activity-log viewer page (queries via service role key)
GRANT SELECT ON TABLE public.admin_activity_log TO service_role;
