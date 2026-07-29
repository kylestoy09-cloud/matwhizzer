-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260728_dual_meet_matches_scores.sql
--
-- Add the same stat columns to dual_meet_matches that were added to
-- tournament_bouts in 20260728_tf_time_tracking.sql and
-- 20260728_bout_scores.sql.
--
-- result_time_estimated: true when fall_time_seconds is a 6:00 default
--   (missing or 0:00 in source) rather than an actual captured time.
-- winner_score / loser_score: parsed from result_detail score strings
--   (e.g. "9-7" → 9, 7) for Dec, MD, TF. NULL for Fall, Forfeit, DFF.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.dual_meet_matches
  ADD COLUMN IF NOT EXISTS result_time_estimated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS winner_score          smallint,
  ADD COLUMN IF NOT EXISTS loser_score           smallint;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- BEGIN;
-- ALTER TABLE public.dual_meet_matches
--   DROP COLUMN IF EXISTS result_time_estimated,
--   DROP COLUMN IF EXISTS winner_score,
--   DROP COLUMN IF EXISTS loser_score;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
