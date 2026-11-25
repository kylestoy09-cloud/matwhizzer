-- docs/migrations/20261111_snapshot_season_reports.sql
--
-- End-of-season Snap Shot (Kyle 2026-11-11): the Snap Shot page's End of Season tab saves one report per
-- season, per program (built by src/lib/snapshot/seasonReport.ts: totals, NJSIAA vs non-NJSIAA, the season's
-- bests from the daily reports, and the postseason). One table per program, like snapshot_reports /
-- snapshot_reports_girls. Admin only (service role).
-- Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS snapshot_season_reports (
  season       text        PRIMARY KEY,
  payload      jsonb       NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS snapshot_season_reports_girls (
  season       text        PRIMARY KEY,
  payload      jsonb       NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE snapshot_season_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_season_reports_girls ENABLE ROW LEVEL SECURITY;
GRANT ALL ON snapshot_season_reports, snapshot_season_reports_girls TO service_role;

COMMIT;

-- Verify: both tables exist and are empty
SELECT (SELECT count(*) FROM snapshot_season_reports) AS boys, (SELECT count(*) FROM snapshot_season_reports_girls) AS girls;

-- ROLLBACK: DROP TABLE snapshot_season_reports, snapshot_season_reports_girls;
