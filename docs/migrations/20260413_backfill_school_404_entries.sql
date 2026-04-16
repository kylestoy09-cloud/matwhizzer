-- MIGRATION: 20260413_backfill_school_404_entries.sql
-- DESCRIPTION: Re-point 6 tournament_entries from catch-all school_id 404
--              (JFK/Woodbridge/Colonia) to the correct individual school IDs,
--              resolved by wrestler name against the 2026 Girls Region source data.
-- APPLIED: NOT APPLIED
--
-- TARGET SCHOOL IDs:
--   149 = Colonia
--   150 = Iselin Kennedy  (source: 'JFK-Iselin')
--   187 = Woodbridge
--
-- NOTE: Alessandra Armenti (also Colonia) is NOT included here.
--       Her entries (tournaments 182, 191) already have school_id = 149 — no action needed.
--
-- ── ENTRIES UPDATED ──────────────────────────────────────────────────────────────
--   Evangelia Kotsonis  wt=107  tourn=136  school_id 404 → 150 (Iselin Kennedy)
--   Isabella McGarry    wt=132  tourn=136  school_id 404 → 149 (Colonia)
--   Montedoc Hidalgo    wt=138  tourn=136  school_id 404 → 149 (Colonia)
--   Zoe Poznanski       wt=120  tourn=136  school_id 404 → 149 (Colonia)
--   Zoe Poznanski       wt=120  tourn=138  school_id 404 → 149 (Colonia)
--   Genesis Cruz        wt=152  tourn=136  school_id 404 → 187 (Woodbridge)
-- ─────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Evangelia Kotsonis — wt=107, tournament_id=136 (Girls Regions North 2)
UPDATE tournament_entries
SET    school_id = 150
WHERE  id = '8dd6ef20-ddf6-411c-9a0e-1ae3c87721e6';

-- Isabella McGarry — wt=132, tournament_id=136 (Girls Regions North 2)
UPDATE tournament_entries
SET    school_id = 149
WHERE  id = '777bf9e9-8e3d-4e8a-963d-87e3d02db49b';

-- Montedoc Hidalgo — wt=138, tournament_id=136 (Girls Regions North 2)
UPDATE tournament_entries
SET    school_id = 149
WHERE  id = '0cc02f27-e0eb-420c-85c6-5a494e361041';

-- Zoe Poznanski — wt=120, tournament_id=136 (Girls Regions North 2)
UPDATE tournament_entries
SET    school_id = 149
WHERE  id = '2c6fcfe5-4950-4fe7-8a1f-8ed68eaa14bc';

-- Zoe Poznanski — wt=120, tournament_id=138 (Girls States)
UPDATE tournament_entries
SET    school_id = 149
WHERE  id = '82799023-aa4c-44a8-92fd-cb944a9b3075';

-- Genesis Cruz — wt=152, tournament_id=136 (Girls Regions North 2)
UPDATE tournament_entries
SET    school_id = 187
WHERE  id = 'e864d888-f33c-4a2d-9873-01dcfed578c7';

-- Verify: school_id 404 should now have zero tournament_entries
SELECT COUNT(*) AS remaining_404_entries
FROM   tournament_entries
WHERE  school_id = 404;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
-- UPDATE tournament_entries SET school_id = 404 WHERE id = '8dd6ef20-ddf6-411c-9a0e-1ae3c87721e6'; -- Evangelia Kotsonis
-- UPDATE tournament_entries SET school_id = 404 WHERE id = '777bf9e9-8e3d-4e8a-963d-87e3d02db49b'; -- Isabella McGarry
-- UPDATE tournament_entries SET school_id = 404 WHERE id = '0cc02f27-e0eb-420c-85c6-5a494e361041'; -- Montedoc Hidalgo
-- UPDATE tournament_entries SET school_id = 404 WHERE id = '2c6fcfe5-4950-4fe7-8a1f-8ed68eaa14bc'; -- Zoe Poznanski (tourn 136)
-- UPDATE tournament_entries SET school_id = 404 WHERE id = '82799023-aa4c-44a8-92fd-cb944a9b3075'; -- Zoe Poznanski (tourn 138)
-- UPDATE tournament_entries SET school_id = 404 WHERE id = 'e864d888-f33c-4a2d-9873-01dcfed578c7'; -- Genesis Cruz
-- COMMIT;
