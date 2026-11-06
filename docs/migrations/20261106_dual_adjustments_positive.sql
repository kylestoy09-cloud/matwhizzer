-- docs/migrations/20261106_dual_adjustments_positive.sql
--
-- dual_meet_deductions / dual_meet_deductions_girls hold every team-point adjustment TrackWrestling
-- lists after a dual's bouts, not only deductions. Some add points: tie-breaker criteria ("Criteria F:
-- Least amount of forfeits  1.0  0"), a penalty point to the opponent ("Steinert Wrestler Throwing
-- Headgear  1.0  0"), a correction ("They won some matches but kids not present on track  0  18.0").
-- Drops the "<= 0" checks; an adjustment must still change something.
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE dual_meet_deductions       DROP CONSTRAINT IF EXISTS dual_meet_deductions_team1_points_check;
ALTER TABLE dual_meet_deductions       DROP CONSTRAINT IF EXISTS dual_meet_deductions_team2_points_check;
ALTER TABLE dual_meet_deductions_girls DROP CONSTRAINT IF EXISTS dual_meet_deductions_girls_team1_points_check;
ALTER TABLE dual_meet_deductions_girls DROP CONSTRAINT IF EXISTS dual_meet_deductions_girls_team2_points_check;
ALTER TABLE dual_meet_deductions       ADD CONSTRAINT dual_meet_deductions_nonzero       CHECK (team1_points <> 0 OR team2_points <> 0);
ALTER TABLE dual_meet_deductions_girls ADD CONSTRAINT dual_meet_deductions_girls_nonzero CHECK (team1_points <> 0 OR team2_points <> 0);

COMMIT;

-- Verify: only the nonzero checks remain (expect 2 rows)
SELECT conrelid::regclass, conname FROM pg_constraint
WHERE conrelid IN ('dual_meet_deductions'::regclass, 'dual_meet_deductions_girls'::regclass) AND contype = 'c';
