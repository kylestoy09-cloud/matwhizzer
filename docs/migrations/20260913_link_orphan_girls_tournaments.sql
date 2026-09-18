-- Three girls tournaments were imported (bouts in tournament_bouts_girls) but
-- no tournament_registry entry was ever created for them.
-- All 40 existing registry entries were linked; these 3 were simply missing.
-- Fix: insert the 3 missing registry rows with the correct in_season_tournament_id.

INSERT INTO tournament_registry (name, season, gender, date_start, event_type, imported, in_season_tournament_id)
VALUES
  ('Women of Ironman',                 '2025-26', 'F', '2025-12-13', 'tournament', true, '6b0e2651-b561-4b13-a8a5-ab294d2eaac1'),
  ('2025 Howdy Duncan Ladies Classic', '2025-26', 'F', '2025-12-21', 'tournament', true, '3cb4ae0d-a329-452a-a96c-6fbd3f52f023'),
  ('Bloomfield Girls Tournament',      '2025-26', 'F', '2025-12-21', 'tournament', true, 'a1120f19-4316-4116-9083-c2a4ff9b3ad9');
