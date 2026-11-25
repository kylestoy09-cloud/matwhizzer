-- docs/migrations/20261111_girls_2026_27_preseason.sql
--
-- Opens girls 2026-27 for preseason work (Kyle 2026-11-11: work the preseason checklist on the site, then set
-- the new season live). Boys 2026-27 got its preseason row on 2026-09-14; girls had none, so every girls
-- preseason tool (checklist, alignment import, grade advance, schedule, tournament rollover) still resolved
-- to 2025-26. Also marks girls 2025-26 complete, as boys 2025-26 is: it stays the live season on the site
-- until 2026-27 is set live; archiving locks its rankings and Power Points.
-- Run in the Supabase SQL editor.

BEGIN;

INSERT INTO season_gender_state (season_id, gender, stage, is_public_default)
SELECT 2027, 'F', 'preseason', false
WHERE NOT EXISTS (SELECT 1 FROM season_gender_state WHERE season_id = 2027 AND gender = 'F');

UPDATE season_gender_state SET stage = 'archived', finalized_at = now()
WHERE season_id = 2026 AND gender = 'F' AND stage <> 'archived';

COMMIT;

-- Verify: girls 2025-26 archived and still live; girls 2026-27 preseason, not live
SELECT season_id, gender, stage, is_public_default FROM season_gender_state WHERE gender = 'F' ORDER BY season_id;

-- ROLLBACK: UPDATE season_gender_state SET stage = 'season', finalized_at = NULL WHERE season_id = 2026 AND gender = 'F';
--           DELETE FROM season_gender_state WHERE season_id = 2027 AND gender = 'F';
