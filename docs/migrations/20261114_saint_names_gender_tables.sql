-- 2026-11-14 (Kyle): saint schools are named "St. …" everywhere. schools.display_name was renamed by
-- scripts/saint_names_20261114.mts; boys_schools / girls_schools (the Schools directory reads them) need SQL — the
-- service role has no UPDATE there. Old names: docs/migrations/backups/20261114_saint_names_gender_tables.json.
-- Also: the public site's school_directory RPC runs as the visitor and failed with "permission denied for table
-- girls_schools" (both tables were created 2026-09-15 with no grants), so the directory listed nothing. Grant reads.
BEGIN;
UPDATE boys_schools  SET display_name = 'St. Joseph (Montvale) HS' WHERE school_id = 394 AND display_name = 'St Joseph (Montvale) HS';
UPDATE boys_schools  SET display_name = 'St. John Vianney'         WHERE school_id = 243 AND display_name = 'Saint John Vianney';
UPDATE boys_schools  SET display_name = 'St. Thomas Aquinas'       WHERE school_id = 234 AND display_name = 'Saint Thomas Aquinas';
UPDATE girls_schools SET display_name = 'St. John Vianney'         WHERE school_id = 243 AND display_name = 'Saint John Vianney';
UPDATE girls_schools SET display_name = 'St. Thomas Aquinas'       WHERE school_id = 234 AND display_name = 'Saint Thomas Aquinas';
GRANT SELECT ON boys_schools, girls_schools TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON boys_schools, girls_schools TO service_role;
COMMIT;

-- check: expect 3 boys + 2 girls rows, all "St. …"
SELECT 'boys' AS t, school_id, display_name FROM boys_schools WHERE school_id IN (394, 243, 234)
UNION ALL SELECT 'girls', school_id, display_name FROM girls_schools WHERE school_id IN (243, 234);
-- undo: set the five names back from the backup; REVOKE SELECT ON boys_schools, girls_schools FROM anon, authenticated;
