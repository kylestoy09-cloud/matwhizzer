-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260728_dual_meet_matches_backfill_scores.sql
--
-- Backfills winner_score, loser_score, fall_time_seconds, and
-- result_time_estimated for all existing dual_meet_matches rows.
--
-- Run AFTER 20260728_dual_meet_matches_scores.sql (column must exist first).
--
-- Source data already stored in result_detail:
--   Dec / MD : "9-7"
--   TF       : "3:15 17-1" or "3:15 (17-1)" or "17-1" (no time)
--   Fall     : "1:34" (already in fall_time_seconds for most rows)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Dec and MD: parse "W-L" score string ──────────────────────────────────

UPDATE public.dual_meet_matches
SET
  winner_score = split_part(result_detail, '-', 1)::smallint,
  loser_score  = split_part(result_detail, '-', 2)::smallint
WHERE result_type IN ('Dec', 'MD')
  AND result_detail ~ '^\d+-\d+$';

-- ── 2. TF: extract time → fall_time_seconds; score → winner/loser_score ──────
-- Detail format variations:
--   "3:15 17-1"      time + score (space-separated)
--   "3:15 (17-1)"    time + score (score in parens)
--   "17-1"           score only (no time captured)
--   NULL             nothing captured

-- 2a. Rows where a valid non-zero time is present at the start of result_detail
UPDATE public.dual_meet_matches
SET
  fall_time_seconds     = (split_part(result_detail, ':', 1)::int * 60)
                          + (substring(result_detail from '^\d+:(\d{2})')::int),
  result_time_estimated = false,
  winner_score          = (regexp_match(result_detail, '(\d+)-(\d+)'))[1]::smallint,
  loser_score           = (regexp_match(result_detail, '(\d+)-(\d+)'))[2]::smallint
WHERE result_type = 'TF'
  AND result_detail ~ '^\d+:[0-9]{2}'
  AND NOT result_detail ~ '^0:00';

-- 2b. Rows with 0:00 time or no time at all → default to 6:00, mark estimated
UPDATE public.dual_meet_matches
SET
  fall_time_seconds     = 360,
  result_time_estimated = true,
  winner_score          = (regexp_match(result_detail, '(\d+)-(\d+)'))[1]::smallint,
  loser_score           = (regexp_match(result_detail, '(\d+)-(\d+)'))[2]::smallint
WHERE result_type = 'TF'
  AND (
    result_detail IS NULL
    OR result_detail ~ '^0:00'
    OR result_detail !~ '^\d+:\d{2}'
  );

-- ── 3. Fall: mark 0-second or missing times as estimated ─────────────────────
-- Most Fall rows already have fall_time_seconds from the original import.
-- Rows where it was 0 or NULL get defaulted to 6:00 and flagged.

UPDATE public.dual_meet_matches
SET
  fall_time_seconds     = 360,
  result_time_estimated = true
WHERE result_type = 'Fall'
  AND (fall_time_seconds IS NULL OR fall_time_seconds = 0);

COMMIT;
