-- Add merge tracking columns to inactive_school_seasons
-- merged_into_school_id: set when a school is inactive because it merged into another school
-- record_school_prev_name: School B's display_name before renaming, stored for unmerge restore
ALTER TABLE inactive_school_seasons
  ADD COLUMN IF NOT EXISTS merged_into_school_id integer REFERENCES schools(id),
  ADD COLUMN IF NOT EXISTS record_school_prev_name text;

-- Ensure service_role can read/write this table
GRANT ALL ON inactive_school_seasons TO service_role;

-- Add school_review step to season 3 preseason checklist
-- (run alongside 20260914_season3_preseason_checklist.sql or after it)
INSERT INTO preseason_checklist (season_id, step_key, status, completed_at)
VALUES (3, 'school_review', 'not_started', NULL)
ON CONFLICT DO NOTHING;
