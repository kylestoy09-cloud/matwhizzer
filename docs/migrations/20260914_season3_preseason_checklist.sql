-- Grant service_role access to the preseason_checklist sequence
-- (needed so the app can insert rows via service role client)
GRANT USAGE, SELECT ON SEQUENCE preseason_checklist_id_seq TO service_role;

-- Seed season 3 (2026-27) preseason checklist steps
INSERT INTO preseason_checklist (season_id, step_key, status, completed_at)
VALUES
  (3, 'alignment',           'not_started', NULL),
  (3, 'coaches',             'not_started', NULL),
  (3, 'roster_rollover',     'not_started', NULL),
  (3, 'schedule_import',     'not_started', NULL),
  (3, 'school_list',         'not_started', NULL),
  (3, 'tournament_rollover', 'not_started', NULL),
  (3, 'rankings_setup',      'not_started', NULL)
ON CONFLICT DO NOTHING;
