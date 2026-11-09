-- docs/migrations/20261109_girls_2025_wwp_south_entries.sql
--
-- Girls 2024-25 Central region: six West Windsor-Plainsboro South wrestlers are stored at WW-P North (176).
-- TrackWrestling labels each "West Windsor-Plainsboro South", five are linked by name at South (177), and
-- Xinlan Xu is entered at South in 2025-26. The official team rows were right (South 20, North 10); the entries
-- weren't, so the standings check mapped South's total to North. Found by scripts/audit_entry_school_labels.mts,
-- which checks every entry's TrackWrestling label against its school: these six are the only real mismatches in
-- either gender, either season (two 2025-26 "East Side" girls flagged in District 2 are correctly Paterson Eastside).
--   Ridhi Gupta 107, Xinlan Xu 114, Grace Kang 120, Daniella Reyes De Leon 126, Hana Rochkind 132, Madison McKoy 138
-- ROLLBACK: UPDATE tournament_entries SET school_id = 176 WHERE id IN (the six ids below);
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  UPDATE tournament_entries te SET school_id = 177
  FROM tournaments t
  WHERE t.id = te.tournament_id AND t.season_id = 2025 AND t.gender = 'F' AND t.name = 'Girl_s Regions Central'
    AND te.school_id = 176 AND te.school_context_raw = 'West Windsor-Plainsboro South';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'expected to move 6 entries to WW-P South, moved %', n; END IF;
END $$;

-- Verify: 6 South-labelled entries at South, none at North
SELECT te.school_id, count(*) FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
WHERE t.season_id = 2025 AND t.gender = 'F' AND te.school_context_raw = 'West Windsor-Plainsboro South' GROUP BY te.school_id;
