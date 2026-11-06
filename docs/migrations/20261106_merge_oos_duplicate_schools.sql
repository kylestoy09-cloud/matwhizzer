-- docs/migrations/20261106_merge_oos_duplicate_schools.sql
--
-- Out-of-state schools entered twice under two names (Kyle, 2026-11-06: merge). Each split a
-- wrestler across two profiles (20261106_merge_oos_duplicate_profiles.sql: run that first).
--   keep #689 Delmar                       ← #814 Delmar Junior-Senior (3 tournament bouts, 3 links)
--   keep #522 Blair Academy                ← #749 Blair Academy (B Team) (1 dual: North Hunterdon 12/19, 14 bouts, 7 links)
--   keep #923 Immaculate Conception (IL)   ← #832 IC Catholic Prep (1 tournament bout, 1 link)
-- For each, a name link the kept school already has is dropped instead of duplicated, every column
-- with a foreign key to schools(id) is moved (found from the catalog, as in
-- 20261105_merge_william_penn_charter.sql), and the emptied school is deleted.
-- Before: backups/20261106_merge_oos_duplicate_schools_before.json. Run in the Supabase SQL editor.

DO $$
DECLARE
  p record; r record; n integer;
BEGIN
  FOR p IN SELECT * FROM (VALUES
    (689, 814),   -- Delmar
    (522, 749),   -- Blair Academy
    (923, 832)    -- Immaculate Conception (IL)
  ) AS v(keep_id, dup_id) LOOP
    IF (SELECT count(*) FROM schools WHERE id IN (p.keep_id, p.dup_id) AND is_nj = false) <> 2 THEN
      RAISE EXCEPTION 'expected out-of-state schools % and %', p.keep_id, p.dup_id;
    END IF;
    DELETE FROM wrestler_name_aliases d WHERE d.school_id = p.dup_id
      AND EXISTS (SELECT 1 FROM wrestler_name_aliases k WHERE k.school_id = p.keep_id AND k.raw_name = d.raw_name);
    FOR r IN
      SELECT c.conrelid::regclass AS tbl, a.attname AS col
      FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'f' AND c.confrelid = 'public.schools'::regclass
    LOOP
      EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', r.tbl, r.col, r.col) USING p.keep_id, p.dup_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n > 0 THEN RAISE NOTICE '% → %: %.% % rows', p.dup_id, p.keep_id, r.tbl, r.col, n; END IF;
    END LOOP;
    DELETE FROM schools WHERE id = p.dup_id;
  END LOOP;
END $$;

-- Verify: three rows, 689 / 522 / 923
SELECT id, display_name, is_nj FROM schools WHERE id IN (689, 814, 522, 749, 923, 832) ORDER BY id;
