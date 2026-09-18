-- docs/migrations/20260918_microcheck_task_priority.sql
-- Stores the admin-configurable priority order for microcheck task types.

CREATE TABLE IF NOT EXISTS microcheck_task_priority (
  task_type  text    PRIMARY KEY,
  label      text    NOT NULL,
  sort_order int     NOT NULL DEFAULT 0,
  enabled    boolean NOT NULL DEFAULT true
);

INSERT INTO microcheck_task_priority (task_type, label, sort_order, enabled) VALUES
  ('school_profile', 'School Profile', 1, true),
  ('tie_resolution', 'Tie Resolution', 2, true)
ON CONFLICT (task_type) DO NOTHING;
