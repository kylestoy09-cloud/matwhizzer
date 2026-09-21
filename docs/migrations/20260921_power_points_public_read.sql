-- docs/migrations/20260921_power_points_public_read.sql
--
-- Let the public site read official Power Points.
--
-- 20260806_power_points_table.sql created a public SELECT policy on
-- power_points but never granted SELECT to the anon/authenticated roles, so
-- every public read failed with "permission denied for table power_points".
-- The group pages (and src/lib/standings.ts) read it with the public key, so
-- they have never shown Power Points.
--
-- power_points now holds only official, released figures (computed values
-- live in the admin-only power_points_computed), so public read is intended.
-- Writes stay admin-only (service role).

GRANT SELECT ON power_points TO anon, authenticated;

-- Verify: the policy exists and the grant is in place
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'power_points';
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_name = 'power_points' AND grantee IN ('anon', 'authenticated') ORDER BY 1, 2;

-- ROLLBACK:
-- REVOKE SELECT ON power_points FROM anon, authenticated;
