-- Index the rating log's opponent column (2026-11-04)
--
-- wrestler_match_score_log.opponent_wrestler_id (about 204,000 rows) had no index, so every
-- lookup by opponent read the whole table: about 7 s per profile. Merges and the profile delete
-- tool check this column, and right after a ratings run those checks timed out (2026-11-04,
-- Manasquan merge). Partial index: most rows have an opponent, and the rest are never looked up.
-- CONCURRENTLY builds it without locking out the ratings run. Run this statement on its own (it
-- can't run inside a transaction block).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wrestler_match_score_log_opponent
  ON public.wrestler_match_score_log (opponent_wrestler_id)
  WHERE opponent_wrestler_id IS NOT NULL;

-- ROLLBACK: DROP INDEX CONCURRENTLY IF EXISTS public.idx_wrestler_match_score_log_opponent;
