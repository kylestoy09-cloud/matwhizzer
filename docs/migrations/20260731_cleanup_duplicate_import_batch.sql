-- ============================================================
-- Cleanup: duplicate import batch created at 2026-07-31 21:56 UTC
--
-- A re-import of the full dual-meet dataset ran at 21:56 UTC,
-- duplicating a valid import that had run at 19:51 UTC.
-- This created:
--   - 489 duplicate dual_meets (exact date+school1+school2+gender duplicates)
--   - 6,822 duplicate dual_meet_matches
--   - 201 duplicate wrestler records (all exact first+last+gender duplicates
--     of wrestlers created in the 19:51 batch or earlier)
--   - 200 wrestler_name_aliases pointing to those 201 dup wrestlers
--
-- Additionally, a prior bad import on 2026-07-30 left two orphaned
-- Ethan Hale profiles (6b0be584, 6e2bbd34) with tournament_bouts
-- referencing them instead of the correct profile (1aea0f0f).
-- ============================================================

-- Step 1: Re-point tournament_bouts for July 30 Ethan Hale dupes
--         to the correct (oldest) profile 1aea0f0f
UPDATE tournament_bouts
SET wrestler1_id = '1aea0f0f-3d71-4cb6-a2d8-b50da3abe817'
WHERE wrestler1_id IN (
  '6b0be584-03cf-43de-b36c-dc2914021fc3',
  '6e2bbd34-7928-42c2-9130-a47d340f12eb'
);

UPDATE tournament_bouts
SET wrestler2_id = '1aea0f0f-3d71-4cb6-a2d8-b50da3abe817'
WHERE wrestler2_id IN (
  '6b0be584-03cf-43de-b36c-dc2914021fc3',
  '6e2bbd34-7928-42c2-9130-a47d340f12eb'
);

-- Step 2: Re-point aliases from 21:56 dup wrestlers to their originals.
--         For each alias pointing to a 21:56 wrestler, find the earliest
--         wrestler with the same first_name+last_name+gender (created before
--         21:56) and point the alias there instead.
UPDATE wrestler_name_aliases wna
SET wrestler_id = (
  SELECT w.id
  FROM wrestlers w
  WHERE w.first_name = dup.first_name
    AND w.last_name  = dup.last_name
    AND w.gender     = dup.gender
    AND w.created_at < '2026-07-31 21:56:00+00'
  ORDER BY w.created_at ASC
  LIMIT 1
)
FROM wrestlers dup
WHERE wna.wrestler_id = dup.id
  AND dup.created_at >= '2026-07-31 21:56:00+00'
  AND dup.created_at <  '2026-07-31 21:57:00+00';

-- Step 3: Delete the 6,822 match rows for the 489 dup meets
DELETE FROM dual_meet_matches
WHERE dual_meet_id IN (
  SELECT id FROM dual_meets
  WHERE created_at >= '2026-07-31 21:56:00+00'
    AND created_at <  '2026-07-31 21:57:00+00'
);

-- Step 4: Delete the 489 duplicate dual_meets
DELETE FROM dual_meets
WHERE created_at >= '2026-07-31 21:56:00+00'
  AND created_at <  '2026-07-31 21:57:00+00';

-- Step 5: Delete the 201 duplicate wrestler records from the 21:56 batch.
--         Aliases have already been re-pointed (Step 2); match rows were
--         in the dup meets which are now deleted (Step 3).
DELETE FROM wrestlers
WHERE created_at >= '2026-07-31 21:56:00+00'
  AND created_at <  '2026-07-31 21:57:00+00';

-- Step 6: Delete the two orphaned Ethan Hale dupes from July 30.
--         Their tournament_bouts were re-pointed in Step 1.
--         No aliases or other references remain.
DELETE FROM wrestlers
WHERE id IN (
  '6b0be584-03cf-43de-b36c-dc2914021fc3',
  '6e2bbd34-7928-42c2-9130-a47d340f12eb'
);

-- Step 7: Delete 3 pre-existing Collingswood duplicate meets from June 9, 2026.
--         These were leftover from an earlier partial import; the July 31 (19:51)
--         batch re-imported the same meets along with 2 additional ones that the
--         June 9 batch missed (12/13 vs 358, 12/23 vs 397).
DELETE FROM dual_meet_matches
WHERE dual_meet_id IN (
  SELECT id FROM dual_meets
  WHERE (team1_school_id = 125 OR team2_school_id = 125)
    AND created_at >= '2026-06-09T00:00:00+00'
    AND created_at <  '2026-06-10T00:00:00+00'
);

DELETE FROM dual_meets
WHERE (team1_school_id = 125 OR team2_school_id = 125)
  AND created_at >= '2026-06-09T00:00:00+00'
  AND created_at <  '2026-06-10T00:00:00+00';
