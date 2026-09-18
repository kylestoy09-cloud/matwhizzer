-- Fix: replace wrong individual postseason step_keys.
-- The original migration seeded: district_brackets_set, region_seeds_forecasted, results_imported.
-- Correct individual flow: district_seeds_forecasted → district_seeds_set → results_imported.
--
-- NOT APPLIED — Paul reviews and runs manually in the Supabase SQL editor.

-- Remove the two wrong individual step_keys from all seasons
DELETE FROM postseason_checklist
WHERE side = 'individual'
  AND step_key IN ('district_brackets_set', 'region_seeds_forecasted');

-- Insert the correct ones (results_imported already exists; ON CONFLICT skips it)
INSERT INTO postseason_checklist (season_id, side, step_key, status)
SELECT s.id, k.side, k.step_key, 'not_started'
FROM seasons s
CROSS JOIN (VALUES
  ('individual', 'district_seeds_forecasted'),
  ('individual', 'district_seeds_set'),
  ('individual', 'results_imported')
) AS k(side, step_key)
ON CONFLICT (season_id, side, step_key) DO NOTHING;
