-- Deactivate Donovan Catholic (school_id=248) and Weehawken (school_id=99)
-- for boys wrestling in season 2 (2025-26).
-- Neither school has Track Wrestling roster data for this season.
-- Mirrors the logic in /api/admin/school-season-status POST action='deactivate'.

INSERT INTO inactive_school_seasons (school_id, season_id, gender)
VALUES
  (248, 2, 'M'),
  (99,  2, 'M')
ON CONFLICT (school_id, season_id, gender) DO NOTHING;

DELETE FROM boys_school_districts  WHERE school_id IN (248, 99) AND season_id = 2;
DELETE FROM boys_school_regions    WHERE school_id IN (248, 99) AND season_id = 2;
DELETE FROM boys_school_conferences WHERE school_id IN (248, 99) AND season_id = 2;

-- Also remove from the roster grade import tool's visible list
UPDATE roster_grade_import
SET status = 'skipped'
WHERE school_id IN (248, 99)
  AND status IN ('pending', 'school_matched');
