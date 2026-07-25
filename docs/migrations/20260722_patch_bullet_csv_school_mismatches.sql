-- Patch: bullet CSV importer _NJ_SCHOOL_OVERRIDES had two wrong school_ids.
--
-- Root cause: import_bullet_csv.py _NJ_SCHOOL_OVERRIDES mapped:
--   "Haddon Twp Hgh School" → 230 (Ewing)     should be 240 (Haddon Township)
--   "Passaic Co Tech-Voc"   → 243 (St John Vianney)  should be 391 (Passaic Tech)
--
-- Affected tournaments (from bullet CSV import run 2026-07-20):
--   Bart Payne HT Holiday Tournament  (in_season_tournament_id 63dfd0f6-c8b2-46dc-a78d-010290315058)
--   Parsippany Hills Holiday Tournament (in_season_tournament_id b636f19c-1e6e-4295-955c-144ea3f6248b)
--
-- Filter on school_raw to avoid touching legitimately-Ewing or legitimately-SJV bouts.

-- ── Bart Payne: Haddon Township (240) ─────────────────────────────────────────

UPDATE tournament_bouts
SET wrestler1_school_id = 240
WHERE in_season_tournament_id = '63dfd0f6-c8b2-46dc-a78d-010290315058'
  AND wrestler1_school_id = 230
  AND wrestler1_school_raw = 'Haddon Twp Hgh School';
-- Expected: 11 rows

UPDATE tournament_bouts
SET wrestler2_school_id = 240
WHERE in_season_tournament_id = '63dfd0f6-c8b2-46dc-a78d-010290315058'
  AND wrestler2_school_id = 230
  AND wrestler2_school_raw = 'Haddon Twp Hgh School';
-- Expected: 15 rows

-- ── Parsippany Hills: Passaic Tech (391) ──────────────────────────────────────

UPDATE tournament_bouts
SET wrestler1_school_id = 391
WHERE in_season_tournament_id = 'b636f19c-1e6e-4295-955c-144ea3f6248b'
  AND wrestler1_school_id = 243
  AND wrestler1_school_raw = 'Passaic Co Tech-Voc';
-- Expected: 13 rows

UPDATE tournament_bouts
SET wrestler2_school_id = 391
WHERE in_season_tournament_id = 'b636f19c-1e6e-4295-955c-144ea3f6248b'
  AND wrestler2_school_id = 243
  AND wrestler2_school_raw = 'Passaic Co Tech-Voc';
-- Expected: 15 rows

-- ── School aliases (prevent future matcher failures) ─────────────────────────
-- Only add if school_aliases_oos_support migration has been applied (school_id is nullable).
-- If the migration is not yet applied, these inserts will also work under the old schema
-- since school_id is NOT NULL by default and we are providing it.

INSERT INTO school_aliases (school_id, alias, alias_type, notes)
VALUES
  (240, 'Haddon Twp Hgh School', 'abbreviation', 'Bullet CSV format — was incorrectly mapped to school 230 (Ewing) in import'),
  (391, 'Passaic Co Tech-Voc',   'abbreviation', 'Bullet CSV format — was incorrectly mapped to school 243 (SJV) in import')
ON CONFLICT DO NOTHING;
