-- docs/migrations/20261109_girls_2025_jfk_woodbridge_colonia_coop.sql
--
-- Girls 2024-25: Iselin Kennedy (JFK, 150), Woodbridge (187) and Colonia (149) wrestled as one co-op,
-- "JFK/Woodbridge/Colonia" (every 2024-25 girls postseason bout of their wrestlers lists that name;
-- TrackWrestling scored it as one team, North 2 12th with 53.5). In 2025-26 they are three separate teams.
-- Kyle (2026-11-09): put the co-op season under Colonia; for 2024-25 girls make Colonia the co-op and mark
-- the other two inactive; everything else stays.
--   1. Colonia's 2024-25 girls name: "JFK/Woodbridge/Colonia" (school_season_names; the site shows it that season)
--   2. Iselin Kennedy and Woodbridge: inactive for 2024-25 girls only (their boys, and every other season, unchanged)
--   3. their two 2024-25 girls entries (Evangelia Kotsonis, Iselin Kennedy; Genesis Cruz, Woodbridge) move to Colonia,
--      with the co-op's other four (they already are)
-- Checked: no 2024-25 girls duals, official team rows, season names or inactive marks for the three schools.
-- The co-op's official 53.5 (North 2) goes on Colonia with the missing 2024-25 standings rows (next step).
-- ROLLBACK: DELETE FROM school_season_names WHERE school_id = 149 AND season_id = 2025 AND gender = 'F';
--           DELETE FROM inactive_school_seasons WHERE school_id IN (150, 187) AND season_id = 2025 AND gender = 'F';
--           UPDATE tournament_entries SET school_id = 150 WHERE id = (Kotsonis's entry); ... = 187 WHERE id = (Cruz's entry);
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  INSERT INTO school_season_names (school_id, season_id, gender, display_name)
  VALUES (149, 2025, 'F', 'JFK/Woodbridge/Colonia');

  INSERT INTO inactive_school_seasons (school_id, season_id, gender)
  VALUES (150, 2025, 'F'), (187, 2025, 'F');

  UPDATE tournament_entries te SET school_id = 149
  FROM tournaments t
  WHERE t.id = te.tournament_id AND t.season_id = 2025 AND t.gender = 'F'
    AND te.school_id IN (150, 187) AND te.school_context_raw = 'JFK/Woodbridge/Colonia';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'expected to move 2 entries (Kotsonis, Cruz), moved %', n; END IF;
END $$;

-- Verify: Colonia holds all 6 co-op entries; the season name; the two inactive marks
SELECT 'entries at Colonia' AS what, count(*)::text AS value FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
  WHERE t.season_id = 2025 AND t.gender = 'F' AND te.school_context_raw = 'JFK/Woodbridge/Colonia' AND te.school_id = 149
UNION ALL SELECT 'season name', display_name FROM school_season_names WHERE school_id = 149 AND season_id = 2025 AND gender = 'F'
UNION ALL SELECT 'inactive 2024-25 girls', string_agg(school_id::text, ', ') FROM inactive_school_seasons WHERE school_id IN (150, 187) AND season_id = 2025 AND gender = 'F';
