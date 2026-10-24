-- docs/migrations/20261024_resolve_girls_ties_from_track_criteria.sql
--
-- Girls 2025-26 (season 2026). Settles tied duals using the tiebreaker that
-- Track Wrestling recorded on each dual's page ("Tie Breaker: <criterion>:
-- <team1> vs. <team2>") in the source exports in "Whizzer Upload/2025-26 Girls
-- Data". The export shows the criterion and both values but not the selected
-- winner (it's a dropdown), so the winner is the team with the higher value.
--
-- Direction check: boys 2025-26 ties with a Track criterion line and a winner
-- verified against the official Power Points W-L
-- (20260921_resolve_boys_ties_from_official_wl): the higher value won 7 of 8
-- "forfeits" ties (exception: Absegami vs Clayton/Glassboro) and 12 of 15
-- across all criteria. On the girls
-- side, BCIT-Westampton vs Pemberton (6 vs 3) also matches the bout data
-- (6 falls/forfeits to 5). There is no official girls W-L to check against.
--
-- 1. Resolves 15 ties with a Track criterion. Winner +1 team point,
--    criteria_winner_school_id set, tiebreaker_pending = false, microcheck
--    task completed. Same mechanics as the boys tie migrations.
--
-- 2. Fixes Clifton vs Passaic (01-28): stored 0-0 but the 12 bouts sum to
--    45-18 Clifton (8 wins to 4). Not a tie — sets the bout-sum score.
--
-- Not touched: the ~48 ties whose Track line is "Team Id" (Track's arbitrary
-- last-resort fallback) or that have no tiebreaker line. Those stay pending in
-- microcheck.
--
-- Idempotent: every update requires the meet to still be tied / still 0-0.

-- ── DRY RUN (read-only) ─────────────────────────────────────────────────────
SELECT id, meet_date, team1_school_name_raw, team1_score, team2_score,
       team2_school_name_raw, criteria_winner_school_id, tiebreaker_pending
FROM dual_meets_girls
WHERE id IN (
  'fd5defc9-dfc9-4038-bc30-df1f7723f771', '4c84fea5-0d84-48e0-abf9-9d8e26f7d959',
  'a3679adc-7988-449e-bdd4-799de9736fbe', 'c24e71c3-dd2c-48ca-87eb-018a6407b557',
  'b7f8600e-7718-49f6-9837-4433e2da4d52', '9fe79abe-8cc8-404d-92e7-19aff05f5d4b',
  '7be288fc-1a8d-48f5-8e38-d9a25c3a22d1', 'c4c9ca70-acbe-4322-989b-95e2481bfb65',
  'cc9b21ef-cde2-4d20-bc57-11153ed968d7', 'dfe88ebc-8ddb-4e39-9d67-b3ddf43d7f5c',
  '74d770e9-21ab-47aa-9e2a-7647f8d930a8', '947137a9-a104-4e7d-92c8-837526abca10',
  '46275983-b0f1-4df6-8f19-3fa2623927bf', '944b1c89-3e25-4b31-a919-9a3b450374c4',
  '702beae0-8cf7-4642-a12a-505e5cc65e49', 'ad9c7933-2c9d-483f-92f8-9245112da6db'
)
ORDER BY meet_date;

DO $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  -- ── 1. Ties with a Track criterion ────────────────────────────────────────
  FOR r IN
    SELECT * FROM (VALUES
      ('fd5defc9-dfc9-4038-bc30-df1f7723f771'::uuid, 232),  -- 12-22 Hightstown 30-30 Robbinsville → Hightstown (forfeits 4 vs 2)
      ('4c84fea5-0d84-48e0-abf9-9d8e26f7d959'::uuid, 379),  -- 12-23 Garfield 18-18 Lodi/Saddle Brook → Lodi/Saddle Brook (forfeits 0 vs 3)
      ('a3679adc-7988-449e-bdd4-799de9736fbe'::uuid, 232),  -- 12-23 Ewing 24-24 Hightstown → Hightstown (forfeits 0 vs 3)
      ('c24e71c3-dd2c-48ca-87eb-018a6407b557'::uuid, 256),  -- 01-08 BCIT-Westampton 36-36 Pemberton → BCIT-Westampton (forfeits 6 vs 3)
      ('b7f8600e-7718-49f6-9837-4433e2da4d52'::uuid, 271),  -- 01-08 Lenape 36-36 Southern Regional → Lenape (forfeits 3 vs 0)
      ('9fe79abe-8cc8-404d-92e7-19aff05f5d4b'::uuid,  52),  -- 01-10 Fair Lawn 36-36 Mahwah → Fair Lawn (forfeits 4 vs 1)
      ('7be288fc-1a8d-48f5-8e38-d9a25c3a22d1'::uuid, 116),  -- 01-12 South Hunterdon 12-12 North Star Academy → North Star (firstPts 0 vs 10)
      ('c4c9ca70-acbe-4322-989b-95e2481bfb65'::uuid, 252),  -- 01-24 Marlboro 36-36 Southern Regional → Southern Regional (forfeits 3 vs 5)
      ('cc9b21ef-cde2-4d20-bc57-11153ed968d7'::uuid, 252),  -- 01-24 Manalapan 30-30 Southern Regional → Southern Regional (forfeits 1 vs 2)
      ('dfe88ebc-8ddb-4e39-9d67-b3ddf43d7f5c'::uuid, 155),  -- 01-31 Rahway 30-30 Irvington → Rahway (forfeits 5 vs 1)
      ('74d770e9-21ab-47aa-9e2a-7647f8d930a8'::uuid, 162),  -- 02-07 North Brunswick 33-33 Old Bridge → North Brunswick (forfeits 1 vs 0)
      ('947137a9-a104-4e7d-92c8-837526abca10'::uuid, 106),  -- 02-12 Nutley 30-30 Irvington → Nutley (forfeits 5 vs 3)
      ('46275983-b0f1-4df6-8f19-3fa2623927bf'::uuid, 123),  -- 02-13 Elizabeth 33-33 West Orange → Elizabeth (forfeits 2 vs 0)
      ('944b1c89-3e25-4b31-a919-9a3b450374c4'::uuid,  40),  -- 02-13 Bergenfield 24-24 Irvington → Bergenfield (forfeits 2 vs 1)
      ('702beae0-8cf7-4642-a12a-505e5cc65e49'::uuid, 256)   -- 02-19 Princeton 36-36 BCIT-Westampton → BCIT-Westampton (forfeits 4 vs 6)
    ) AS v(meet_id, winner_school_id)
  LOOP
    UPDATE dual_meets_girls dm SET
      team1_score = dm.team1_score + CASE WHEN r.winner_school_id = dm.team1_school_id THEN 1 ELSE 0 END,
      team2_score = dm.team2_score + CASE WHEN r.winner_school_id = dm.team2_school_id THEN 1 ELSE 0 END,
      criteria_winner_school_id = r.winner_school_id,
      tiebreaker_pending = false
    WHERE dm.id = r.meet_id
      AND dm.team1_score = dm.team2_score
      AND r.winner_school_id IN (dm.team1_school_id, dm.team2_school_id);

    IF FOUND THEN
      n := n + 1;
      UPDATE microcheck_tasks SET status = 'completed', completed_at = now()
      WHERE task_type = 'tie_resolution' AND gender = 'F'
        AND entity_id = r.meet_id::text AND status = 'pending';
    ELSE
      RAISE NOTICE 'Skipped % (not tied or winner not in meet); task left pending', r.meet_id;
    END IF;
  END LOOP;
  RAISE NOTICE 'Resolved % girls ties', n;

  -- ── 2. Clifton vs Passaic score fix ───────────────────────────────────────
  UPDATE dual_meets_girls SET team1_score = 45, team2_score = 18, tiebreaker_pending = false
  WHERE id = 'ad9c7933-2c9d-483f-92f8-9245112da6db'
    AND team1_school_id = 50 AND team2_school_id = 58
    AND team1_score = 0 AND team2_score = 0;
  IF FOUND THEN
    UPDATE microcheck_tasks SET status = 'completed', completed_at = now()
    WHERE task_type = 'tie_resolution' AND gender = 'F'
      AND entity_id = 'ad9c7933-2c9d-483f-92f8-9245112da6db' AND status = 'pending';
  ELSE
    RAISE NOTICE 'Clifton vs Passaic skipped (score no longer 0-0)';
  END IF;
END $$;

-- Verify: expect 49 pending girls ties and 49 pending girls tie tasks
SELECT 'pending_ties' AS what, COUNT(*) FROM dual_meets_girls
  WHERE tiebreaker_pending = true AND season_id = 2026
UNION ALL
SELECT 'pending_tasks', COUNT(*) FROM microcheck_tasks
  WHERE task_type = 'tie_resolution' AND gender = 'F' AND status = 'pending';

-- ROLLBACK (if ever needed):
--   Part 1: for each of the 15 meet IDs, subtract 1 from the winner's score,
--           set criteria_winner_school_id = NULL, tiebreaker_pending = true,
--           and set the microcheck task back to 'pending'.
--   Part 2: UPDATE dual_meets_girls SET team1_score = 0, team2_score = 0,
--           tiebreaker_pending = true WHERE id = 'ad9c7933-2c9d-483f-92f8-9245112da6db';
--           and set its microcheck task back to 'pending'.
