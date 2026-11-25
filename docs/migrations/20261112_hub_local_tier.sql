-- docs/migrations/20261112_hub_local_tier.sql
--
-- A fourth tournament level, "local", worth a champion rating of 25 (Kyle 2026-11-12: "we need to add a local tier
-- worth 25 points for the middle school tournaments"). Allowed on all three lists; which tournaments are local is set
-- on the hub (Edit details → Level), not here. Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls', 'mixed'] LOOP
    EXECUTE format($f$
      ALTER TABLE %1$s_hub_tournaments DROP CONSTRAINT IF EXISTS %1$s_hub_tournaments_level_check;
      ALTER TABLE %1$s_hub_tournaments ADD CONSTRAINT %1$s_hub_tournaments_level_check CHECK (level IS NULL OR level IN ('national', 'regional', 'state', 'local'));
    $f$, g);
  END LOOP;
END $$;

COMMIT;

-- Verify: 3 rows, each naming 'local'
SELECT conrelid::regclass AS list, pg_get_constraintdef(oid) AS rule
FROM pg_constraint WHERE conname IN ('boys_hub_tournaments_level_check', 'girls_hub_tournaments_level_check', 'mixed_hub_tournaments_level_check');

-- ROLLBACK (only while no tournament is local): recreate each check with ('national', 'regional', 'state')
