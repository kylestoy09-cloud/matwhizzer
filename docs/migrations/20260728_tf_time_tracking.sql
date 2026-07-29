-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260728_tf_time_tracking.sql
--
-- Add result_time_estimated to tournament_bouts.
--
-- Tech falls (and falls where time is missing/0:00) store 360 (6:00) in
-- fall_time_seconds as a default. result_time_estimated = true flags those rows
-- so queries can exclude or caveat them in time-based rankings.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.tournament_bouts
  ADD COLUMN IF NOT EXISTS result_time_estimated boolean NOT NULL DEFAULT false;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- BEGIN;
-- ALTER TABLE public.tournament_bouts DROP COLUMN IF EXISTS result_time_estimated;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
