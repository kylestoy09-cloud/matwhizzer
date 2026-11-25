-- docs/migrations/20261112_drop_old_ms_offseason.sql
--
-- Drops the Aug 29–30 middle school / offseason tables (20260829_ms_prospect_schema.sql,
-- 20260830_nonnjsiaa_schema.sql). They were never used (all 7 empty, checked 2026-11-12) and are
-- replaced by the tournament hubs (20261112_tournament_hubs.sql): boys_/girls_ hub tables, one
-- prospect list per side, shared wrestling_clubs. The code that read them (old Non-NJSIAA pages and
-- APIs, the MS credit in recalculate-hammer-scores, the MS candidate in the RTF import) is removed.
-- Run in the Supabase SQL editor AFTER the tournament hub deploy. Refuses to drop anything with rows.

BEGIN;
DO $$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['ms_placements', 'ms_wrestlers', 'ms_tournaments', 'ms_tournament_tiers',
                           'hs_offseason_placements', 'hs_offseason_tournaments', 'nonnjsiaa_clubs'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
      IF n > 0 THEN RAISE EXCEPTION '% has % rows; stop and check before dropping', t, n; END IF;
    END IF;
  END LOOP;
END $$;
DROP TABLE IF EXISTS ms_placements, ms_wrestlers, ms_tournaments, ms_tournament_tiers,
                     hs_offseason_placements, hs_offseason_tournaments, nonnjsiaa_clubs;
COMMIT;

-- Verify: should return 0 rows
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ms_placements', 'ms_wrestlers', 'ms_tournaments', 'ms_tournament_tiers',
                     'hs_offseason_placements', 'hs_offseason_tournaments', 'nonnjsiaa_clubs');

-- ROLLBACK: re-run 20260829_ms_prospect_schema.sql then 20260830_nonnjsiaa_schema.sql (empty tables)
