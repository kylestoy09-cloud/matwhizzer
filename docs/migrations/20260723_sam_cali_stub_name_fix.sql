-- docs/migrations/20260723_sam_cali_stub_name_fix.sql
--
-- Resolves the 10 abbreviated name stubs that could not be derived from the
-- pipe CSV cross-reference (see 20260722_sam_cali_name_fix.sql for the 358-entry
-- primary patch). Sources for each name are documented inline.
--
-- Tournament: Sam Cali Battle for The Belt
--   in_season_tournament_id: bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56
--
-- ── APPLY ORDER ───────────────────────────────────────────────────────────────
-- These two patches are independent — they touch different (weight, abbrev) pairs
-- with zero row overlap. Either order is safe. Suggested order:
--   1. 20260722_sam_cali_name_fix.sql  (358-entry primary patch)
--   2. This file                        (10-entry stub patch)
-- Run the VERIFY block below after BOTH are applied.
--
-- ── NAMES + SOURCES ──────────────────────────────────────────────────────────
-- 113lb D. Adell      → Andrew Adell       (OCR initial error; pipe CSV = "Andrew Adell", B-R)
-- 113lb D. D'Arcy     → Danny D'Arcy       (original tournament team-page export)
-- 120lb J. Sgrulletta → Jaxson Sgurletta   (single-r spelling per tournament doc; GFA = OOS)
-- 126lb C. O'Connor   → Collin O'Connor    (original tournament team-page export; DPLC)
-- 126lb N. O'Sullivan → Nate O'Sullivan    (original tournament team-page export; CHAM = OOS)
-- 126lb O. O'Leary    → Owen O'Leary       (original tournament team-page export; Ridge)
-- 126lb S. D'Arco     → Sal D'Arco         (original tournament team-page export; PJ23)
-- 132lb K. Landell    → Trenton Landell    (OCR initial error; pipe CSV = "Trenton Landell", CHER)
-- 165lb T. O'Connor   → Tommy O'Connor     (original tournament team-page export; MTWN)
-- 190lb B. Washington → Navell Washington  (OCR initial error; pipe CSV = "Navell Washington", DEMA)
--
-- NOTE: J. Sgrulletta (GFA) is OOS — wrestler record was created with the stub
-- name from the original import. The wrestler record first_name/last_name may
-- also need a manual update in the wrestlers table to match "Jaxson Sgurletta".

BEGIN;

WITH name_fixes (wt, abbrev, full_name) AS (
  VALUES
    (113::integer, 'D. Adell'::text,    'Andrew Adell'::text),
    (113,          'D. D''Arcy',         'Danny D''Arcy'),
    (120,          'J. Sgrulletta',      'Jaxson Sgurletta'),
    (126,          'C. O''Connor',       'Collin O''Connor'),
    (126,          'N. O''Sullivan',     'Nate O''Sullivan'),
    (126,          'O. O''Leary',        'Owen O''Leary'),
    (126,          'S. D''Arco',         'Sal D''Arco'),
    (132,          'K. Landell',         'Trenton Landell'),
    (165,          'T. O''Connor',       'Tommy O''Connor'),
    (190,          'B. Washington',      'Navell Washington')
)
UPDATE tournament_bouts tb
SET
  wrestler1_name_raw = COALESCE(
    (SELECT full_name FROM name_fixes
     WHERE wt = tb.weight_class AND abbrev = tb.wrestler1_name_raw),
    tb.wrestler1_name_raw
  ),
  wrestler2_name_raw = COALESCE(
    (SELECT full_name FROM name_fixes
     WHERE wt = tb.weight_class AND abbrev = tb.wrestler2_name_raw),
    tb.wrestler2_name_raw
  )
WHERE tb.in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND (
    EXISTS (
      SELECT 1 FROM name_fixes
      WHERE wt = tb.weight_class AND abbrev = tb.wrestler1_name_raw
    )
    OR EXISTS (
      SELECT 1 FROM name_fixes
      WHERE wt = tb.weight_class AND abbrev = tb.wrestler2_name_raw
    )
  );

COMMIT;

-- ── POST-APPLY VERIFY ─────────────────────────────────────────────────────────
-- Run after BOTH 20260722_sam_cali_name_fix.sql AND this file have been applied.
-- Expected: 0 rows — no abbreviated stubs (initial + period format) remain.
--
-- SELECT id, weight_class, wrestler1_name_raw, wrestler2_name_raw, round
-- FROM tournament_bouts
-- WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
--   AND (
--     wrestler1_name_raw ~ '^[A-Z]\.\s'
--     OR wrestler2_name_raw ~ '^[A-Z]\.\s'
--   )
-- ORDER BY weight_class, round;
