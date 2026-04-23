-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260423_dual_meets_rls.sql
--
-- Enables RLS on dual_meets and dual_meet_matches and adds public-read
-- policies so the anon key (used by browser clients) can SELECT from both
-- tables. Write access remains service-role only.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE dual_meets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dual_meet_matches    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON dual_meets
  FOR SELECT USING (true);

CREATE POLICY "public read" ON dual_meet_matches
  FOR SELECT USING (true);

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- BEGIN;
-- DROP POLICY IF EXISTS "public read" ON dual_meets;
-- DROP POLICY IF EXISTS "public read" ON dual_meet_matches;
-- ALTER TABLE dual_meets        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE dual_meet_matches DISABLE ROW LEVEL SECURITY;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
