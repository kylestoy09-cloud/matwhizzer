-- docs/migrations/20261111_merge_oos_duplicate_schools.sql
--
-- Out-of-state schools entered twice (Kyle 2026-11-11: merge). In each pair the kept record is the one with bouts;
-- the other held only team-standings rows and a name link (no tournament has a row for both records). Cleveland:
-- Kyle's TrackWrestling lists give Cleveland High School, TN at Ironman and Women of Ironman; #1024 "Cleveland, TN"
-- (1 Escape the Rock bout) is the same school.
--   keep  ← merged          kept name afterwards
--   488   ← 843             Loyola Academy (Wilmette, IL)
--   765   ← 830             Homewood-Flossmoor (IL)
--   511   ← 831             Hononegah (IL)
--   530   ← 864             Providence Catholic (IL)
--   1017  ← 1025            Belle Vernon Area (PA)
--   643   ← 1032            Oxford Area (PA)
--   661   ← 1029            St. Christopher's School (VA)
--   513   ← 834             Lafayette (Wildwood, MO)
--   566   ← 1024            Cleveland (TN)
-- As 20261106/20261110: a wrestler name link the kept school already has is dropped, every column with a foreign key
-- to schools(id) is moved (found from the catalog), the emptied school is deleted. Then the kept school takes the
-- name above, and its previous name (state tag removed) is saved as an out-of-state alias so imports still match.
-- Before: backups/20261111_merge_oos_duplicates_before.json. Run in the Supabase SQL editor.

DO $$
DECLARE
  p record; r record; n integer; old_name text;
BEGIN
  FOR p IN SELECT * FROM (VALUES
    (488, 843, 'Loyola Academy (Wilmette, IL)'),
    (765, 830, 'Homewood-Flossmoor (IL)'),
    (511, 831, 'Hononegah (IL)'),
    (530, 864, 'Providence Catholic (IL)'),
    (1017, 1025, 'Belle Vernon Area (PA)'),
    (643, 1032, 'Oxford Area (PA)'),
    (661, 1029, 'St. Christopher''s School (VA)'),
    (513, 834, 'Lafayette (Wildwood, MO)'),
    (566, 1024, 'Cleveland (TN)')
  ) AS v(keep_id, dup_id, new_name) LOOP
    IF (SELECT count(*) FROM schools WHERE id IN (p.keep_id, p.dup_id) AND is_nj = false) <> 2 THEN
      RAISE EXCEPTION 'expected out-of-state schools % and %', p.keep_id, p.dup_id;
    END IF;
    SELECT display_name INTO old_name FROM schools WHERE id = p.keep_id;
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
    UPDATE schools SET display_name = p.new_name WHERE id = p.keep_id;
    -- previous name of the kept school, without its state tag, as an alias
    old_name := regexp_replace(regexp_replace(old_name, '\s*\([A-Z]{2}\)$', ''), ', [A-Z]{2}\)$', ')');
    IF old_name <> regexp_replace(p.new_name, '\s*\([A-Z]{2}\)$', '')
       AND NOT EXISTS (SELECT 1 FROM school_aliases WHERE alias = old_name) THEN
      INSERT INTO school_aliases (school_id, alias, alias_type, notes, confirmed_at)
      VALUES (p.keep_id, old_name, 'oos', p.keep_id::text, now());
    END IF;
  END LOOP;
END $$;

-- Verify: nine rows, the kept ids with their new names (the merged ids are gone)
SELECT id, display_name FROM schools WHERE id IN (488, 843, 765, 830, 511, 831, 530, 864, 1017, 1025, 643, 1032, 661, 1029, 513, 834, 566, 1024) ORDER BY id;
