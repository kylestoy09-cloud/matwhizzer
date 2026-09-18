-- Allow authenticated users to read their own app_users row.
-- Needed so the public site header can check if the current user has admin role
-- to conditionally show the Admin Panel link in the user dropdown.
-- Service role (used by admin API routes) bypasses RLS by default.
-- APPLIED: 2026-09-16

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own app_users row"
  ON public.app_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
