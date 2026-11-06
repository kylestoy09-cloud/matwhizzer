-- docs/migrations/20261105_merge_william_penn_charter.sql
--
-- "William Penn Charter School" #1202 and "William Penn Charter" #899 are one school (Kyle,
-- 2026-11-05). Both non-NJ. #1202 had 1 boys dual and 1 dual bout; #899 3 tournament bouts.
-- Keeps #899: every column with a foreign key to schools(id) is moved from 1202 to 899, found
-- from the catalog so no table is missed (the OOS merge tool skips duals). Then #1202 is deleted.
-- A unique-key clash or a reference left behind aborts the whole thing.
-- Run in the Supabase SQL editor.

DO $$
DECLARE
  r record;
  n integer;
BEGIN
  IF (SELECT count(*) FROM schools WHERE id IN (899, 1202)) <> 2 THEN
    RAISE EXCEPTION 'expected schools 899 and 1202';
  END IF;
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f' AND c.confrelid = 'public.schools'::regclass
  LOOP
    EXECUTE format('UPDATE %s SET %I = 899 WHERE %I = 1202', r.tbl, r.col, r.col);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE '%.%: % rows', r.tbl, r.col, n; END IF;
  END LOOP;
  DELETE FROM schools WHERE id = 1202;
END $$;

-- Verify: one row, William Penn Charter #899
SELECT id, display_name, is_nj FROM schools WHERE id IN (899, 1202);
