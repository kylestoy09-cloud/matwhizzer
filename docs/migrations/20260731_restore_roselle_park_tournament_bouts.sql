-- =============================================================================
-- 20260731_restore_roselle_park_tournament_bouts.sql
--
-- Problem:
--   20260731_restore_school_358_full_data.sql moved 20 tournament bouts from
--   school_id=125 → 358 wherever wrestler_school_raw='Roselle', assuming "Roselle"
--   in tournament data = Abraham Clark HS (school 358).
--
--   This was wrong. Abraham Clark did NOT participate in the Beast of the East
--   (efeb41cc) or the A-Nice Invitational (509a0f61) in December 2025. Those are
--   Roselle Park (school 125) meets. Roselle Park appears as "Roselle" in some
--   tournament bracket exports.
--
-- Fix:
--   Move the 20 tournament bouts back from school_id=358 → 125 where school_raw
--   matches the tournament raw values. Also add "Roselle" as an alias for school 125
--   so future tournament imports resolve correctly.
--
-- After this migration:
--   - school 125 (Roselle Park) owns all wrestler profiles + tournament bouts for
--     those 7 wrestlers (Cianfrocca, Abud, Booth, Oberlies, Rodriguez, Herrera, Appello)
--   - school 358 (Abraham Clark) has 0 tournament bouts — correct, they didn't attend
-- =============================================================================

BEGIN;

-- ── Move bouts back: wrestler1 side ──────────────────────────────────────────
UPDATE tournament_bouts
SET wrestler1_school_id = 125
WHERE wrestler1_school_id = 358
  AND wrestler1_school_raw = 'Roselle';

-- ── Move bouts back: wrestler2 side ──────────────────────────────────────────
UPDATE tournament_bouts
SET wrestler2_school_id = 125
WHERE wrestler2_school_id = 358
  AND wrestler2_school_raw = 'Roselle';

-- ── Add "Roselle" alias to school 125 (Roselle Park) ─────────────────────────
-- Roselle Park appears as "Roselle" in tournament bracket exports (Beast of the East,
-- A-Nice Invitational). This alias ensures future imports resolve correctly to school 125.
INSERT INTO school_aliases (school_id, alias, alias_type, notes, confirmed_at)
VALUES (125, 'Roselle', 'display_name',
        'Roselle Park appears as "Roselle" in some tournament bracket exports (Beast of the East, A-Nice Invitational Dec 2025)',
        NOW())
ON CONFLICT DO NOTHING;

-- ── Remove "Roselle" alias from school 358 ───────────────────────────────────
-- "Roselle" is Abraham Clark's TW display name for dual meets, but in the
-- tournament context it was resolving to Roselle Park. Since we now have a
-- conflict on the alias, remove it from 358 and rely on school 358's
-- display_name alone. Re-evaluate if Abraham Clark tournament data ever appears.
DELETE FROM school_aliases
WHERE school_id = 358
  AND alias = 'Roselle';

-- ── Verify ────────────────────────────────────────────────────────────────────

-- Should be 0: no bouts at school 358
SELECT COUNT(*) AS bouts_at_358_should_be_zero
FROM tournament_bouts
WHERE wrestler1_school_id = 358 OR wrestler2_school_id = 358;

-- Should be 20: all bouts back at school 125
SELECT COUNT(*) AS bouts_at_125_should_be_20
FROM tournament_bouts
WHERE (wrestler1_school_id = 125 AND wrestler1_school_raw = 'Roselle')
   OR (wrestler2_school_id = 125 AND wrestler2_school_raw = 'Roselle');

-- Aliases for each school
SELECT school_id, alias, alias_type FROM school_aliases WHERE school_id IN (125, 358) ORDER BY school_id, alias;

COMMIT;
