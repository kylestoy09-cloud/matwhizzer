-- Girls Roster Grade Import in the admin tool registry.
--
-- The boys row (roster_grade_import_boys) was added 2026-09-15 with no migration;
-- it is recorded here (RECONSTRUCTED) alongside the new girls row. Girls 2025-26
-- is still in the 'season' stage while its rosters are imported, so the girls
-- row also shows in season.

INSERT INTO admin_tool_registry (key, label, path, description, gender, show_offseason, show_preseason, show_season, show_postseason)
VALUES
  ('roster_grade_import_boys',  'Boys Roster Grade Import',  '/admin/roster-grade-import',
   'Match Track Wrestling roster data to live wrestlers and confirm grades', 'boys',  true, true, false, false),
  ('roster_grade_import_girls', 'Girls Roster Grade Import', '/admin/roster-grade-import-girls',
   'Match Track Wrestling roster data to live wrestlers and confirm grades', 'girls', true, true, true,  false)
ON CONFLICT (key) DO NOTHING;

SELECT key, label, path, gender, show_offseason, show_preseason, show_season, show_postseason
FROM admin_tool_registry WHERE key LIKE 'roster_grade_import_%' ORDER BY key;
