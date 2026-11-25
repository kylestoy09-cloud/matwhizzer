-- docs/migrations/20261113_backtick_names.sql
--
-- TrackWrestling exports apostrophes as backticks ("O`Neill", "Ja`Son", "St John`s College"), and those names were
-- stored as typed (Kyle 2026-11-13: "Abigail O`Neill" on the Off-Season board). Names shown on the site are cleaned:
--   * a nickname quoted with backticks at the front is dropped ("`Sasha` Yurovskyi" → "Yurovskyi")
--   * a stray backtick at either end is dropped ("Brandon`" → "Brandon", "Izejroski`" → "Izejroski")
--   * any other backtick becomes an apostrophe ("O`Neill" → "O'Neill")
-- Fixed once here, and a trigger cleans every future insert/update, whatever import writes it.
-- Display names only: name links (wrestler_name_aliases.raw_name) and school_aliases keep the text as imported, since
-- imports match on it; wrestler/prospect matching ignores punctuation.
-- Left alone: Joseph "`Mako` Vezzosi" (wrestler dbd3844f, prospect 6367): a second profile of Joseph Vezzosi
-- (1bbd9c6b, class of 2027) exists, so cleaning it would make two identical profiles; waiting on Kyle (merge?).
-- Counts before (backup docs/migrations/backups/20261113_backtick_names.json): wrestlers 121 (42 first, 79 last),
-- prospects 33 (boys 24, girls 8, mixed 1), schools 5, history_finishes 23.
-- Run in the Supabase SQL editor.

BEGIN;

CREATE OR REPLACE FUNCTION clean_backtick_name(x text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN x IS NULL OR position('`' in x) = 0 THEN x
    ELSE replace(btrim(regexp_replace(x, '^`[^`]+`\s+', ''), '` '), '`', '''') END
$$;

CREATE OR REPLACE FUNCTION clean_backtick_names_trg() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'schools' THEN
    NEW.display_name := clean_backtick_name(NEW.display_name);
  ELSIF TG_TABLE_NAME = 'history_finishes' THEN
    NEW.name := clean_backtick_name(NEW.name);
  ELSE
    NEW.first_name := clean_backtick_name(NEW.first_name);
    NEW.last_name  := clean_backtick_name(NEW.last_name);
  END IF;
  RETURN NEW;
END $$;

-- 1. fix what's there (Vezzosi left alone, see above)
UPDATE wrestlers SET first_name = clean_backtick_name(first_name), last_name = clean_backtick_name(last_name)
  WHERE (first_name LIKE '%`%' OR last_name LIKE '%`%') AND id <> 'dbd3844f-535e-4830-b4ea-03c202f90237';
UPDATE boys_prospects  SET first_name = clean_backtick_name(first_name), last_name = clean_backtick_name(last_name)
  WHERE (first_name LIKE '%`%' OR last_name LIKE '%`%') AND id <> 6367;
UPDATE girls_prospects SET first_name = clean_backtick_name(first_name), last_name = clean_backtick_name(last_name)
  WHERE first_name LIKE '%`%' OR last_name LIKE '%`%';
UPDATE mixed_prospects SET first_name = clean_backtick_name(first_name), last_name = clean_backtick_name(last_name)
  WHERE first_name LIKE '%`%' OR last_name LIKE '%`%';
UPDATE schools SET display_name = clean_backtick_name(display_name) WHERE display_name LIKE '%`%';
UPDATE history_finishes SET name = clean_backtick_name(name) WHERE name LIKE '%`%';

-- 2. keep it fixed: every future write
DROP TRIGGER IF EXISTS clean_backtick_names ON wrestlers;
CREATE TRIGGER clean_backtick_names BEFORE INSERT OR UPDATE OF first_name, last_name ON wrestlers
  FOR EACH ROW EXECUTE FUNCTION clean_backtick_names_trg();
DROP TRIGGER IF EXISTS clean_backtick_names ON boys_prospects;
CREATE TRIGGER clean_backtick_names BEFORE INSERT OR UPDATE OF first_name, last_name ON boys_prospects
  FOR EACH ROW EXECUTE FUNCTION clean_backtick_names_trg();
DROP TRIGGER IF EXISTS clean_backtick_names ON girls_prospects;
CREATE TRIGGER clean_backtick_names BEFORE INSERT OR UPDATE OF first_name, last_name ON girls_prospects
  FOR EACH ROW EXECUTE FUNCTION clean_backtick_names_trg();
DROP TRIGGER IF EXISTS clean_backtick_names ON mixed_prospects;
CREATE TRIGGER clean_backtick_names BEFORE INSERT OR UPDATE OF first_name, last_name ON mixed_prospects
  FOR EACH ROW EXECUTE FUNCTION clean_backtick_names_trg();
DROP TRIGGER IF EXISTS clean_backtick_names ON schools;
CREATE TRIGGER clean_backtick_names BEFORE INSERT OR UPDATE OF display_name ON schools
  FOR EACH ROW EXECUTE FUNCTION clean_backtick_names_trg();
DROP TRIGGER IF EXISTS clean_backtick_names ON history_finishes;
CREATE TRIGGER clean_backtick_names BEFORE INSERT OR UPDATE OF name ON history_finishes
  FOR EACH ROW EXECUTE FUNCTION clean_backtick_names_trg();

COMMIT;

-- Verify: only the two Vezzosi rows keep a backtick; spot-check the cleaned names
SELECT 'wrestlers' t, count(*) FROM wrestlers WHERE first_name LIKE '%`%' OR last_name LIKE '%`%'
UNION ALL SELECT 'prospects', (SELECT count(*) FROM boys_prospects WHERE first_name LIKE '%`%' OR last_name LIKE '%`%')
  + (SELECT count(*) FROM girls_prospects WHERE first_name LIKE '%`%' OR last_name LIKE '%`%')
  + (SELECT count(*) FROM mixed_prospects WHERE first_name LIKE '%`%' OR last_name LIKE '%`%')
UNION ALL SELECT 'schools', count(*) FROM schools WHERE display_name LIKE '%`%'
UNION ALL SELECT 'history_finishes', count(*) FROM history_finishes WHERE name LIKE '%`%'
UNION ALL SELECT 'test: ' || clean_backtick_name('O`Neill') || ' / ' || clean_backtick_name('Brandon`') || ' / ' || clean_backtick_name('`Sasha` Yurovskyi'), 0;
-- expect wrestlers 1, prospects 1, schools 0, history_finishes 0, and "test: O'Neill / Brandon / Yurovskyi"

-- ROLLBACK: drop the six triggers, then restore names from docs/migrations/backups/20261113_backtick_names.json
--   DROP TRIGGER clean_backtick_names ON wrestlers; (… each table) DROP FUNCTION clean_backtick_names_trg(); DROP FUNCTION clean_backtick_name(text);
