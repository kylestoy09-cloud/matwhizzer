-- docs/migrations/20261026_guard_protected_deletes.sql
--
-- Blocks deletes of postseason data and of NJ school / program rows unless the
-- transaction deliberately allows them.
--
-- Why: on 2026-09-17 a girls-only NJ school (381 Mary Help of Christians
-- Academy) showed up on a boys list. It was deleted as a "boys shell school",
-- and each foreign-key error was cleared by deleting the referencing rows:
-- postseason entries, matches and placements. That erased a state-placing
-- wrestler's season (restored by 20261026_restore_mary_help_kayla_coletta.sql).
-- With this guard, the first of those DELETEs fails with a message saying what
-- it is protecting, and getting past it takes an explicit line in the script.
--
-- Protected (BEFORE DELETE, every row):
--   tournament_entries, matches, placements, tournaments   — postseason brackets
--   schools (is_nj = true only)                            — NJ schools; OOS merges
--                                                            (/api/admin/oos-schools) still work
--   boys_schools, girls_schools                            — a gender's program rows
--
-- The app never deletes these rows (checked 2026-10-26: no route, RPC or
-- trigger does). Only manual SQL, scripts and the admin data browser do, and
-- those are what this guard is for.
--
-- To delete on purpose, after counting what references the rows, backing them
-- up and getting approval (CLAUDE.md, "Deleting Data"), run in the SAME
-- transaction / DO block:
--   PERFORM set_config('matwhizzer.allow_protected_delete', 'on', true);   -- inside DO $$
--   SET LOCAL matwhizzer.allow_protected_delete = 'on';                    -- plain SQL
-- The setting is transaction-local and resets on its own.

CREATE OR REPLACE FUNCTION guard_protected_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'schools' AND OLD.is_nj IS DISTINCT FROM true THEN
    RETURN OLD;   -- out-of-state school stubs can be merged away
  END IF;
  IF current_setting('matwhizzer.allow_protected_delete', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Delete from % is blocked: protected postseason / school data (row: %)',
      TG_TABLE_NAME, left(row_to_json(OLD)::text, 300)
      USING HINT = 'Count what references it, back it up, get approval, then set matwhizzer.allow_protected_delete = on for this transaction (see docs/migrations/20261026_guard_protected_deletes.sql).';
  END IF;
  RETURN OLD;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tournament_entries', 'matches', 'placements', 'tournaments',
                           'schools', 'boys_schools', 'girls_schools']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_protected_delete ON %I', t);
    EXECUTE format('CREATE TRIGGER guard_protected_delete BEFORE DELETE ON %I
                    FOR EACH ROW EXECUTE FUNCTION guard_protected_delete()', t);
  END LOOP;
END $$;

-- Verify: expect 7 rows
SELECT event_object_table AS table_name, trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'guard_protected_delete'
ORDER BY 1;

-- Test (rolls back either way): the DELETE must fail with "Delete from schools is blocked"
-- BEGIN; DELETE FROM schools WHERE id = 381; ROLLBACK;

-- ROLLBACK:
-- DO $$ DECLARE t text; BEGIN
--   FOREACH t IN ARRAY ARRAY['tournament_entries','matches','placements','tournaments','schools','boys_schools','girls_schools']
--   LOOP EXECUTE format('DROP TRIGGER IF EXISTS guard_protected_delete ON %I', t); END LOOP;
-- END $$;
-- DROP FUNCTION IF EXISTS guard_protected_delete();
