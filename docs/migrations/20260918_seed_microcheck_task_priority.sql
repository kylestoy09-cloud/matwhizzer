-- docs/migrations/20260918_seed_microcheck_task_priority.sql
-- Seeds the microcheck_task_priority table with the two known task types.
-- Safe to re-run — ON CONFLICT DO NOTHING is a no-op if rows already exist.

INSERT INTO microcheck_task_priority (task_type, label, sort_order, enabled) VALUES
  ('school_profile', 'School Profile', 1, true),
  ('tie_resolution',  'Tie Resolution',  2, true)
ON CONFLICT (task_type) DO NOTHING;
