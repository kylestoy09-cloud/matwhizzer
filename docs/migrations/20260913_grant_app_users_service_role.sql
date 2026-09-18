-- Grant full read/write on app_users to service_role so admin API routes can read and manage users
GRANT SELECT, INSERT, UPDATE ON TABLE public.app_users TO service_role;
