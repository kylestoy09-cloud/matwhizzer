-- Admin Build Health: tasks per section, visible to all, deleted on completion
CREATE TABLE IF NOT EXISTS admin_build_health_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section     text NOT NULL,          -- e.g. "dashboards", "profiles", "tools"
  description text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- No RLS — admin-only area, all authenticated users can read/write/delete
ALTER TABLE admin_build_health_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage build health tasks"
  ON admin_build_health_tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
