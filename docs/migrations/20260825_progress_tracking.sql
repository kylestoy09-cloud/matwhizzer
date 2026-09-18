-- Season progress tracking: preseason and postseason checklists.
-- Season progress is computed dynamically from live data (no stored table).
--
-- IMPORTANT: The postseason_checklist individual step_keys in the original seed
-- were wrong. Run 20260825_postseason_checklist_fix.sql after this one.
--
-- NOT APPLIED — Paul reviews and runs manually in the Supabase SQL editor.
-- Apply AFTER 20260825_seasons_lifecycle.sql.

-- ── preseason_checklist ───────────────────────────────────────────────────────
-- One row per (season, step). Seeded at season creation time (wired in Step 5).

CREATE TABLE IF NOT EXISTS preseason_checklist (
  id           serial      PRIMARY KEY,
  season_id    integer     NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  step_key     text        NOT NULL,
  status       text        NOT NULL DEFAULT 'not_started'
                           CHECK (status IN ('not_started', 'in_progress', 'complete')),
  completed_at timestamptz,
  UNIQUE (season_id, step_key)
);

CREATE INDEX IF NOT EXISTS preseason_checklist_season_idx
  ON preseason_checklist (season_id);

ALTER TABLE preseason_checklist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'preseason_checklist' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON preseason_checklist FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON preseason_checklist TO anon, authenticated;
GRANT ALL    ON preseason_checklist TO service_role;

-- Backfill: seed both existing seasons with all step_keys at 'not_started'.
-- New seasons will be seeded by the Finalize Season action (Step 5).
INSERT INTO preseason_checklist (season_id, step_key, status)
SELECT s.id, k.step_key, 'not_started'
FROM seasons s
CROSS JOIN (VALUES
  ('alignment'),
  ('coaches'),
  ('roster_rollover'),
  ('schedule_import'),
  ('school_list'),
  ('tournament_rollover'),
  ('rankings_setup')
) AS k(step_key)
WHERE s.id IN (1, 2)
ON CONFLICT (season_id, step_key) DO NOTHING;


-- ── postseason_checklist ──────────────────────────────────────────────────────
-- Parallel checklists for team and individual postseason tracks.
-- Step_keys below are a PROPOSED starting set — confirm with Paul before applying.

CREATE TABLE IF NOT EXISTS postseason_checklist (
  id           serial      PRIMARY KEY,
  season_id    integer     NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  side         text        NOT NULL CHECK (side IN ('team', 'individual')),
  step_key     text        NOT NULL,
  status       text        NOT NULL DEFAULT 'not_started'
                           CHECK (status IN ('not_started', 'in_progress', 'complete')),
  completed_at timestamptz,
  UNIQUE (season_id, side, step_key)
);

CREATE INDEX IF NOT EXISTS postseason_checklist_season_idx
  ON postseason_checklist (season_id);
CREATE INDEX IF NOT EXISTS postseason_checklist_side_idx
  ON postseason_checklist (season_id, side);

ALTER TABLE postseason_checklist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'postseason_checklist' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON postseason_checklist FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON postseason_checklist TO anon, authenticated;
GRANT ALL    ON postseason_checklist TO service_role;

-- Backfill both existing seasons.
-- NOTE: individual step_keys below were wrong as originally applied.
-- Run 20260825_postseason_checklist_fix.sql to correct them.
-- Correct individual flow: district_seeds_forecasted → district_seeds_set → results_imported
INSERT INTO postseason_checklist (season_id, side, step_key, status)
SELECT s.id, k.side, k.step_key, 'not_started'
FROM seasons s
CROSS JOIN (VALUES
  ('team',       'seeds_set'),
  ('team',       'results_imported'),
  ('team',       'finalized'),
  ('individual', 'district_seeds_forecasted'),
  ('individual', 'district_seeds_set'),
  ('individual', 'results_imported')
) AS k(side, step_key)
WHERE s.id IN (1, 2)
ON CONFLICT (season_id, side, step_key) DO NOTHING;
