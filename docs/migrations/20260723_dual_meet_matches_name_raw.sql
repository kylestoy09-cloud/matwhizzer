-- docs/migrations/20260723_dual_meet_matches_name_raw.sql
--
-- Adds wrestler_a_name_raw and wrestler_b_name_raw to dual_meet_matches.
--
-- WHY: The dual meet import has always discarded parsed wrestler names when a
-- name could not be resolved to a wrestler UUID. tournament_bouts stores both
-- wrestler1_name_raw (always written) and nj_wrestler1_id (written when matched).
-- dual_meet_matches previously stored only the UUID, so a failed match left the
-- slot as NULL with no record of what name was in the source text.
--
-- ── HISTORICAL DATA NOTE ─────────────────────────────────────────────────────
-- As of 2026-07-23, 259 non-forfeit wrestler slots have NULL wrestler_a_id /
-- wrestler_b_id with no raw name available (76 slot-A, 183 slot-B across
-- 5,390 total rows). Those names were discarded at import time and cannot be
-- recovered from the DB. This migration does NOT backfill them — they remain
-- NULL in both the id and name_raw columns and show as "—" in the audit tool.
-- Recovery would require re-sourcing from the original TrackWrestling pages.
--
-- Going forward: the import route writes both the resolved UUID (when matched)
-- and the raw name (always, for non-forfeit slots). See import-meets/route.ts.
--
-- ── APPLY ORDER ──────────────────────────────────────────────────────────────
-- Apply before running any new dual meet imports. The API and import route are
-- backwards-compatible with NULL in both columns (existing behaviour).
-- No rollback risk — both columns are nullable with no NOT NULL constraint.

BEGIN;

ALTER TABLE dual_meet_matches
  ADD COLUMN wrestler_a_name_raw text,
  ADD COLUMN wrestler_b_name_raw text;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
-- ALTER TABLE dual_meet_matches
--   DROP COLUMN IF EXISTS wrestler_a_name_raw,
--   DROP COLUMN IF EXISTS wrestler_b_name_raw;
-- COMMIT;
