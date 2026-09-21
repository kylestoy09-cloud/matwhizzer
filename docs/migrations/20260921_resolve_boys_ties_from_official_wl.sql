-- docs/migrations/20260921_resolve_boys_ties_from_official_wl.sql
--
-- Boys 2025-26 (season 2026). Settles tied duals using the official NJSIAA
-- 2025-26 Power Points W-L ("Whizzer Upload/2025-26 Boys Data/2025-26 Power
-- Points.rtf") as the authority.
--
-- Method: tally each school's W-L from dual_meets with pending ties left out,
-- and compare it to the official W-L. A tie's winner is the only assignment that
-- brings BOTH schools to their official record. Where the opponent is not in
-- the official list (non-NJSIAA / not published), the listed school is short
-- exactly one loss and nothing else, so it lost.
--
-- 1. Resolves the 13 ties left pending by 20260919 (identical through majors,
--    so bout data could not decide them). Winner +1 team point,
--    criteria_winner_school_id set, tiebreaker_pending = false, microcheck task
--    completed. Same mechanics as 20260919.
--    Ridgefield Memorial (357) is the official list's "Ridgefield": it is 3-12
--    plus these two ties, and winning both gives the official 5-12.
--
-- 2. Reverses 4 criteria winners set by 20260919 that official W-L contradicts:
--    each winner is one win over and each loser one win short of their official
--    record. Moves the +1 from the old winner to the new one. 0a6edd13 is one
--    that 20260919 changed; the value before that migration was correct.
--
-- Idempotent: part 1 touches only meets still tied; part 2 only meets whose
-- criteria winner is still the old one with a 1-point margin.

-- ── DRY RUN (read-only) ─────────────────────────────────────────────────────
SELECT dm.id, dm.meet_date, s1.display_name AS team1, dm.team1_score,
       dm.team2_score, s2.display_name AS team2,
       dm.criteria_winner_school_id, dm.tiebreaker_pending
FROM dual_meets dm
JOIN schools s1 ON s1.id = dm.team1_school_id
JOIN schools s2 ON s2.id = dm.team2_school_id
WHERE dm.id IN (
  'a5594caf-6798-4ec7-b812-0d12a92e533c', 'cc393347-e59a-4cd8-8467-9462cb076d73',
  'e5d6e894-1912-4fe0-88f5-0436d10ea06c', '8e73619b-0618-4b85-8e5c-4ec1ff6a734f',
  '8ed89e84-b078-4afb-98ee-923076da1b0e', 'dd28b436-ff47-4dc0-8d9d-c2ef3b0da3dc',
  '6eba0d82-8877-4941-8002-4a72db6c98b0', '7468f5ec-67f3-4030-9718-c2c91c332a2c',
  '15a03fe4-9d90-42bf-9480-8464528c417c', '42bd0d07-05cd-4953-b2bf-355740b3c6d8',
  '9990f622-5cce-45b0-a8aa-bee89b4761f3', 'b495b668-b78c-411c-a0b9-d387d4c71484',
  'c778953f-1aca-4dec-9a94-54cca95ffbc9',
  '25c33521-cbac-4e23-84c7-87e6266d1dbf', '7dfec3f2-238c-49fe-9c23-0f7f8bc21d3e',
  'e2270193-91d5-4259-ad2b-f35b938fe127', '0a6edd13-c7da-4b06-81a7-564fb9289dbd'
)
ORDER BY dm.tiebreaker_pending DESC, dm.meet_date;

DO $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  -- ── 1. Pending ties ───────────────────────────────────────────────────────
  FOR r IN
    SELECT * FROM (VALUES
      ('a5594caf-6798-4ec7-b812-0d12a92e533c'::uuid,  76),  -- 02-16 Cranford 34-34 Morris Hills → Morris Hills
      ('cc393347-e59a-4cd8-8467-9462cb076d73'::uuid,  53),  -- 01-06 Lyndhurst-NA 40-40 Garfield → Garfield
      ('e5d6e894-1912-4fe0-88f5-0436d10ea06c'::uuid, 128),  -- 01-24 Watchung Hills 39-39 Westfield → Westfield
      ('8e73619b-0618-4b85-8e5c-4ec1ff6a734f'::uuid,  63),  -- 01-30 Mountain Lakes 40-40 Lenape Valley → Mountain Lakes
      ('8ed89e84-b078-4afb-98ee-923076da1b0e'::uuid,  79),  -- 02-21 Pioneer Academy 24-24 College Achieve Paterson → Pioneer Academy (one-sided)
      ('dd28b436-ff47-4dc0-8d9d-c2ef3b0da3dc'::uuid, 357),  -- 01-03 Ridgefield Memorial 42-42 Dwight Morrow → Ridgefield Memorial
      ('6eba0d82-8877-4941-8002-4a72db6c98b0'::uuid, 209),  -- 02-11 Nottingham 40-40 Bordentown/Florence → Nottingham
      ('7468f5ec-67f3-4030-9718-c2c91c332a2c'::uuid, 134),  -- 01-23 Summit 39-39 New Providence → New Providence
      ('15a03fe4-9d90-42bf-9480-8464528c417c'::uuid, 379),  -- 01-08 Lodi/Saddle Brook 39-39 Lyndhurst-NA → Lodi/Saddle Brook
      ('42bd0d07-05cd-4953-b2bf-355740b3c6d8'::uuid,  17),  -- 12-20 Ramapo 34-34 Middletown South → Ramapo (one-sided)
      ('9990f622-5cce-45b0-a8aa-bee89b4761f3'::uuid, 357),  -- 01-03 Ridgefield Memorial 42-42 South Hunterdon → Ridgefield Memorial
      ('b495b668-b78c-411c-a0b9-d387d4c71484'::uuid, 276),  -- 02-07 Absegami 38-38 Clayton/Glassboro → Absegami
      ('c778953f-1aca-4dec-9a94-54cca95ffbc9'::uuid, 196)   -- 02-07 North Star Academy 36-36 Rutgers Prep → Rutgers Prep (one-sided)
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
  RAISE NOTICE 'Resolved % pending ties', n;

  -- ── 2. Reverse 4 criteria winners contradicted by official W-L ───────────
  n := 0;
  FOR r IN
    SELECT * FROM (VALUES
      ('25c33521-cbac-4e23-84c7-87e6266d1dbf'::uuid, 214, 265),  -- 01-13 Riverside 33-32 Willingboro → Willingboro
      ('7dfec3f2-238c-49fe-9c23-0f7f8bc21d3e'::uuid,  98, 120),  -- 02-07 Union City 36-35 Bayonne → Bayonne
      ('e2270193-91d5-4259-ad2b-f35b938fe127'::uuid,  13,  34),  -- 02-03 New Milford 37-38 Indian Hills → New Milford
      ('0a6edd13-c7da-4b06-81a7-564fb9289dbd'::uuid,  14,  36)   -- 02-14 Mahwah 34-33 Pequannock → Pequannock
    ) AS v(meet_id, old_winner, new_winner)
  LOOP
    UPDATE dual_meets dm SET
      team1_score = dm.team1_score
        + CASE WHEN dm.team1_school_id = r.new_winner THEN 1 WHEN dm.team1_school_id = r.old_winner THEN -1 ELSE 0 END,
      team2_score = dm.team2_score
        + CASE WHEN dm.team2_school_id = r.new_winner THEN 1 WHEN dm.team2_school_id = r.old_winner THEN -1 ELSE 0 END,
      criteria_winner_school_id = r.new_winner
    WHERE dm.id = r.meet_id
      AND dm.criteria_winner_school_id = r.old_winner
      AND abs(dm.team1_score - dm.team2_score) = 1
      AND r.new_winner IN (dm.team1_school_id, dm.team2_school_id)
      AND r.old_winner IN (dm.team1_school_id, dm.team2_school_id);

    IF FOUND THEN n := n + 1;
    ELSE RAISE NOTICE 'Skipped % (criteria winner no longer %, or margin not 1)', r.meet_id, r.old_winner;
    END IF;
  END LOOP;
  RAISE NOTICE 'Reversed % criteria winners', n;
END $$;

-- Verify: expect 0 pending boys ties and 0 pending boys tie tasks
SELECT 'pending_ties' AS what, COUNT(*) FROM dual_meets
  WHERE tiebreaker_pending = true AND gender = 'M' AND season_id = 2026
UNION ALL
SELECT 'pending_tasks', COUNT(*) FROM microcheck_tasks
  WHERE task_type = 'tie_resolution' AND gender = 'M' AND status = 'pending';

-- ROLLBACK (if ever needed):
--   Part 1: for each of the 13 meet IDs, subtract 1 from the winner's score,
--           set criteria_winner_school_id = NULL, tiebreaker_pending = true,
--           and set the microcheck task back to 'pending'.
--   Part 2: rerun the part-2 loop with old_winner and new_winner swapped.
