-- docs/migrations/20261114_playoff_history_people.sql
--
-- Playoff History, part 3: who is who (Kyle 2026-11-13). Same name + same school in back-to-back seasons joins
-- automatically (his rule); a history wrestler with exactly one existing profile of the same name that wrestled at the
-- same school, class year fitting, links to it automatically. Everything else that may be the same wrestler — a name
-- variant at the same school (Tom / Thomas Flannigan), a transfer (same name, other school), an existing profile at
-- another school — waits in the review tool's Same wrestler tab.
--   * playoff_history_joins: the candidate's other side can be an existing profile (b_wrestler_id), with the context
--     Kyle needs to decide (seasons, schools, weights, places) in context
--   * playoff_history_profiles: every profile the import made or linked, so a load can be undone cleanly
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE playoff_history_joins ADD COLUMN IF NOT EXISTS b_wrestler_id uuid REFERENCES wrestlers(id) ON DELETE CASCADE;
ALTER TABLE playoff_history_joins ADD COLUMN IF NOT EXISTS a_school integer REFERENCES schools(id);
ALTER TABLE playoff_history_joins ADD COLUMN IF NOT EXISTS b_school integer REFERENCES schools(id);
ALTER TABLE playoff_history_joins ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE playoff_history_joins DROP CONSTRAINT IF EXISTS playoff_history_joins_reason_check;

CREATE TABLE IF NOT EXISTS playoff_history_profiles (
  wrestler_id uuid        PRIMARY KEY REFERENCES wrestlers(id) ON DELETE CASCADE,
  gender      char(1)     NOT NULL CHECK (gender IN ('M', 'F')),
  created     boolean     NOT NULL,          -- true = the import made it; false = an existing profile it linked to
  first_season integer,
  last_season  integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE playoff_history_profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON playoff_history_profiles TO service_role;

COMMIT;

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'playoff_history_joins' AND column_name IN ('b_wrestler_id', 'a_school', 'b_school', 'context') ORDER BY 1;
-- expect a_school, b_school, b_wrestler_id, context
