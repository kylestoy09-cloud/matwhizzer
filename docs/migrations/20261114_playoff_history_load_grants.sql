-- docs/migrations/20261114_playoff_history_load_grants.sql
--
-- Playoff History Load (Kyle 2026-11-14): the review tool's Load / Unload writes a past season's postseason into the
-- tables the district, region and state pages read. The server (service_role) could read `tournaments` but not insert
-- into it ("permission denied for table tournaments" on the first test load of girls 2023-24; nothing was written) —
-- postseason tournaments had only ever been created in the SQL editor. These grants let Load / Unload write the rows it
-- owns; the code only ever touches Playoff History seasons (stage 'history'), and Unload removes exactly what Load wrote.
-- Run in the Supabase SQL editor.

GRANT SELECT, INSERT, UPDATE, DELETE ON tournaments, tournament_entries, matches, weight_classes, regions, school_season_names, precomputed_team_scores TO service_role;

-- Verify: every row should be true
SELECT t AS table_name,
       has_table_privilege('service_role', t, 'INSERT') AS can_insert,
       has_table_privilege('service_role', t, 'DELETE') AS can_delete
FROM unnest(ARRAY['tournaments', 'tournament_entries', 'matches', 'weight_classes', 'regions', 'school_season_names', 'precomputed_team_scores']) AS t;
