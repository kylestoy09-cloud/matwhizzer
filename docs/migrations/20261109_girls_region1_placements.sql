-- docs/migrations/20261109_girls_region1_placements.sql
--
-- Girls 2025-26 Region 1: the placements table has no rows (Regions 2-4 have 70, 72, 72). The bouts
-- are all on file (the final, 3rd and 5th place bouts came from the bracket PDFs on 2026-11-02,
-- 20261102_girls_region1_place_bouts.sql); the placement rows were never made from them.
-- The region pages read places from the bouts, so they were right. What reads this table and was
-- missing Region 1: ghost champions (the Ghost Champions page, wrestler profiles), the postseason
-- wrestler points functions, and the personalized home page.
--
-- Rows are made exactly as Regions 2-4's are (checked 2026-11-09: their stored rows equal the bouts,
-- 70/70, 72/72, 72/72): final winner 1st and loser 2nd, 3rd place bout 3rd and 4th, 5th place bout
-- 5th and 6th; validated bouts only; the name column holds the profile name, as theirs do.
-- Expected: 72 rows (12 weights x 6 places).
-- Run in the Supabase SQL editor. ROLLBACK: DELETE FROM placements WHERE tournament_id = (Region 1's id).

DO $$
DECLARE
  t_id  integer;
  n_new integer;
BEGIN
  SELECT id INTO t_id FROM tournaments WHERE name = 'Girl_s Regions r1' AND season_id = 2026 AND gender = 'F';
  IF t_id IS NULL THEN RAISE EXCEPTION 'Girls Region 1 2025-26 not found'; END IF;
  IF EXISTS (SELECT 1 FROM placements WHERE tournament_id = t_id) THEN RAISE EXCEPTION 'Region 1 already has placements'; END IF;

  INSERT INTO placements (tournament_id, weight_class_id, place, entry_id, wrestler_name_raw)
  SELECT t_id, m.weight_class_id,
         CASE m.round::text WHEN 'F' THEN 1 WHEN '3rd_Place' THEN 3 ELSE 5 END + CASE WHEN s.won THEN 0 ELSE 1 END,
         te.id,
         TRIM(COALESCE(w.first_name, '') || ' ' || COALESCE(w.last_name, ''))
  FROM matches m
  CROSS JOIN (VALUES (true), (false)) s(won)
  JOIN tournament_entries te ON te.id = CASE WHEN s.won THEN m.winner_entry_id ELSE m.loser_entry_id END
  LEFT JOIN wrestlers w ON w.id = te.wrestler_id
  WHERE m.tournament_id = t_id
    AND m.validated = true
    AND m.round::text IN ('F', '3rd_Place', '5th_Place');

  GET DIAGNOSTICS n_new = ROW_COUNT;
  IF n_new <> 72 THEN RAISE EXCEPTION 'Expected 72 placements, got %', n_new; END IF;
  RAISE NOTICE 'Inserted % Region 1 placements', n_new;
END $$;

-- Verify: 72 rows, 6 per weight, places 1-6 once each
SELECT wc.weight, count(*) AS placers, string_agg(p.place::text, ',' ORDER BY p.place) AS places
FROM placements p JOIN weight_classes wc ON wc.id = p.weight_class_id
WHERE p.tournament_id = (SELECT id FROM tournaments WHERE name = 'Girl_s Regions r1' AND season_id = 2026 AND gender = 'F')
GROUP BY wc.weight ORDER BY wc.weight;
