-- docs/migrations/20261112_drop_preseason_completion.sql
--
-- preseason_completion (created earlier today by 20261112_preseason_streaming_and_completion.sql) duplicated
-- the preseason dashboard's existing "Complete Transfers" task (admin_tasks, one per gender). The dashboard's
-- Transfers % now reads that task, so the table is unused. It was never written to (verify returned 0 rows).
-- The streaming link tables from the same migration stay.
-- Run in the Supabase SQL editor.

BEGIN;
DO $$
BEGIN
  IF (SELECT count(*) FROM preseason_completion) > 0 THEN
    RAISE EXCEPTION 'preseason_completion has rows; stop and check before dropping';
  END IF;
END $$;
DROP TABLE preseason_completion;
COMMIT;

-- Verify: should return 0 rows
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preseason_completion';

-- ROLLBACK: re-run the preseason_completion part of 20261112_preseason_streaming_and_completion.sql
