-- Season configuration: date ranges that drive dashboard auto-switching
CREATE TABLE IF NOT EXISTS admin_season_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_label    text    NOT NULL,          -- e.g. '2026-27'
  preseason_start date    NOT NULL,          -- Oct 1 (consistent every year)
  season_start    date    NOT NULL,          -- Dec 7, 2026
  postseason_start date   NOT NULL,          -- Jan 25, 2027
  season_end      date    NOT NULL,          -- Feb 7, 2027 (regular season ends)
  postseason_end  date    NOT NULL,          -- Mar 15, 2027
  is_current      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Only one current season at a time
CREATE UNIQUE INDEX IF NOT EXISTS admin_season_config_current_idx
  ON admin_season_config (is_current) WHERE is_current = true;

ALTER TABLE admin_season_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON admin_season_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON admin_season_config TO authenticated, anon;

-- Seed 2026-27 season
INSERT INTO admin_season_config
  (season_label, preseason_start, season_start, postseason_start, season_end, postseason_end, is_current)
VALUES
  ('2026-27', '2026-10-01', '2026-12-07', '2027-01-25', '2027-02-07', '2027-03-15', true);


-- Tasks: freestyle (ad-hoc) + process (predefined step completion state)
CREATE TABLE IF NOT EXISTS admin_tasks (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard      text    NOT NULL CHECK (dashboard IN ('preseason','season','postseason','offseason')),
  group_type     text    NOT NULL DEFAULT 'freestyle' CHECK (group_type IN ('freestyle','process')),
  process_key    text,                    -- unique key for predefined steps; null for freestyle
  title          text    NOT NULL,
  description    text,
  workspace_tool text,                    -- key into tool registry; null = navigate to href
  workspace_href text,                    -- fallback: open this URL in workspace
  due_date       date,
  order_index    integer NOT NULL DEFAULT 0,
  completed_at   timestamptz,
  completed_by   text,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-dashboard queries
CREATE INDEX IF NOT EXISTS admin_tasks_dashboard_idx ON admin_tasks (dashboard, group_type, order_index);
-- Unique process keys per dashboard
CREATE UNIQUE INDEX IF NOT EXISTS admin_tasks_process_key_idx
  ON admin_tasks (dashboard, process_key) WHERE process_key IS NOT NULL;

ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON admin_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON admin_tasks TO authenticated, anon;

-- Seed the preseason process tasks (completion state tracked here)
INSERT INTO admin_tasks (dashboard, group_type, process_key, title, description, workspace_tool, order_index)
VALUES
  ('preseason', 'process', 'roster_rollover',   'Roll Over Roster',              'Advance wrestler grades and archive prior season', 'roster_rollover',   1),
  ('preseason', 'process', 'transfers',          'Complete Transfers',            'Process incoming and outgoing wrestler transfers',  'transfers',          2),
  ('preseason', 'process', 'tournament_rollover','Roll Over Tournaments',         'Set up tournament hub entries for this season',     'tournament_rollover',3),
  ('preseason', 'process', 'coaches_import',     'Import Coaches, ADs & Contact', 'Bulk import coaching staff and contact info',       'coaches_import',     4),
  ('preseason', 'process', 'schedule_import',    'Import Schedules',              'Stage 1: load + confirm, Stage 2: master merge',   'schedule_import',    5)
ON CONFLICT (dashboard, process_key) WHERE process_key IS NOT NULL DO NOTHING;
