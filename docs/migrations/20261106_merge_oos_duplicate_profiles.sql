-- docs/migrations/20261106_merge_oos_duplicate_profiles.sql
--
-- Out-of-state wrestlers split across two profiles (Kyle, 2026-11-06: Dan Vargas, Easton Area).
-- The July-August 2026 imports created out-of-state profiles without name links, so a later import
-- couldn't find them and made a new one; a school listed under a second name did the same (Delmar /
-- Delmar Junior-Senior, Blair Academy / Blair Academy (B Team), Immaculate Conception (IL) / IC
-- Catholic Prep). For each pair, every column with a foreign key to wrestlers(id) is moved from the
-- duplicate to the kept profile (found from the catalog, so no table is missed), a name link the kept
-- profile already has is dropped instead of duplicated, and the empty duplicate is deleted.
-- Before: backups/20261106_oos_profile_merges_before.json. Dan Vargas's one dual bout was moved by
-- the service role already. Run in the Supabase SQL editor; all or nothing.

DO $$
DECLARE
  p record; r record; n integer;
BEGIN
  FOR p IN SELECT * FROM (VALUES
    ('0cc679a1-e3b8-4eaa-89f6-354968e04320'::uuid, 'fb40c6eb-f7be-424f-8e06-b2d647820d5c'::uuid),   -- Dan Vargas (Easton Area)
    ('e7aead9b-f179-4f89-bae3-2cbcb675d649'::uuid, '116da31b-1a49-48ea-a571-3dd1b023b245'::uuid),   -- Michael Romero (St. John Bosco)
    ('7b545495-aa95-48b4-8a98-1e067c190652'::uuid, '7395bc73-0512-4575-a19c-4c8b5613cca0'::uuid),   -- Jesse Grajeda (St. John Bosco)
    ('d2f8395b-c424-475f-94b9-e587170fcd6f'::uuid, 'b1bedf51-7da1-433b-9780-4e7ca084b74a'::uuid),   -- Jorge Rios (St. John Bosco)
    ('9f6ce19b-3fbf-4772-bd4f-de1a5089940c'::uuid, '1d4e57cc-eb4e-46f7-815e-784611ea74cd'::uuid),   -- Theodore Egolf (Delmar)
    ('23e1d2cc-7d44-4904-b667-fff02cbf5d47'::uuid, '32c1f806-8608-4dc2-8305-150ab6445f6e'::uuid),   -- Storm Hoffman (Delmar)
    ('9b5b70c7-ff9b-4a57-94c0-5bd7809a67cc'::uuid, '823b6bbd-f364-4011-bd47-f58206dd52c9'::uuid),   -- Luca Cenatiempo (Blair Academy)
    ('d27da4be-0604-48a8-9a83-edf2f4b2e6b3'::uuid, '9005432c-1b6c-4b75-8705-9481d7a589e7'::uuid)   -- Brody Kelly (Immaculate Conception IL)
  ) AS v(keep_id, dup_id) LOOP
    IF (SELECT count(*) FROM wrestlers WHERE id IN (p.keep_id, p.dup_id)) <> 2 THEN RAISE EXCEPTION 'missing profile %', p.dup_id; END IF;
    DELETE FROM wrestler_name_aliases d WHERE d.wrestler_id = p.dup_id
      AND EXISTS (SELECT 1 FROM wrestler_name_aliases k WHERE k.wrestler_id = p.keep_id AND k.raw_name = d.raw_name AND k.school_id IS NOT DISTINCT FROM d.school_id);
    FOR r IN
      SELECT c.conrelid::regclass AS tbl, a.attname AS col
      FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'f' AND c.confrelid = 'public.wrestlers'::regclass
    LOOP
      EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', r.tbl, r.col, r.col) USING p.keep_id, p.dup_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n > 0 THEN RAISE NOTICE '% → %: %.% % rows', p.dup_id, p.keep_id, r.tbl, r.col, n; END IF;
    END LOOP;
    DELETE FROM wrestlers WHERE id = p.dup_id;
  END LOOP;
END $$;

-- Verify: 8 kept profiles, 0 duplicates left
SELECT count(*) FILTER (WHERE id IN ('0cc679a1-e3b8-4eaa-89f6-354968e04320', 'e7aead9b-f179-4f89-bae3-2cbcb675d649', '7b545495-aa95-48b4-8a98-1e067c190652', 'd2f8395b-c424-475f-94b9-e587170fcd6f', '9f6ce19b-3fbf-4772-bd4f-de1a5089940c', '23e1d2cc-7d44-4904-b667-fff02cbf5d47', '9b5b70c7-ff9b-4a57-94c0-5bd7809a67cc', 'd27da4be-0604-48a8-9a83-edf2f4b2e6b3')) AS kept,
       count(*) FILTER (WHERE id IN ('fb40c6eb-f7be-424f-8e06-b2d647820d5c', '116da31b-1a49-48ea-a571-3dd1b023b245', '7395bc73-0512-4575-a19c-4c8b5613cca0', 'b1bedf51-7da1-433b-9780-4e7ca084b74a', '1d4e57cc-eb4e-46f7-815e-784611ea74cd', '32c1f806-8608-4dc2-8305-150ab6445f6e', '823b6bbd-f364-4011-bd47-f58206dd52c9', '9005432c-1b6c-4b75-8705-9481d7a589e7')) AS duplicates_left
FROM wrestlers;
