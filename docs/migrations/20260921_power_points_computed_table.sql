-- docs/migrations/20260921_power_points_computed_table.sql
--
-- Hide our computed Power Points until the formula matches NJSIAA.
--
-- power_points becomes OFFICIAL figures only (pasted/imported once NJSIAA
-- releases them). Everything the site shows publicly reads power_points, so
-- nothing computed can leak.
--
-- power_points_computed holds scripts/compute_power_points.mts output, admin
-- only, so we can track it against official figures while tuning the formula.
--
-- Every current power_points row was computed (all 314 boys 2025-26 rows
-- written 2026-08-09 by the compute script; none frozen, no official import
-- yet). They move to the new table. Public Power Points are empty until
-- official figures are imported, by design.

-- ── DRY RUN (read-only) ─────────────────────────────────────────────────────
SELECT season_id, gender, COUNT(*) AS rows,
       COUNT(frozen_power_points) AS frozen,
       MIN(created_at)::date AS first_written, MAX(created_at)::date AS last_written
FROM power_points
GROUP BY 1, 2;

CREATE TABLE IF NOT EXISTS power_points_computed (
  id             SERIAL PRIMARY KEY,
  school_id      INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id      INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  gender         TEXT    NOT NULL CHECK (gender IN ('M', 'F')),
  power_points   NUMERIC(6,2) NOT NULL,
  overall_wins   INTEGER NOT NULL DEFAULT 0,
  overall_losses INTEGER NOT NULL DEFAULT 0,
  meets_counted  INTEGER,
  cutoff_date    DATE,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, season_id, gender)
);

-- Admin only: no anon/authenticated access; the compute script and admin API
-- routes use the service role.
ALTER TABLE power_points_computed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON power_points_computed FROM anon, authenticated;
GRANT ALL ON power_points_computed TO postgres, service_role;
GRANT USAGE, SELECT ON SEQUENCE power_points_computed_id_seq TO service_role;

DO $$
DECLARE
  n_moved integer;
BEGIN
  -- Guard: only move if nothing is frozen (a frozen row is a playoff lock,
  -- not a computed value, and must not be moved silently).
  IF EXISTS (SELECT 1 FROM power_points WHERE frozen_power_points IS NOT NULL) THEN
    RAISE EXCEPTION 'power_points has frozen rows; resolve before moving computed values';
  END IF;

  INSERT INTO power_points_computed
    (school_id, season_id, gender, power_points, overall_wins, overall_losses, meets_counted, cutoff_date, computed_at)
  SELECT school_id, season_id, gender, power_points, overall_wins, overall_losses, meets_counted,
         '2026-02-08'::date, created_at
  FROM power_points
  WHERE created_at < '2026-09-21'   -- rows written before official import existed
  ON CONFLICT (school_id, season_id, gender) DO NOTHING;
  GET DIAGNOSTICS n_moved = ROW_COUNT;

  DELETE FROM power_points WHERE created_at < '2026-09-21';
  RAISE NOTICE 'Moved % computed rows to power_points_computed', n_moved;
END $$;

-- Verify: expect power_points empty (until official import) and 314 computed rows
SELECT 'power_points' AS t, COUNT(*) FROM power_points
UNION ALL
SELECT 'power_points_computed', COUNT(*) FROM power_points_computed;

-- ROLLBACK:
-- INSERT INTO power_points (school_id, season_id, gender, power_points, overall_wins, overall_losses, meets_counted, created_at)
--   SELECT school_id, season_id, gender, power_points, overall_wins, overall_losses, meets_counted, computed_at
--   FROM power_points_computed ON CONFLICT (school_id, season_id, gender) DO NOTHING;
-- DROP TABLE power_points_computed;
