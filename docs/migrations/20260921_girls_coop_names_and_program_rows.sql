-- docs/migrations/20260921_girls_coop_names_and_program_rows.sql
--
-- GIRLS ONLY. Makes girls imports resolve co-op team names, before importing
-- the remaining 2025-26 jamboree and one/two-bout meets.
--
-- The girls importers now match school names against that season's girls
-- program (season-aware, like the review screen). Four co-ops that already have
-- 2025-26 duals fail to match:
--   "Buena Regional/Vineland"            (24 meets)  host 287 Buena
--   "Cherry Hill East/Cherry Hill West"  (16 meets)  host 267 Cherry Hill East
--   "Jefferson-Sparta"                   (17 meets)  host   4 Jefferson
--   "Ramsey/Northern Highlands"          (21 meets)  host  18 Ramsey
-- Their hosts carry the co-op data (girls_schools display names
-- "Buena-Vineland", "Cherry Hill East-West", "Jefferson-Sparta",
-- "Ramsey-Northern Highlands") but have no alias for the raw co-op name and are
-- missing from the 2025-26 girls program list.
--
-- 1. Girls-only aliases (notes = 'gender:F', checked before exact-name match;
--    boys matching is unaffected) for the raw co-op names and the girls display
--    names → host school.
-- 2. 2025-26 girls district + region rows, insert-only, for NJ schools that
--    wrestled a 2025-26 girls district bracket but have no girls district row
--    (expect 6: Jefferson, Old Tappan, Ramsey → D1; Cherry Hill East → D11;
--    Buena, Millville → D12). Region = the region every other school in that
--    district is assigned (D1-3 North I, D4-6 North II, D7-9 Central,
--    D10-12 South). Existing rows are not changed.
-- East Orange, Roselle and Keansburg (6 duals between them) have no girls
-- bracket entries, so no district can be derived; imports will ask for a pick.

-- ── DRY RUN (read-only) ─────────────────────────────────────────────────────
SELECT s.id, s.display_name, substring(t.name from 'District (\d+)')::integer AS bracket_district, COUNT(*) AS entries
FROM tournament_entries te
JOIN tournaments t ON t.id = te.tournament_id
JOIN schools s     ON s.id = te.school_id AND s.is_nj
WHERE t.season_id = 2026 AND t.name LIKE 'Girl\_s Districts District %'
  AND NOT EXISTS (SELECT 1 FROM girls_school_districts d WHERE d.school_id = te.school_id AND d.season_id = 2026)
GROUP BY 1, 2, 3 ORDER BY 3, 2;

DO $$
DECLARE n_a integer; n_d integer; n_r integer;
BEGIN
  -- ── 1. Girls-only co-op aliases ───────────────────────────────────────────
  INSERT INTO school_aliases (school_id, alias, alias_type, notes)
  SELECT v.school_id, v.alias, 'nj', 'gender:F'
  FROM (VALUES
    (287, 'Buena Regional/Vineland'),
    (287, 'Buena-Vineland'),
    (267, 'Cherry Hill East/Cherry Hill West'),
    (267, 'Cherry Hill East-West'),
    (  4, 'Jefferson-Sparta'),
    ( 18, 'Ramsey/Northern Highlands'),
    ( 18, 'Ramsey-Northern Highlands')
  ) AS v(school_id, alias)
  WHERE NOT EXISTS (SELECT 1 FROM school_aliases a WHERE lower(a.alias) = lower(v.alias));
  GET DIAGNOSTICS n_a = ROW_COUNT;

  -- ── 2. 2025-26 girls program rows from brackets (insert-only) ─────────────
  INSERT INTO girls_school_districts (school_id, season_id, district_id)
  SELECT b.school_id, 2026, b.district_id
  FROM (
    SELECT DISTINCT ON (te.school_id) te.school_id, substring(t.name from 'District (\d+)')::integer AS district_id
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN schools s     ON s.id = te.school_id AND s.is_nj
    WHERE t.season_id = 2026 AND t.name LIKE 'Girl\_s Districts District %'
    GROUP BY te.school_id, t.name
    ORDER BY te.school_id, COUNT(*) DESC
  ) b
  WHERE NOT EXISTS (SELECT 1 FROM girls_school_districts d WHERE d.school_id = b.school_id AND d.season_id = 2026);
  GET DIAGNOSTICS n_d = ROW_COUNT;

  IF n_d > 10 THEN
    RAISE EXCEPTION 'Expected about 6 missing girls district rows, found % — stopping', n_d;
  END IF;

  INSERT INTO girls_school_regions (school_id, season_id, region_id)
  SELECT d.school_id, 2026, m.region_id
  FROM girls_school_districts d
  JOIN LATERAL (
    SELECT r.region_id
    FROM girls_school_districts d2
    JOIN girls_school_regions r ON r.school_id = d2.school_id AND r.season_id = 2026
    WHERE d2.season_id = 2026 AND d2.district_id = d.district_id
    GROUP BY r.region_id ORDER BY COUNT(*) DESC LIMIT 1
  ) m ON true
  WHERE d.season_id = 2026
    AND NOT EXISTS (SELECT 1 FROM girls_school_regions r WHERE r.school_id = d.school_id AND r.season_id = 2026);
  GET DIAGNOSTICS n_r = ROW_COUNT;

  RAISE NOTICE 'Aliases added %, girls district rows added %, girls region rows added %', n_a, n_d, n_r;
END $$;

-- Verify: the six schools now have 2025-26 girls district + region rows
SELECT s.id, s.display_name, d.district_id, r.region_id
FROM schools s
JOIN girls_school_districts d ON d.school_id = s.id AND d.season_id = 2026
LEFT JOIN girls_school_regions r ON r.school_id = s.id AND r.season_id = 2026
WHERE s.id IN (4, 6, 18, 267, 287, 292) ORDER BY d.district_id, s.display_name;

-- ROLLBACK:
-- DELETE FROM school_aliases WHERE notes = 'gender:F' AND alias IN ('Buena Regional/Vineland','Buena-Vineland',
--   'Cherry Hill East/Cherry Hill West','Cherry Hill East-West','Jefferson-Sparta','Ramsey/Northern Highlands','Ramsey-Northern Highlands');
-- DELETE FROM girls_school_regions   WHERE season_id = 2026 AND school_id IN (4, 6, 18, 267, 287, 292);
-- DELETE FROM girls_school_districts WHERE season_id = 2026 AND school_id IN (4, 6, 18, 267, 287, 292);
