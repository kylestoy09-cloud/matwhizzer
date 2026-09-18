-- docs/migrations/20260918_rename_microdose_to_microcheck.sql
-- Renames all microdose_* tables to microcheck_* in the database.

ALTER TABLE IF EXISTS microdose_task_log      RENAME TO microcheck_task_log;
ALTER TABLE IF EXISTS microdose_roster_flags  RENAME TO microcheck_roster_flags;
-- microdose_tasks was never applied — the new microcheck_tasks table is
-- created by 20260918_microcheck_tasks_table.sql with the correct name.

-- Update the index names to match
ALTER INDEX IF EXISTS mtl_admin_idx  RENAME TO mck_admin_idx;
ALTER INDEX IF EXISTS mtl_status_idx RENAME TO mck_status_idx;

-- Verify
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'microcheck%'
ORDER BY tablename;
