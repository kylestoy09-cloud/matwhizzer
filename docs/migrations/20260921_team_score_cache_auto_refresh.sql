-- docs/migrations/20260921_team_score_cache_auto_refresh.sql
--
-- BOYS ONLY. Keeps precomputed_team_scores in step with the bracket data
-- automatically, so it can't drift again (it had: 108 missing schools, 682
-- stale totals, 24 obsolete rows — rebuilt by
-- 20260921_rebuild_boys_team_score_cache.sql).
--
-- How:
--   1. refresh_boys_team_score_cache(season) — rebuilds every boys district,
--      region and state tournament of one season from the scoring RPCs (same
--      logic as the rebuild migration), names as of that season.
--   2. Triggers on tournament_entries and matches (what the scoring reads) mark
--      the season "dirty" in team_score_cache_dirty whenever a boys postseason
--      tournament's rows change. Whole season, because region and state scores
--      take each wrestler's school from their district entry.
--   3. pg_cron runs refresh_dirty_team_score_caches() every 5 minutes: it
--      rebuilds each dirty season once, however many writes marked it.
--
-- Marking is one small insert per statement, so imports don't slow down.
-- To refresh immediately instead of waiting: SELECT refresh_boys_team_score_cache(2026);
-- Girls are not covered yet (handled separately).

-- ── 1. Refresh one season ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_boys_team_score_cache(p_season integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  t     record;
  ttype text;
  c     integer;
  n     integer := 0;
BEGIN
  FOR t IN
    SELECT id, name, season_id, tournament_type
    FROM tournaments
    WHERE season_id = p_season
      AND name LIKE 'Boy\_s %'
      AND tournament_type IN ('districts', 'regions', 'boys_state')
    ORDER BY id
  LOOP
    ttype := CASE t.tournament_type
               WHEN 'districts' THEN 'boys_districts'
               WHEN 'regions'   THEN 'regions'
               ELSE 'boys_state' END;

    DELETE FROM precomputed_team_scores WHERE tournament_id = t.id;

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
    GET DIAGNOSTICS c = ROW_COUNT; n := n + c;
  END LOOP;
  RETURN n;
END $$;

-- ── 2. Dirty marks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_score_cache_dirty (
  season_id integer     NOT NULL,
  gender    text        NOT NULL CHECK (gender IN ('M', 'F')),
  marked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, gender)
);
ALTER TABLE team_score_cache_dirty ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON team_score_cache_dirty FROM anon, authenticated;
GRANT ALL ON team_score_cache_dirty TO postgres, service_role;

-- SECURITY DEFINER so writes by any role (API, service key, scripts) can mark.
CREATE OR REPLACE FUNCTION mark_team_score_cache_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO team_score_cache_dirty (season_id, gender)
    SELECT DISTINCT t.season_id, 'M' FROM new_rows n JOIN tournaments t ON t.id = n.tournament_id
    WHERE t.name LIKE 'Boy\_s %' AND t.tournament_type IN ('districts', 'regions', 'boys_state')
    ON CONFLICT (season_id, gender) DO UPDATE SET marked_at = now();
  END IF;
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    INSERT INTO team_score_cache_dirty (season_id, gender)
    SELECT DISTINCT t.season_id, 'M' FROM old_rows o JOIN tournaments t ON t.id = o.tournament_id
    WHERE t.name LIKE 'Boy\_s %' AND t.tournament_type IN ('districts', 'regions', 'boys_state')
    ON CONFLICT (season_id, gender) DO UPDATE SET marked_at = now();
  END IF;
  RETURN NULL;
END $$;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tournament_entries', 'matches'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', tbl || '_team_score_dirty_ins', tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', tbl || '_team_score_dirty_upd', tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', tbl || '_team_score_dirty_del', tbl);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT ON %I REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION mark_team_score_cache_dirty()', tbl || '_team_score_dirty_ins', tbl);
    EXECUTE format('CREATE TRIGGER %I AFTER UPDATE ON %I REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION mark_team_score_cache_dirty()', tbl || '_team_score_dirty_upd', tbl);
    EXECUTE format('CREATE TRIGGER %I AFTER DELETE ON %I REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION mark_team_score_cache_dirty()', tbl || '_team_score_dirty_del', tbl);
  END LOOP;
END $$;

-- ── 3. Scheduled refresh ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_dirty_team_score_caches()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE d record;
BEGIN
  -- Claim the marks first; writes during the refresh re-mark for the next run.
  FOR d IN DELETE FROM team_score_cache_dirty WHERE gender = 'M' RETURNING season_id LOOP
    PERFORM refresh_boys_team_score_cache(d.season_id);
  END LOOP;
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('refresh-boys-team-score-cache', '*/5 * * * *', 'SELECT public.refresh_dirty_team_score_caches()');

-- Verify: triggers present, job scheduled, a refresh reproduces the cache
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%team_score_dirty%' ORDER BY 1;
SELECT jobname, schedule FROM cron.job WHERE jobname = 'refresh-boys-team-score-cache';
SELECT refresh_boys_team_score_cache(2026) AS rows_2026;

-- ROLLBACK:
-- SELECT cron.unschedule('refresh-boys-team-score-cache');
-- DROP TRIGGER tournament_entries_team_score_dirty_ins ON tournament_entries; (and _upd, _del; same for matches)
-- DROP FUNCTION refresh_dirty_team_score_caches(); DROP FUNCTION mark_team_score_cache_dirty();
-- DROP FUNCTION refresh_boys_team_score_cache(integer); DROP TABLE team_score_cache_dirty;
