-- docs/migrations/20261105_wrestler_name_checks.sql
--
-- A wrestler profile must have a first and last name, with no parentheses.
-- The 2026-03-20 postseason load split "Charles (CJ) Palmisano", "Terrance (James) Fearon" and
-- "Arjun (Danny) Monga" at the "(" and made profiles with no last name; the 2026-08-06 dual
-- import kept "Pinhao (Alex)" as a first name. Fixed by scripts/merge_paren_names_20261105.mts.
-- Importers now drop a nickname in parentheses (stripNickname, src/lib/personName.ts); these
-- checks make any other path (a script, the SQL editor) fail instead of creating such a profile.
-- "Unknown" is the placeholder profile for an unnamed opponent and keeps a blank last name.
--
-- Run AFTER `merge_paren_names_20261105.mts --delete` has removed the two emptied profiles.
-- Run in the Supabase SQL editor.

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM wrestlers
  WHERE first_name ~ '[()]' OR coalesce(last_name, '') ~ '[()]'
     OR btrim(coalesce(first_name, '')) = ''
     OR (btrim(coalesce(last_name, '')) = '' AND first_name <> 'Unknown');
  IF n > 0 THEN RAISE EXCEPTION '% profiles break the name rules: fix them first', n; END IF;

  ALTER TABLE wrestlers ADD CONSTRAINT wrestlers_name_no_parentheses
    CHECK (first_name !~ '[()]' AND coalesce(last_name, '') !~ '[()]');
  ALTER TABLE wrestlers ADD CONSTRAINT wrestlers_name_present
    CHECK (btrim(first_name) <> '' AND (btrim(coalesce(last_name, '')) <> '' OR first_name = 'Unknown'));
END $$;

-- Verify: expect both constraints
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.wrestlers'::regclass AND conname LIKE 'wrestlers_name_%';

-- ROLLBACK:
-- ALTER TABLE wrestlers DROP CONSTRAINT wrestlers_name_no_parentheses;
-- ALTER TABLE wrestlers DROP CONSTRAINT wrestlers_name_present;
