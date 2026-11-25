-- docs/migrations/20261111_schalick_delran_missing_bouts.sql
--
-- Girls dual A.P. Schalick 23-24 Delran (1/19/2026): the stored bouts add to 17-18. Track's listing used
-- non-NJ weights and the dual importer dropped the 128 and 135 bouts instead of mapping them to NJ weights
-- (Kyle's rule: map non-NJ weights to NJ). Source: "2025-26 - Girls Duals January 16-31.rtfd",
-- "A.P. Schalick vs. Delran (01/19/2026)":
--   128 → 126  River Wojcik (A.P. Schalick) over Aleyce Perez (Delran) (Fall 5:49)   6-0
--   135 → 132  Everleigh Whitham (Delran) over Unknown (For.)                        0-6
-- With them the bouts add to 23-24, the final score. Side a = A.P. Schalick (team1), b = Delran.
-- Run in the Supabase SQL editor.

BEGIN;

INSERT INTO dual_meet_matches_girls (dual_meet_id, weight_class, order_index, wrestler_a_id, wrestler_b_id,
  wrestler_a_name_raw, wrestler_b_name_raw, school_a_id, school_b_id, winner_id, result_type, result_detail,
  fall_time_seconds, result_time_estimated, winner_score, loser_score, team1_points, team2_points,
  is_double_forfeit, is_forfeit_win, validated)
SELECT 'befbe7a6-8722-4a81-8cf0-80aa110d92a6', v.wc, (SELECT coalesce(max(order_index), -1) FROM dual_meet_matches_girls WHERE dual_meet_id = 'befbe7a6-8722-4a81-8cf0-80aa110d92a6') + v.n,
  v.a_id::uuid, v.b_id::uuid, v.a_raw, v.b_raw, 286, 258, v.win::uuid, v.rt, NULL, v.fall, false, NULL, NULL, v.p1, v.p2, false, v.ff, false
FROM (VALUES
  (1, 126, 'bed82a3c-d5ed-49d6-b2b0-d90821fa596c', 'c33370b9-ee28-4754-8099-9ffae874946c', 'River Wojcik', 'Aleyce Perez', 'bed82a3c-d5ed-49d6-b2b0-d90821fa596c', 'Fall', 349, 6, 0, false),
  (2, 132, NULL, '148156f6-cdbb-49b9-9d6e-ecbfd4c8c340', NULL, 'Everleigh Whitham', '148156f6-cdbb-49b9-9d6e-ecbfd4c8c340', 'For', NULL, 0, 6, true)
) AS v(n, wc, a_id, b_id, a_raw, b_raw, win, rt, fall, p1, p2, ff)
WHERE NOT EXISTS (SELECT 1 FROM dual_meet_matches_girls WHERE dual_meet_id = 'befbe7a6-8722-4a81-8cf0-80aa110d92a6' AND weight_class IN (126, 132));

COMMIT;

-- Verify: bouts add to 23-24
SELECT sum(team1_points) AS schalick, sum(team2_points) AS delran, count(*) AS bouts
FROM dual_meet_matches_girls WHERE dual_meet_id = 'befbe7a6-8722-4a81-8cf0-80aa110d92a6';
-- expect 23, 24, 11

-- ROLLBACK: DELETE FROM dual_meet_matches_girls WHERE dual_meet_id = 'befbe7a6-8722-4a81-8cf0-80aa110d92a6' AND weight_class IN (126, 132);
