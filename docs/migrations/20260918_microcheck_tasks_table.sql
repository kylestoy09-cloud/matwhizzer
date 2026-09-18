-- docs/migrations/20260918_microcheck_tasks_table.sql
--
-- Generic task queue for the microcheck tool.
-- Supports any task type (tie_resolution, site_error, etc.)
-- School-profile tasks continue to use the existing microcheck_task_log
-- (computed on-the-fly from missing school data). This table handles
-- task types that need an explicit queue entry.

CREATE TABLE microcheck_tasks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type    text        NOT NULL,   -- 'tie_resolution' | 'site_error' | ...
  entity_id    text        NOT NULL,   -- uuid or integer as text
  gender       text        NOT NULL CHECK (gender IN ('M', 'F')),
  metadata     jsonb       NOT NULL DEFAULT '{}',
  priority     integer     NOT NULL DEFAULT 0,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completed_by uuid,
  UNIQUE (task_type, entity_id, gender)
);

CREATE INDEX idx_microcheck_tasks_pending ON microcheck_tasks (status, priority DESC, created_at)
  WHERE status = 'pending';

ALTER TABLE microcheck_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on microcheck_tasks"
  ON microcheck_tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'));

-- ── Seed tie_resolution tasks from existing tied boys dual meets ───────────────
INSERT INTO microcheck_tasks (task_type, entity_id, gender, metadata, priority)
SELECT
  'tie_resolution',
  dm.id::text,
  'M',
  jsonb_build_object(
    'team1_school_id', dm.team1_school_id,
    'team2_school_id', dm.team2_school_id,
    'team1_name',      s1.display_name,
    'team2_name',      s2.display_name,
    'score',           dm.team1_score,
    'meet_date',       dm.meet_date::text,
    'season_id',       dm.season_id,
    'table',           'dual_meets'
  ),
  10
FROM dual_meets dm
JOIN schools s1 ON s1.id = dm.team1_school_id
JOIN schools s2 ON s2.id = dm.team2_school_id
WHERE dm.team1_score IS NOT NULL
  AND dm.team2_score IS NOT NULL
  AND dm.team1_score = dm.team2_score
ON CONFLICT DO NOTHING;

-- ── Seed tie_resolution tasks from existing tied girls dual meets ──────────────
INSERT INTO microcheck_tasks (task_type, entity_id, gender, metadata, priority)
SELECT
  'tie_resolution',
  dm.id::text,
  'F',
  jsonb_build_object(
    'team1_school_id', dm.team1_school_id,
    'team2_school_id', dm.team2_school_id,
    'team1_name',      s1.display_name,
    'team2_name',      s2.display_name,
    'score',           dm.team1_score,
    'meet_date',       dm.meet_date::text,
    'season_id',       dm.season_id,
    'table',           'dual_meets_girls'
  ),
  10
FROM dual_meets_girls dm
JOIN schools s1 ON s1.id = dm.team1_school_id
JOIN schools s2 ON s2.id = dm.team2_school_id
WHERE dm.team1_score IS NOT NULL
  AND dm.team2_score IS NOT NULL
  AND dm.team1_score = dm.team2_score
ON CONFLICT DO NOTHING;

-- Verify
SELECT task_type, gender, COUNT(*) FROM microcheck_tasks GROUP BY task_type, gender ORDER BY task_type, gender;
