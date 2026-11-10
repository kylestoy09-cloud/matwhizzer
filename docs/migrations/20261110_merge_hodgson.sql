-- docs/migrations/20261110_merge_hodgson.sql
--
-- Hodgson (Delaware) was entered twice (Kyle 2026-11-10: merge). Both girls only.
--   keep #1118 Hodgson Vo Tech School (21 girls tournament bouts, 6 placements, 7 name links, 1 team score)
--   ← #1108 Hodgson (6 girls tournament bouts, 2 name links, 1 team score; different tournament, no clash)
-- As 20261106_merge_oos_duplicate_schools.sql: a name link the kept school already has is dropped, every column
-- with a foreign key to schools(id) is moved (found from the catalog), and the emptied school is deleted.
-- The name waits on the out-of-state naming decision. Before: backups/20261110_merge_hodgson_before.json.
-- Run in the Supabase SQL editor.

DO $$
DECLARE
  r record; n integer;
  keep_id constant integer := 1118; dup_id constant integer := 1108;
BEGIN
  IF (SELECT count(*) FROM schools WHERE id IN (keep_id, dup_id) AND is_nj = false) <> 2 THEN
    RAISE EXCEPTION 'expected out-of-state schools % and %', keep_id, dup_id;
  END IF;
  DELETE FROM wrestler_name_aliases d WHERE d.school_id = dup_id
    AND EXISTS (SELECT 1 FROM wrestler_name_aliases k WHERE k.school_id = keep_id AND k.raw_name = d.raw_name);
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col
    FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f' AND c.confrelid = 'public.schools'::regclass
  LOOP
    EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', r.tbl, r.col, r.col) USING keep_id, dup_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE '% → %: %.% % rows', dup_id, keep_id, r.tbl, r.col, n; END IF;
  END LOOP;
  DELETE FROM schools WHERE id = dup_id;
END $$;

-- Verify: one row, 1118
SELECT id, display_name, is_nj FROM schools WHERE id IN (1108, 1118);
