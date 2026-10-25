-- docs/migrations/20261024_girls_duplicate_meets_cleanup.sql
--
-- Girls 2025-26 (season 2026). Removes duplicate meets found while checking
-- dual_meets_girls against the official girls standings
-- (20261024_girls_power_points_2025_26.sql). Every copy carried its own bouts,
-- so the duplicates double-counted matches on wrestler profiles.
--
-- Full pre-delete rows (meets, bouts, tournaments, participants, registry):
--   docs/migrations/backups/20261024_girls_duplicate_meets_cleanup.json
--
-- 1. Tournaments imported twice (bouts and participants cascade):
--    - Bloomfield Girls Tournament (a1120f19, 345 bouts) duplicates Bloomfield
--      Holiday Girls Tournament (51c968e8, 345 bouts, registry-linked, 52
--      participant rows). 333 of the wrestler pairs are identical; the rest
--      are the same bouts with a missing wrestler link or weight label.
--    - 2025 Lady Howdy Duncan Tournament (b8c7ac03, 28 bouts) is a partial
--      re-import of 2025 Howdy Duncan Ladies Classic (3cb4ae0d, 92 bouts) —
--      every pair is in the full copy. Registry and venue move to 3cb4ae0d.
--
-- 2. Duals entered twice, once from each team's side (bouts cascade). Keep the
--    copy with the most bouts. Two are dated a day apart in Track itself
--    (Ewing/Notre Dame 12-22 & 12-23; Freehold Borough/Madison 01-07 & 01-08).
--    Madison's 01-07 and 01-08 copies left out Freehold's 6 forfeit wins; the
--    full result is Freehold Borough 36-12. Sterling/Collingswood (01-16 /
--    01-17) is NOT touched: the two copies differ and need review.
--
-- 3. Official ties (girls records include ties): Elizabeth vs West Orange
--    (02-13) and North Brunswick vs Old Bridge (02-07) were given winners by
--    20261024_resolve_girls_ties_from_track_criteria.sql / the import; the
--    official standings show both as ties (Elizabeth 12-6-1, West Orange
--    12-7-1, North Brunswick 18-5-1, Old Bridge 16-8-1). Set to 33-33, no
--    criteria winner, not pending.
--
-- Hammer scores: re-run the girls recalculation afterward (admin Hammer
-- Scores); it rewrites wrestler_match_score_log for the season.

