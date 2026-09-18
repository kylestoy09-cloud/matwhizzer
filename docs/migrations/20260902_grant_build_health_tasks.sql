-- Grant table-level permissions to the roles Supabase uses.
-- RLS policies alone are not enough; the role also needs a GRANT on the table.
GRANT SELECT, INSERT, DELETE ON admin_build_health_tasks TO authenticated;
GRANT SELECT, INSERT, DELETE ON admin_build_health_tasks TO anon;
