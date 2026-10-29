-- docs/migrations/20261029_match_score_log_date_index.sql
--
-- Daily snapshot reports read one day of the hammer match log
-- (season, gender, match_source, match_date). With only (season, gender)
-- indexed, that read scanned the whole season (~138k boys rows) and hit the
-- statement timeout on busy days (found 2026-10-29 rebuilding boys 2025-26
-- snapshots: 2026-02-14 timed out after 9.4 s).

CREATE INDEX IF NOT EXISTS idx_wrestler_match_score_log_day
  ON wrestler_match_score_log (season, gender, match_source, match_date);

ANALYZE wrestler_match_score_log;

-- Verify: expect an Index Scan / Bitmap Index Scan on idx_wrestler_match_score_log_day
EXPLAIN SELECT wrestler_id FROM wrestler_match_score_log
WHERE season = '2025-26' AND gender = 'M' AND match_source = 'dual_meet' AND match_date = '2026-02-14';

-- ROLLBACK: DROP INDEX IF EXISTS idx_wrestler_match_score_log_day;
