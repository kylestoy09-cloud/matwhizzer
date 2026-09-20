-- docs/migrations/20260919_rekey_seasons_championship_year.sql
--
-- Re-keys seasons by championship (ending) year: 1 → 2025, 2 → 2026, 3 → 2027.
-- Display labels ("2025-26") are unchanged.
--
-- PREREQUISITES
--   * Phase 1 code deployed (commit bbf2384) — code no longer hardcodes season numbers.
--   * Fresh database backup taken immediately before running.
--
-- Runs as one DO block: any error or failed check rolls back everything.

DO $$
DECLARE
  r            record;
  v_mismatch   text;
BEGIN
  -- ── 0. Guards ─────────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM seasons WHERE end_year IS NULL) THEN
    RAISE EXCEPTION 'seasons.end_year is NULL for some season';
  END IF;
  IF (SELECT count(*) FROM seasons) <> (SELECT count(DISTINCT end_year) FROM seasons) THEN
    RAISE EXCEPTION 'seasons.end_year is not unique';
  END IF;
  IF EXISTS (SELECT 1 FROM seasons WHERE id = end_year) THEN
    RAISE EXCEPTION 'Some seasons already use end_year as id — migration already applied?';
  END IF;

  -- Old id → new id
  CREATE TEMP TABLE _season_map ON COMMIT DROP AS
    SELECT id AS old_id, end_year AS new_id FROM seasons;

  -- ── 1. Snapshot row counts per season for every season_id column ─────────
  CREATE TEMP TABLE _before (tbl text, season_id int, n bigint) ON COMMIT DROP;
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'season_id'
      AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
  LOOP
    EXECUTE format(
      'INSERT INTO _before SELECT %L, m.new_id, count(*) FROM %I t JOIN _season_map m ON m.old_id = t.season_id GROUP BY m.new_id',
      r.table_name, r.table_name);
  END LOOP;

  -- ── 2. Foreign keys to seasons: add ON UPDATE CASCADE (keeps ON DELETE) ──
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE contype = 'f' AND confrelid = 'public.seasons'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s ON UPDATE CASCADE', r.tbl, r.conname, r.def);
  END LOOP;

  -- ── 3. Re-key seasons (cascades to all 32 FK tables) ─────────────────────
  UPDATE seasons s SET id = m.new_id FROM _season_map m WHERE s.id = m.old_id;

  -- ── 4. season_id columns without a foreign key ───────────────────────────
  UPDATE precomputed_team_scores t SET season_id = m.new_id FROM _season_map m WHERE t.season_id = m.old_id;
  UPDATE season_calendar         t SET season_id = m.new_id FROM _season_map m WHERE t.season_id = m.old_id;

  -- ── 5. Season ids stored inside JSON ─────────────────────────────────────
  UPDATE microcheck_tasks t
  SET metadata = jsonb_set(t.metadata, '{season_id}', to_jsonb(m.new_id))
  FROM _season_map m
  WHERE (t.metadata->>'season_id')::int = m.old_id;

  -- ── 6. school_coops.season: start year → championship year ──────────────
  -- PENDING: confirm current values first (SELECT season, gender, count(*) FROM school_coops GROUP BY 1,2).
  -- UPDATE school_coops SET season = season + 1;

  -- ── 7. Verify: identical counts per season, no orphans ───────────────────
  FOR r IN SELECT DISTINCT tbl FROM _before LOOP
    EXECUTE format($q$
      SELECT string_agg(format('%%s season %%s: before %%s, after %%s', %L, b.season_id, b.n, coalesce(a.n, 0)), '; ')
      FROM (SELECT season_id, n FROM _before WHERE tbl = %L) b
      FULL JOIN (SELECT season_id, count(*) AS n FROM %I WHERE season_id IS NOT NULL GROUP BY season_id) a USING (season_id)
      WHERE b.n IS DISTINCT FROM a.n
    $q$, r.tbl, r.tbl, r.tbl) INTO v_mismatch;
    IF v_mismatch IS NOT NULL THEN
      RAISE EXCEPTION 'Row counts changed — rolling back: %', v_mismatch;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM precomputed_team_scores WHERE season_id NOT IN (SELECT id FROM seasons))
  OR EXISTS (SELECT 1 FROM season_calendar         WHERE season_id NOT IN (SELECT id FROM seasons)) THEN
    RAISE EXCEPTION 'Orphaned season_id in a column without a foreign key';
  END IF;

  RAISE NOTICE 'Seasons re-keyed to championship year';
END $$;

-- Result: expect 2025, 2026, 2027
SELECT id, year_label, start_year, end_year FROM seasons ORDER BY id;

-- ── REVERSE (only if needed; also restore functions/data from backup if anything else changed) ──
-- Same structure with the map inverted: new_id = end_year → old_id (2025→1, 2026→2, 2027→3),
-- and school_coops.season - 1 if step 6 was applied.
