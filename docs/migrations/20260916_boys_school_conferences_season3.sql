-- Copy boys_school_conferences from season 2 → season 3.
-- Populates the Conference column in the preseason dashboard spreadsheet.
-- APPLIED: 2026-09-16

INSERT INTO boys_school_conferences (school_id, season_id, conference)
SELECT school_id, 3, conference
FROM boys_school_conferences
WHERE season_id = 2
ON CONFLICT DO NOTHING;
