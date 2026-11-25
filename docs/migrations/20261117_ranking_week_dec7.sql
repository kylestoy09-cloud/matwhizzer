-- docs/migrations/20261117_ranking_week_dec7.sql
--
-- Whiz Rank (Kyle 2026-11-17): the first rankings go out Monday 12/7/2026, not 12/14. Adds a week for 12/6 (published
-- Monday 12/7 8 AM Eastern) for each side and renumbers the rest 2–10; the 1–9 week cap becomes 1–20. No rankings
-- are saved yet (individual_rankings, individual_ranking_completion empty for 2026-27), so nothing points at the
-- renumbered weeks. Run in the Supabase SQL editor.

BEGIN;

-- the cap comes off for the renumbering and goes back on (1–20) once every week number is final
ALTER TABLE individual_ranking_weeks DROP CONSTRAINT IF EXISTS individual_ranking_weeks_week_number_check;

-- two steps so the (season_id, week_number, gender) unique key never collides mid-update
UPDATE individual_ranking_weeks SET week_number = week_number + 100 WHERE season_id = 2027;
UPDATE individual_ranking_weeks SET week_number = week_number - 99  WHERE season_id = 2027;

INSERT INTO individual_ranking_weeks (season_id, week_number, week_date, gender, publish_at)
SELECT 2027, 1, date '2026-12-06', g, (date '2026-12-07' + time '08:00') AT TIME ZONE 'America/New_York'
FROM unnest(ARRAY['M', 'F']) AS g
ON CONFLICT (season_id, week_number, gender) DO NOTHING;

ALTER TABLE individual_ranking_weeks ADD CONSTRAINT individual_ranking_weeks_week_number_check CHECK (week_number BETWEEN 1 AND 20);

COMMIT;

-- Verify: 10 weeks per side, week 1 publishes 2026-12-07 08:00 Eastern, the last 2027-02-08 08:00
SELECT gender, count(*) AS weeks,
       min(publish_at AT TIME ZONE 'America/New_York') AS first_publish,
       max(publish_at AT TIME ZONE 'America/New_York') AS last_publish
FROM individual_ranking_weeks WHERE season_id = 2027 GROUP BY gender ORDER BY gender;

-- ROLLBACK: DELETE FROM individual_ranking_weeks WHERE season_id = 2027 AND week_number = 1;
--   UPDATE individual_ranking_weeks SET week_number = week_number + 100 WHERE season_id = 2027;
--   UPDATE individual_ranking_weeks SET week_number = week_number - 101 WHERE season_id = 2027;
