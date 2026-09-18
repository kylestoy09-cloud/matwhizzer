-- docs/migrations/20260907_fix_girls_district_assignments.sql
--
-- Corrects girls_school_districts misassignments for season 2 (2025-26).
-- Source of truth: NJSIAA Girls Wrestling District/Region Alignment 2025-2026
-- PDF: "2026-girls-districts-regions-alignment.pdf"
--
-- D1–D4, D7–D10 were all correct after the Jefferson→Jefferson-Sparta fix.
--
-- Issues found and fixed:
--
--   D5 → D6: Woodbridge (187) was in District 5, belongs in District 6.
--   Both districts are North II Region (11) — no region change needed.
--
--   D11 → D12: Timber Creek (301), Washington Township (302),
--   Williamstown (303), Winslow (304) were in District 11, belong in District 12.
--   Both districts are South Region (12) — no region change needed.

-- Move Woodbridge from D5 to D6
UPDATE girls_school_districts
SET district_id = 6
WHERE school_id = 187 AND season_id = 2;

-- Move Timber Creek, Washington Township, Williamstown, Winslow from D11 to D12
UPDATE girls_school_districts
SET district_id = 12
WHERE school_id IN (301, 302, 303, 304) AND season_id = 2;

-- Verify
SELECT gsd.district_id, s.id, s.display_name
FROM girls_school_districts gsd
JOIN schools s ON s.id = gsd.school_id
WHERE gsd.season_id = 2 AND s.id IN (187, 301, 302, 303, 304)
ORDER BY gsd.district_id, s.display_name;
-- Expected: Woodbridge in D6; Timber Creek/Washington Township/Williamstown/Winslow in D12.
