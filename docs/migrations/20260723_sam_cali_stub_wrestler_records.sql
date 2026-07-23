-- docs/migrations/20260723_sam_cali_stub_wrestler_records.sql
--
-- Fixes wrestler records that were created with stub first_names (e.g. "C.")
-- because their abbreviated names were not yet in _FULL_NAME_LOOKUP when the
-- Sam Cali import ran.
--
-- ── APPLY ORDER: paste this file FIRST ────────────────────────────────────────
-- The three O'Connor / Washington UPDATEs use wrestler1_name_raw values in their
-- subqueries to identify the exact wrestler IDs. The bout name_raw patches will
-- overwrite those values, so this file must run before:
--   20260722_sam_cali_name_fix.sql  (358-entry bout patch)
--   20260723_sam_cali_stub_name_fix.sql  (10-entry bout patch)
--
-- ── EXCLUDED (no wrestler record created): ────────────────────────────────────
--   J. Sgrulletta (GFA) — OOS: sid_w = None → get_or_create_wrestler not called
--   N. O'Sullivan (CHAM) — OOS: same. nj_wrestler1_id = NULL for both bouts.
--
-- ── LOGIC FOR THE OTHER 8: ────────────────────────────────────────────────────
-- match_wrestler() searches wrestlers by last_name only (no school filter).
-- If exactly one record with that last name exists → it matched an existing
-- full-name record (no stub created). The guard "AND first_name = 'X.'" in each
-- UPDATE below makes those cases safe no-ops (UPDATE 0 rows).
-- If the last name was not unique or absent → a stub record was created.
-- For the three common last names (O'Connor × 2, Washington) a stub was almost
-- certainly created; those use a subquery keyed on the current stub name_raw
-- values to target the exact wrestler ID rather than matching by name alone.

BEGIN;

-- ── Uncommon last names: direct filter is safe ────────────────────────────────

-- D. Adell → Andrew Adell (113lb, Bridgewater-Raritan)
UPDATE wrestlers SET first_name = 'Andrew'
WHERE first_name = 'D.' AND last_name = 'Adell';

-- D. D'Arcy → Danny D'Arcy (113lb, St. Benedict's Prep)
UPDATE wrestlers SET first_name = 'Danny'
WHERE first_name = 'D.' AND last_name = 'D''Arcy';

-- K. Landell → Trenton Landell (132lb, CHER)
UPDATE wrestlers SET first_name = 'Trenton'
WHERE first_name = 'K.' AND last_name = 'Landell';

-- O. O'Leary → Owen O'Leary (126lb, Ridge)
UPDATE wrestlers SET first_name = 'Owen'
WHERE first_name = 'O.' AND last_name = 'O''Leary';

-- S. D'Arco → Sal D'Arco (126lb, Pope John XXIII)
UPDATE wrestlers SET first_name = 'Sal'
WHERE first_name = 'S.' AND last_name = 'D''Arco';

-- ── Common last names: subquery-scoped to Sam Cali bouts ─────────────────────
-- "AND first_name = 'X.'" guard: if match_wrestler found an existing full-name
-- record, this UPDATE does nothing (the full-name record won't have first_name='C.').

-- C. O'Connor → Collin O'Connor (126lb, Depaul Catholic, school_id=22)
UPDATE wrestlers SET first_name = 'Collin'
WHERE first_name = 'C.'
  AND id IN (
    SELECT nj_wrestler1_id FROM tournament_bouts
    WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
      AND wrestler1_name_raw = 'C. O''Connor'
      AND nj_wrestler1_id IS NOT NULL
    UNION
    SELECT nj_wrestler2_id FROM tournament_bouts
    WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
      AND wrestler2_name_raw = 'C. O''Connor'
      AND nj_wrestler2_id IS NOT NULL
  );

-- T. O'Connor → Tommy O'Connor (165lb, Moorestown, school_id=261)
UPDATE wrestlers SET first_name = 'Tommy'
WHERE first_name = 'T.'
  AND id IN (
    SELECT nj_wrestler1_id FROM tournament_bouts
    WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
      AND wrestler1_name_raw = 'T. O''Connor'
      AND nj_wrestler1_id IS NOT NULL
    UNION
    SELECT nj_wrestler2_id FROM tournament_bouts
    WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
      AND wrestler2_name_raw = 'T. O''Connor'
      AND nj_wrestler2_id IS NOT NULL
  );

-- B. Washington → Navell Washington (190lb, Demarest, school_id=314)
UPDATE wrestlers SET first_name = 'Navell'
WHERE first_name = 'B.'
  AND id IN (
    SELECT nj_wrestler1_id FROM tournament_bouts
    WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
      AND wrestler1_name_raw = 'B. Washington'
      AND nj_wrestler1_id IS NOT NULL
    UNION
    SELECT nj_wrestler2_id FROM tournament_bouts
    WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
      AND wrestler2_name_raw = 'B. Washington'
      AND nj_wrestler2_id IS NOT NULL
  );

COMMIT;

-- ── POST-APPLY CHECK ──────────────────────────────────────────────────────────
-- Run after all three files have been applied. Confirms no stub first_names remain
-- linked to Sam Cali bouts.
--
-- SELECT w.id, w.first_name, w.last_name, tb.weight_class,
--        tb.wrestler1_name_raw, tb.wrestler2_name_raw
-- FROM tournament_bouts tb
-- JOIN wrestlers w ON w.id = tb.nj_wrestler1_id OR w.id = tb.nj_wrestler2_id
-- WHERE tb.in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
--   AND w.first_name ~ '^[A-Z]\.$'
-- ORDER BY tb.weight_class;
-- Expected: 0 rows
