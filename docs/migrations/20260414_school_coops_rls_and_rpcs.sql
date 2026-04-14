-- MIGRATION: 20260414_school_coops_rls_and_rpcs.sql
-- DESCRIPTION: Enable RLS + public read policy on school_coops table (created in
--              20260414_create_school_coops.sql without policies), then create two
--              helper functions for the co-op school page feature:
--                - get_coop_membership(p_school_id) — is this school a co-op member?
--                - get_coop_members(p_coop_school_id) — who are the members of this co-op?
-- APPLIED: 2026-04-14
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT COUNT(*) FROM school_coops; -- expect 10
-- SELECT * FROM school_coops LIMIT 3;
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── RLS on school_coops ───────────────────────────────────────────────────────

ALTER TABLE school_coops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read school_coops"
  ON school_coops
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON school_coops TO anon, authenticated;

-- ── get_coop_membership ───────────────────────────────────────────────────────
-- Returns all co-op programs a given school belongs to as a member.
-- Used on member school pages to detect and display the co-op banner.
--
-- Example: get_coop_membership(55)  → [{coop_school_id: 379, coop_name: 'Lodi/Saddle Brook', season: 2, gender: 'B', is_primary: true}]

CREATE OR REPLACE FUNCTION get_coop_membership(p_school_id integer)
RETURNS TABLE (
  coop_school_id  integer,
  coop_name       text,
  season          integer,
  gender          text,
  is_primary      boolean
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    sc.coop_school_id,
    s.display_name AS coop_name,
    sc.season,
    sc.gender,
    sc.is_primary
  FROM school_coops sc
  JOIN schools s ON s.id = sc.coop_school_id
  WHERE sc.member_school_id = p_school_id
  ORDER BY sc.season DESC, sc.gender;
$$;

-- ── get_coop_members ──────────────────────────────────────────────────────────
-- Returns all member schools for a given co-op school.
-- Used on co-op school pages to display the member schools panel.
--
-- Example: get_coop_members(379) → [{member_school_id: 55, member_name: 'Lodi', is_primary: true, ...},
--                                    {member_school_id: 59, member_name: 'Saddle Brook', is_primary: false, ...}]

CREATE OR REPLACE FUNCTION get_coop_members(p_coop_school_id integer)
RETURNS TABLE (
  member_school_id  integer,
  member_name       text,
  is_primary        boolean,
  season            integer,
  gender            text
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    sc.member_school_id,
    s.display_name AS member_name,
    sc.is_primary,
    sc.season,
    sc.gender
  FROM school_coops sc
  JOIN schools s ON s.id = sc.member_school_id
  WHERE sc.coop_school_id = p_coop_school_id
  ORDER BY sc.is_primary DESC, s.display_name;
$$;

-- Verify
SELECT proname FROM pg_proc WHERE proname IN ('get_coop_membership', 'get_coop_members'); -- expect 2 rows
SELECT COUNT(*) FROM school_coops; -- expect 10

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_coop_membership(integer);
-- DROP FUNCTION IF EXISTS get_coop_members(integer);
-- REVOKE SELECT ON school_coops FROM anon, authenticated;
-- DROP POLICY IF EXISTS "public read school_coops" ON school_coops;
-- ALTER TABLE school_coops DISABLE ROW LEVEL SECURITY;
-- COMMIT;
