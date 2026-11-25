-- docs/migrations/20261111_girls_dual_status.sql
--
-- Girls dual-meet status (2026-27 Girls Team Tournament Regulations, new this season): each school declares on
-- or before December 15 whether it wrestles dual meets. Declared schools have team status: they are classified,
-- every regular-season event they wrestle counts as a dual meet in Power Points, and forfeits can be taken only
-- between two declared teams. One row per school and season, set in the girls school directory (Dual Status);
-- no row = not recorded yet. Girls only: the boys have no declaration.
-- Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS girls_dual_status (
  school_id   integer     NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id   integer     NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  declared    boolean     NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, season_id)
);

ALTER TABLE girls_dual_status ENABLE ROW LEVEL SECURITY;
GRANT ALL ON girls_dual_status TO service_role;
GRANT SELECT ON girls_dual_status TO anon, authenticated;
DROP POLICY IF EXISTS girls_dual_status_read ON girls_dual_status;
CREATE POLICY girls_dual_status_read ON girls_dual_status FOR SELECT USING (true);

COMMIT;

-- Verify: the table exists and is empty; anon can read it
SELECT count(*) FROM girls_dual_status;
SET ROLE anon; SELECT count(*) FROM girls_dual_status; RESET ROLE;

-- ROLLBACK: DROP TABLE girls_dual_status;
