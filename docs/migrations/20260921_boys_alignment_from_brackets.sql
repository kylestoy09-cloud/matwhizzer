-- docs/migrations/20260921_boys_alignment_from_brackets.sql
--
-- BOYS ONLY. Sets 2024-25 and 2025-26 boys district and region assignments
-- (boys_school_districts / boys_school_regions) from the district brackets each
-- school actually wrestled in.
--
-- Why: the 2024-25 rows were overwritten with the 2025-26 alignment (303 of 305
-- identical), but NJSIAA realigned districts between those seasons. Audit
-- 2026-09-21, list vs bracket:
--                                   2024-25   2025-26
--   schools in district brackets      313       310
--   district on the list wrong        241         2   (Westwood, Kingsway)
--   region on the list wrong            4        33
--   in brackets, missing from list     10         9
--
-- Rules (both verified against the data):
--   district = the "Boy_s Districts District N" bracket the school's entries
--              are in (no school has entries in two districts in either season)
--   region   = the region that district feeds: districts 1-4 → Region 1,
--              5-8 → Region 2, … 29-32 → Region 8 (verified from where each
--              district's qualifiers wrestled; identical in both seasons)
-- Schools on the list with no bracket entries are left unchanged.
-- Conferences are not touched (brackets don't show them).
--
-- boys_bracket_alignment(season) is kept as a function so any future season
-- can be checked or re-aligned the same way once its district brackets exist.
--
-- (Replaces a first version that used a temp table; the SQL editor runs each
-- statement on its own connection, so the table was gone by the next
-- statement and nothing was applied.)

CREATE OR REPLACE FUNCTION boys_bracket_alignment(p_season integer)
RETURNS TABLE(school_id integer, district_id integer, region_id integer)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (te.school_id)
         te.school_id,
         substring(t.name from 'District (\d+)')::integer,
         ((substring(t.name from 'District (\d+)')::integer - 1) / 4) + 1
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  JOIN schools s     ON s.id = te.school_id AND s.is_nj
  WHERE t.season_id = p_season
    AND t.tournament_type = 'districts'
    AND t.name LIKE 'Boy\_s Districts District %'
  GROUP BY te.school_id, t.name
  ORDER BY te.school_id, COUNT(*) DESC
$$;

-- ── DRY RUN (read-only): what will change ───────────────────────────────────
SELECT s.season,
       COUNT(*) FILTER (WHERE d.school_id IS NULL)                                   AS district_added,
       COUNT(*) FILTER (WHERE d.school_id IS NOT NULL AND d.district_id <> b.district_id) AS district_changed,
       COUNT(*) FILTER (WHERE r.school_id IS NULL)                                   AS region_added,
       COUNT(*) FILTER (WHERE r.school_id IS NOT NULL AND r.region_id <> b.region_id)     AS region_changed
FROM unnest(ARRAY[2025, 2026]) AS s(season)
CROSS JOIN LATERAL boys_bracket_alignment(s.season) b
LEFT JOIN boys_school_districts d ON d.school_id = b.school_id AND d.season_id = s.season
LEFT JOIN boys_school_regions   r ON r.school_id = b.school_id AND r.season_id = s.season
GROUP BY s.season ORDER BY 1;

DO $$
DECLARE
  season integer;
  n_d integer; n_r integer; n_di integer; n_ri integer;
BEGIN
  FOREACH season IN ARRAY ARRAY[2025, 2026] LOOP
    IF EXISTS (SELECT 1 FROM boys_bracket_alignment(season) b WHERE b.district_id NOT BETWEEN 1 AND 32) THEN
      RAISE EXCEPTION 'Unexpected district number in % bracket names', season;
    END IF;

    UPDATE boys_school_districts d SET district_id = b.district_id
    FROM boys_bracket_alignment(season) b
    WHERE d.school_id = b.school_id AND d.season_id = season AND d.district_id <> b.district_id;
    GET DIAGNOSTICS n_d = ROW_COUNT;

    INSERT INTO boys_school_districts (school_id, season_id, district_id)
    SELECT b.school_id, season, b.district_id FROM boys_bracket_alignment(season) b
    WHERE NOT EXISTS (SELECT 1 FROM boys_school_districts d WHERE d.school_id = b.school_id AND d.season_id = season);
    GET DIAGNOSTICS n_di = ROW_COUNT;

    UPDATE boys_school_regions r SET region_id = b.region_id
    FROM boys_bracket_alignment(season) b
    WHERE r.school_id = b.school_id AND r.season_id = season AND r.region_id <> b.region_id;
    GET DIAGNOSTICS n_r = ROW_COUNT;

    INSERT INTO boys_school_regions (school_id, season_id, region_id)
    SELECT b.school_id, season, b.region_id FROM boys_bracket_alignment(season) b
    WHERE NOT EXISTS (SELECT 1 FROM boys_school_regions r WHERE r.school_id = b.school_id AND r.season_id = season);
    GET DIAGNOSTICS n_ri = ROW_COUNT;

    RAISE NOTICE '%: districts % changed, % added; regions % changed, % added', season, n_d, n_di, n_r, n_ri;
  END LOOP;
END $$;

-- Verify: expect 0 mismatches for both seasons
SELECT s.season,
       COUNT(*) FILTER (WHERE d.district_id IS DISTINCT FROM b.district_id) AS district_mismatch,
       COUNT(*) FILTER (WHERE r.region_id   IS DISTINCT FROM b.region_id)   AS region_mismatch
FROM unnest(ARRAY[2025, 2026]) AS s(season)
CROSS JOIN LATERAL boys_bracket_alignment(s.season) b
LEFT JOIN boys_school_districts d ON d.school_id = b.school_id AND d.season_id = s.season
LEFT JOIN boys_school_regions   r ON r.school_id = b.school_id AND r.season_id = s.season
GROUP BY s.season ORDER BY 1;

-- ROLLBACK: not automatic — prior 2024-25 values were a copy of 2025-26.
-- To restore that copy: UPDATE boys_school_districts d SET district_id = x.district_id
--   FROM boys_school_districts x WHERE x.school_id = d.school_id AND x.season_id = 2026 AND d.season_id = 2025;
