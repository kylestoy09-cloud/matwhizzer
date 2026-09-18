-- docs/migrations/20260907_fix_jefferson_girls_district_region.sql
--
-- Fix: Jefferson (ID 4) was incorrectly enrolled in the girls program
-- district/region tables. Jefferson is a boys-only school. The girls co-op
-- is Jefferson-Sparta (ID 372), which was missing from these tables entirely.
--
-- Root cause: 20260826_girls_district_region_assignments.sql used school_id=4
-- for Jefferson before the Jefferson-Sparta co-op school (ID 372) was
-- understood to be the correct girls entity. ID 372 was never added.
--
-- Effect: loadGenderProgramSchoolIds('F', 2) included Jefferson (4) and
-- excluded Jefferson-Sparta (372) from the girls school matching pool.
-- School name matching for girls imports would find Jefferson as an exact NJ
-- match before ever reaching the gender-specific alias redirect.

-- Remove Jefferson (boys school) from girls program
DELETE FROM girls_school_districts WHERE school_id = 4 AND season_id = 2;
DELETE FROM girls_school_regions  WHERE school_id = 4 AND season_id = 2;

-- Add Jefferson-Sparta (girls co-op) to District 1 / Region 10 (North I)
INSERT INTO girls_school_districts (school_id, district_id, season_id) VALUES (372, 1, 2)
ON CONFLICT DO NOTHING;
INSERT INTO girls_school_regions (school_id, region_id, season_id) VALUES (372, 10, 2)
ON CONFLICT DO NOTHING;

-- Verify: Jefferson gone, Jefferson-Sparta present
SELECT 'districts' AS tbl, school_id, district_id FROM girls_school_districts WHERE school_id IN (4, 372) AND season_id = 2
UNION ALL
SELECT 'regions', school_id, region_id FROM girls_school_regions WHERE school_id IN (4, 372) AND season_id = 2;
-- Expected: 2 rows — districts/372/1 and regions/372/10. No rows for school_id=4.
