-- docs/migrations/20260918_dual_meet_tiebreaker_pending.sql
--
-- Adds tiebreaker_pending flag to dual_meets and dual_meets_girls.
-- Ties in wrestling are impossible (tiebreakers always produce a winner).
-- When the import parser can't extract the tiebreaker score, it sets this
-- flag so the admin tie-resolution tool can manually assign the winner.
--
-- Seeds the flag on all currently tied meets across all seasons.

ALTER TABLE dual_meets
  ADD COLUMN IF NOT EXISTS tiebreaker_pending boolean NOT NULL DEFAULT false;

ALTER TABLE dual_meets_girls
  ADD COLUMN IF NOT EXISTS tiebreaker_pending boolean NOT NULL DEFAULT false;

-- Seed existing ties
UPDATE dual_meets
SET tiebreaker_pending = true
WHERE team1_score IS NOT NULL
  AND team2_score IS NOT NULL
  AND team1_score = team2_score;

UPDATE dual_meets_girls
SET tiebreaker_pending = true
WHERE team1_score IS NOT NULL
  AND team2_score IS NOT NULL
  AND team1_score = team2_score;

-- Verify
SELECT 'boys' AS gender, COUNT(*) AS pending_ties FROM dual_meets WHERE tiebreaker_pending = true
UNION ALL
SELECT 'girls', COUNT(*) FROM dual_meets_girls WHERE tiebreaker_pending = true;
