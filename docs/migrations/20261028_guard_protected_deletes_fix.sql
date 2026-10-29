-- docs/migrations/20261028_guard_protected_deletes_fix.sql
--
-- Fixes guard_protected_delete() from 20261026_guard_protected_deletes.sql.
-- Its first check read OLD.is_nj on every protected table; PL/pgSQL does not
-- short-circuit `TG_TABLE_NAME = 'schools' AND OLD.is_nj ...`, so on the other
-- six tables (matches, tournament_entries, ...) the trigger raised
-- `record "old" has no field "is_nj"` — every delete failed, including ones
-- with the deliberate unlock set (found 2026-10-28 running
-- 20261028_remove_d15_forfeit_placeholder.sql; nothing was deleted).
-- The table check is now nested, and is_nj is read through to_jsonb so the
-- function never references a column a table might not have.

CREATE OR REPLACE FUNCTION guard_protected_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'schools' THEN
    IF (to_jsonb(OLD) ->> 'is_nj')::boolean IS DISTINCT FROM true THEN
      RETURN OLD;   -- out-of-state school stubs can be merged away
    END IF;
  END IF;
  IF current_setting('matwhizzer.allow_protected_delete', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Delete from % is blocked: protected postseason / school data (row: %)',
      TG_TABLE_NAME, left(row_to_json(OLD)::text, 300)
      USING HINT = 'Count what references it, back it up, get approval, then set matwhizzer.allow_protected_delete = on for this transaction (see docs/migrations/20261026_guard_protected_deletes.sql).';
  END IF;
  RETURN OLD;
END;
$$;

-- Test (each rolls back): both must fail with "... is blocked", not "has no field"
-- BEGIN; DELETE FROM matches  WHERE id = '68d3e371-d574-4b11-96d1-ebc2593e035b'; ROLLBACK;
-- BEGIN; DELETE FROM schools WHERE id = 381; ROLLBACK;