DO $$
DECLARE r record; n integer;
BEGIN
  -- ── 1. Duplicate tournaments ──────────────────────────────────────────────
  UPDATE in_season_tournaments_girls k SET
    venue_name    = COALESCE(k.venue_name, d.venue_name),
    venue_address = COALESCE(k.venue_address, d.venue_address),
    location      = COALESCE(k.location, d.location)
  FROM in_season_tournaments_girls d
  WHERE k.id = '3cb4ae0d-a329-452a-a96c-6fbd3f52f023' AND d.id = 'b8c7ac03-95bc-416f-baff-e3908180a263';

  UPDATE tournament_registry SET in_season_tournament_id = '3cb4ae0d-a329-452a-a96c-6fbd3f52f023'
  WHERE in_season_tournament_id = 'b8c7ac03-95bc-416f-baff-e3908180a263';

  DELETE FROM in_season_tournaments_girls
  WHERE id IN ('a1120f19-4316-4116-9083-c2a4ff9b3ad9', 'b8c7ac03-95bc-416f-baff-e3908180a263');
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate tournaments', n;

  -- ── 2. Duplicate duals (del, keep) ────────────────────────────────────────
  FOR r IN
    SELECT * FROM (VALUES
      ('190add6b-da13-4652-9759-929e0bc144fe'::uuid, '76fc7d01-cdb6-4bdc-b108-e0837494c970'::uuid),  -- 01-19 Rancocas Valley 45-24 Delran
      ('1b0e375e-7fb8-451f-80e9-bd20e37382ed'::uuid, '8ee095f6-61a8-451e-8f3a-c44b0a8198b3'::uuid),  -- 01-19 Rancocas Valley 40-22 Buena
      ('33a95994-32f1-4c1b-b8d3-11e30ea82d1b'::uuid, 'befbe7a6-8722-4a81-8cf0-80aa110d92a6'::uuid),  -- 01-19 Delran 24-23 A.P. Schalick
      ('46275983-b0f1-4df6-8f19-3fa2623927bf'::uuid, '6e5e6e2b-f629-4e19-bff7-7fe0976ec855'::uuid),  -- 02-13 West Orange / Elizabeth (tie, part 3)
      ('aa31190a-e5c8-42ef-a103-0e8a38fb2e15'::uuid, '4f531491-2856-4f10-9993-578811be52de'::uuid),  -- 01-19 Buena 39-18 A.P. Schalick
      ('973ec080-8e2a-4027-9cb0-28a13cc6bbf3'::uuid, 'dd961f55-09c5-46e6-a9e9-52d57568d195'::uuid),  -- 12-18 Bordentown 48-24 Cinnaminson
      ('a506226f-9676-4cda-bb9a-733e87ddef22'::uuid, 'ee0f6466-124b-41b8-a3be-81119c355be1'::uuid),  -- 01-07 Freehold Borough 36-12 Madison (Madison's partial copy)
      ('cdf3836f-32cf-42ff-a1b9-a0fa7171f7a9'::uuid, 'ee0f6466-124b-41b8-a3be-81119c355be1'::uuid),  -- 01-08 copy of the same meet
      ('ed84b7ab-1e58-477e-a390-52c58e24d356'::uuid, 'ec33e2a7-8539-48ff-84aa-d1a327fb3a39'::uuid)   -- Ewing 30-12 Notre Dame (12-23 copy of 12-22)
    ) AS v(del_id, keep_id)
  LOOP
    -- only delete when the keeper still exists
    DELETE FROM dual_meets_girls d
    WHERE d.id = r.del_id AND EXISTS (SELECT 1 FROM dual_meets_girls k WHERE k.id = r.keep_id);
    IF FOUND THEN
      DELETE FROM microcheck_tasks WHERE task_type = 'tie_resolution' AND gender = 'F' AND entity_id = r.del_id::text;
    ELSE
      RAISE NOTICE 'Skipped % (already gone or keeper missing)', r.del_id;
    END IF;
  END LOOP;

  -- ── 3. Official ties ──────────────────────────────────────────────────────
  UPDATE dual_meets_girls SET team1_score = 33, team2_score = 33,
         criteria_winner_school_id = NULL, tiebreaker_pending = false
  WHERE id IN ('6e5e6e2b-f629-4e19-bff7-7fe0976ec855', '74d770e9-21ab-47aa-9e2a-7647f8d930a8');
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Set % official ties', n;
END $$;

-- Verify: expect 0 rows from each
SELECT id FROM in_season_tournaments_girls
  WHERE id IN ('a1120f19-4316-4116-9083-c2a4ff9b3ad9', 'b8c7ac03-95bc-416f-baff-e3908180a263');
SELECT meet_date, LEAST(team1_school_id, team2_school_id) AS s1,
       GREATEST(team1_school_id, team2_school_id) AS s2, COUNT(*)
  FROM dual_meets_girls WHERE season_id = 2026
  GROUP BY 1, 2, 3
  HAVING COUNT(*) > 1;

-- ROLLBACK: re-insert the rows saved in
-- docs/migrations/backups/20261024_girls_duplicate_meets_cleanup.json
-- (tournaments → their bouts/participants, duals → their bouts, tasks), set
-- tournament_registry.in_season_tournament_id back to b8c7ac03 for "2025 Lady
-- Howdy Duncan Tournament", and restore the two tie meets' scores from the
-- backup.
