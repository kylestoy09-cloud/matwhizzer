-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260728_bout_scores.sql
--
-- Add winner_score and loser_score to tournament_bouts.
--
-- For Dec, MD, and TF: parsed from the score string (e.g. "5-2" → 5, 2).
-- For Fall: both NULL (score is irrelevant; fall_time_seconds is the stat).
-- For Forfeit/DFF/BYE: both NULL.
--
-- Enables direct SQL ranking by margin, total points, average margin, etc.
-- without string-splitting at query time.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.tournament_bouts
  ADD COLUMN IF NOT EXISTS winner_score smallint,
  ADD COLUMN IF NOT EXISTS loser_score  smallint;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- BEGIN;
-- ALTER TABLE public.tournament_bouts
--   DROP COLUMN IF EXISTS winner_score,
--   DROP COLUMN IF EXISTS loser_score;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
