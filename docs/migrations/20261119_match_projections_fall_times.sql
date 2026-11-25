-- docs/migrations/20261119_match_projections_fall_times.sql
--
-- Speed-band test (Kyle 2026-11-19): pins and techs ranked by how fast they are among their own kind (fastest 5%,
-- 5–10%, 10–25%, 25–50%, 50–75%, slowest 25%) instead of by the clock, where a 1:30 tech — top 5% of techs — ranked
-- below a 1:00 pin. Grading a projection on that scale needs each bout's time, so match_projections keeps it:
--   fall_time_seconds  the pin / tech time from the bout (null for decisions or no time on file)
--   time_estimated     the bout's time was estimated at import (left out of the speed bands)
-- Filled here for the bouts on file from their source rows (match_source → table: dual_meet → dual_meet_matches /
-- _girls, tournament_bout → tournament_bouts / _girls, postseason → matches, which has no estimate flag); new bouts
-- get them from src/lib/projectionTrack.ts. Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE match_projections ADD COLUMN IF NOT EXISTS fall_time_seconds int;
ALTER TABLE match_projections ADD COLUMN IF NOT EXISTS time_estimated boolean NOT NULL DEFAULT false;

UPDATE match_projections p SET fall_time_seconds = m.fall_time_seconds, time_estimated = coalesce(m.result_time_estimated, false)
FROM dual_meet_matches m WHERE p.gender = 'M' AND p.match_source = 'dual_meet' AND m.id::text = p.source_id;

UPDATE match_projections p SET fall_time_seconds = m.fall_time_seconds, time_estimated = coalesce(m.result_time_estimated, false)
FROM dual_meet_matches_girls m WHERE p.gender = 'F' AND p.match_source = 'dual_meet' AND m.id::text = p.source_id;

UPDATE match_projections p SET fall_time_seconds = b.fall_time_seconds, time_estimated = coalesce(b.result_time_estimated, false)
FROM tournament_bouts b WHERE p.gender = 'M' AND p.match_source = 'tournament_bout' AND b.id::text = p.source_id;

UPDATE match_projections p SET fall_time_seconds = b.fall_time_seconds, time_estimated = coalesce(b.result_time_estimated, false)
FROM tournament_bouts_girls b WHERE p.gender = 'F' AND p.match_source = 'tournament_bout' AND b.id::text = p.source_id;

UPDATE match_projections p SET fall_time_seconds = m.fall_time_seconds
FROM matches m WHERE p.match_source = 'postseason' AND m.id::text = p.source_id;

COMMIT;

-- Verify: pins and techs (actual_rank 1–12) with a time, by side
SELECT gender, count(*) AS pins_and_techs, count(fall_time_seconds) AS with_time, count(*) FILTER (WHERE time_estimated) AS estimated
FROM match_projections WHERE actual_rank <= 12 GROUP BY gender ORDER BY gender;
