-- docs/migrations/20260919_resolve_boys_dual_ties.sql
--
-- 1. Grants service_role/authenticated access to microcheck_tasks (API was
--    getting "permission denied", so tie completions could never close the task).
-- 2. Resolves 13 boys season-2 tied duals from bout data using NFHS criteria
--    order: most bouts won > most falls/forfeits/defaults/DQs > most tech falls
--    > most major decisions. Winner gets +1 team point, flag cleared, microcheck
--    task completed. 6 of these previously stored the wrong criteria_winner.
-- 3. Clears the unverified criteria_winner on the 13 ties that are identical
--    through majors (need first-points or later criteria, not in bout data).
--    They stay tiebreaker_pending for manual resolution in microcheck.
-- Idempotent: only touches meets whose scores are still tied.

GRANT ALL ON public.microcheck_tasks TO postgres, service_role, authenticated;

DO $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('e0431ff1-e0ee-4259-a844-8d43d4fe725f'::uuid, 315),
      ('4a517d46-9167-409e-bc44-ffa6df3e8009'::uuid, 198),
      ('28bc5141-9be6-45ab-8c0d-8c1e46bae72f'::uuid, 207),
      ('25c33521-cbac-4e23-84c7-87e6266d1dbf'::uuid, 214),
      ('7dfec3f2-238c-49fe-9c23-0f7f8bc21d3e'::uuid,  98),
      ('e2270193-91d5-4259-ad2b-f35b938fe127'::uuid,  13),
      ('72173593-ded6-4d7d-9aaa-e87f352ca8e8'::uuid, 144),
      ('102ead4a-5c83-4294-a57f-cba0b8d070ac'::uuid, 222),
      ('150d3aac-978e-4118-b0fd-f1735b276b41'::uuid, 191),
      ('e9bf93bb-6bc0-4a11-aceb-9eb109ae1461'::uuid, 218),
      ('0a6edd13-c7da-4b06-81a7-564fb9289dbd'::uuid,  14),
      ('174cb660-dbd4-4aa5-a239-2e1429443ad9'::uuid, 220),
      ('9920ebf9-5344-496a-9019-3edf3be41b43'::uuid, 291)
    ) AS v(meet_id, winner_school_id)
  LOOP
    UPDATE dual_meets dm SET
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
      WHERE task_type = 'tie_resolution' AND gender = 'M'
        AND entity_id = r.meet_id::text AND status = 'pending';
    ELSE
      RAISE NOTICE 'Skipped % (not tied or winner not in meet); task left pending', r.meet_id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Resolved % tied duals', n;

  UPDATE dual_meets SET criteria_winner_school_id = NULL
  WHERE id IN (
    'cc393347-e59a-4cd8-8467-9462cb076d73', 'e5d6e894-1912-4fe0-88f5-0436d10ea06c',
    '8e73619b-0618-4b85-8e5c-4ec1ff6a734f', '8ed89e84-b078-4afb-98ee-923076da1b0e',
    'dd28b436-ff47-4dc0-8d9d-c2ef3b0da3dc', '6eba0d82-8877-4941-8002-4a72db6c98b0',
    '7468f5ec-67f3-4030-9718-c2c91c332a2c', '15a03fe4-9d90-42bf-9480-8464528c417c',
    '42bd0d07-05cd-4953-b2bf-355740b3c6d8', '9990f622-5cce-45b0-a8aa-bee89b4761f3',
    'b495b668-b78c-411c-a0b9-d387d4c71484', 'c778953f-1aca-4dec-9a94-54cca95ffbc9',
    'a5594caf-6798-4ec7-b812-0d12a92e533c'
  )
    AND team1_score = team2_score
    AND tiebreaker_pending = true;
END $$;

-- Verify: expect 13 pending boys ties, 13 pending boys tie tasks
SELECT 'pending_ties' AS what, COUNT(*) FROM dual_meets WHERE tiebreaker_pending = true
UNION ALL
SELECT 'pending_tasks', COUNT(*) FROM microcheck_tasks
  WHERE task_type = 'tie_resolution' AND gender = 'M' AND status = 'pending';
