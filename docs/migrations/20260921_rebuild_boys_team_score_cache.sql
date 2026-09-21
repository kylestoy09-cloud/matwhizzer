-- docs/migrations/20260921_rebuild_boys_team_score_cache.sql
--
-- BOYS ONLY. Rebuilds precomputed_team_scores for every boys postseason
-- tournament (districts, regions, state) in 2024-25 and 2025-26 from the
-- scoring RPCs. top_postseason_team_scores reads ONLY this cache (CLAUDE.md),
-- and it had drifted from the bracket data:
--
--   audit 2026-09-21, cache vs live RPC, 1,233 cached boys rows:
--     108 schools missing (e.g. 2024-25 District 31 had no rows at all;
--         2024-25 Region 2 was missing St Joseph (Montvale), 215 pts)
--     682 stale totals (typically 3-26 pts off)
--      24 rows for schools that no longer score in that tournament
--
-- The scoring functions have not changed since the cache was last written
-- (2026-07-22); the bracket data has (bout backfills, school merges, entries
-- re-pointed). So the live RPC output is the correct current value.
--
-- Names are written as of each season via school_display_name() (added by
-- 20260921_restore_lodi_saddle_brook.sql — run that first).
--
-- Delete + re-insert happen per tournament inside one DO block, so either the
-- whole rebuild lands or none of it does. Girls rows are not touched.

-- ── DRY RUN (read-only): current boys cache rows per season/type ────────────
SELECT t.season_id, t.tournament_type, COUNT(p.*) AS cached_rows
FROM tournaments t
LEFT JOIN precomputed_team_scores p ON p.tournament_id = t.id
WHERE t.season_id IN (2025, 2026) AND t.name LIKE 'Boy\_s %'
  AND t.tournament_type IN ('districts', 'regions', 'boys_state')
GROUP BY 1, 2 ORDER BY 1, 2;

DO $$
DECLARE
  t      record;
  ttype  text;
  n_del  integer := 0;
  n_ins  integer := 0;
  c      integer;
BEGIN
  IF to_regprocedure('school_display_name(integer,integer,text)') IS NULL THEN
    RAISE EXCEPTION 'school_display_name() missing — run 20260921_restore_lodi_saddle_brook.sql first';
  END IF;

  FOR t IN
    SELECT id, name, season_id, tournament_type
    FROM tournaments
    WHERE season_id IN (2025, 2026)
      AND name LIKE 'Boy\_s %'
      AND tournament_type IN ('districts', 'regions', 'boys_state')
    ORDER BY id
  LOOP
    ttype := CASE t.tournament_type
               WHEN 'districts' THEN 'boys_districts'
               WHEN 'regions'   THEN 'regions'
               ELSE 'boys_state' END;

    DELETE FROM precomputed_team_scores WHERE tournament_id = t.id;
    GET DIAGNOSTICS c = ROW_COUNT; n_del := n_del + c;

    IF t.tournament_type = 'districts' THEN
      INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      SELECT t.id, r.school_id, school_display_name(r.school_id, t.season_id, 'M'), r.total_points, t.season_id, ttype
      FROM district_team_score(substring(t.name from 'District (\d+)')::integer, 'M'::gender_type, t.season_id::smallint) r
      WHERE r.school_id IS NOT NULL;
    ELSIF t.tournament_type = 'regions' THEN
      INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      SELECT t.id, r.school_id, school_display_name(r.school_id, t.season_id, 'M'), r.total_points, t.season_id, ttype
      FROM region_team_score(substring(t.name from 'Regions r(\d+)')::integer, 'M'::gender_type, t.season_id::smallint) r
      WHERE r.school_id IS NOT NULL;
    ELSE
      INSERT INTO precomputed_team_scores (tournament_id, school_id, school_name, total_points, season_id, tournament_type)
      SELECT t.id, r.school_id, school_display_name(r.school_id, t.season_id, 'M'), r.total_points, t.season_id, ttype
      FROM state_team_score('M'::gender_type, t.season_id::smallint) r
      WHERE r.school_id IS NOT NULL;
    END IF;
    GET DIAGNOSTICS c = ROW_COUNT; n_ins := n_ins + c;
  END LOOP;

  RAISE NOTICE 'Boys team-score cache rebuilt: % rows removed, % rows inserted', n_del, n_ins;
END $$;

-- Verify: same breakdown as the dry run (expect ~1,317 rows: 1,233 - 24 + 108)
SELECT t.season_id, t.tournament_type, COUNT(p.*) AS cached_rows
FROM tournaments t
LEFT JOIN precomputed_team_scores p ON p.tournament_id = t.id
WHERE t.season_id IN (2025, 2026) AND t.name LIKE 'Boy\_s %'
  AND t.tournament_type IN ('districts', 'regions', 'boys_state')
GROUP BY 1, 2 ORDER BY 1, 2;

-- ROLLBACK: none automatic (the old values were stale). Re-running this
-- migration is always safe and reproduces the cache from current data.
