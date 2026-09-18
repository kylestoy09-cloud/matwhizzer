-- docs/migrations/20260907_fix_girls_coop_enrollments.sql
--
-- Fixes two co-op school mismatches in girls_school_districts and girls_school_regions
-- for season 2 (2025-26), identified by auditing all combined programs against the
-- official NJSIAA Girls Wrestling District/Region Alignment PDF.
--
-- Fix 1: Ramsey (18) → Ramsey/Northern Highlands (392) in District 1 / Region 10
--   The solo "Ramsey" school was enrolled instead of the correct co-op entity.
--
-- Fix 2: Cherry Hill East (267) + Cherry Hill West (268) → Cherry Hill East/Cherry Hill West (363)
--   Both solo schools were enrolled separately in District 11 / Region 12.
--   They compete as one combined program — the correct entity is ID 363.

-- ── girls_school_districts ────────────────────────────────────────────────────

DELETE FROM girls_school_districts WHERE school_id = 18 AND season_id = 2;
INSERT INTO girls_school_districts (school_id, district_id, season_id) VALUES (392, 1, 2)
ON CONFLICT DO NOTHING;

DELETE FROM girls_school_districts WHERE school_id IN (267, 268) AND season_id = 2;
INSERT INTO girls_school_districts (school_id, district_id, season_id) VALUES (363, 11, 2)
ON CONFLICT DO NOTHING;

-- ── girls_school_regions ─────────────────────────────────────────────────────

DELETE FROM girls_school_regions WHERE school_id = 18 AND season_id = 2;
INSERT INTO girls_school_regions (school_id, region_id, season_id) VALUES (392, 10, 2)
ON CONFLICT DO NOTHING;

DELETE FROM girls_school_regions WHERE school_id IN (267, 268) AND season_id = 2;
INSERT INTO girls_school_regions (school_id, region_id, season_id) VALUES (363, 12, 2)
ON CONFLICT DO NOTHING;

-- Verify: only 392 and 363 should appear; 18, 267, 268 absent
SELECT 'districts' AS tbl, gsd.district_id, s.id, s.display_name
FROM girls_school_districts gsd JOIN schools s ON s.id = gsd.school_id
WHERE gsd.season_id = 2 AND s.id IN (18, 267, 268, 363, 392)
UNION ALL
SELECT 'regions', gsr.region_id, s.id, s.display_name
FROM girls_school_regions gsr JOIN schools s ON s.id = gsr.school_id
WHERE gsr.season_id = 2 AND s.id IN (18, 267, 268, 363, 392)
ORDER BY tbl, 2, 3;
