-- docs/migrations/20261120_strength_rating.sql
--
-- Strength rating (review 2026-11-20): a "who beats whom" rating for projections beside the WRR, which stays the
-- resume (src/lib/strengthRating.ts). On 2025-26, blending it 50/50 into the projection picked the winner 80.3% boys /
-- 76.2% girls vs 78.4 / 74.8% (scripts/projection_strength_test.mts).
--   wrestler_strength      each wrestler's strength now, per season (written at every WRR rebuild with the tracker;
--                          read by the head-to-head projection). Service role only.
--   match_projections.a_strength / b_strength
--                          each tracked bout's strengths going in (earlier days only), so the Lever Lab can test it.
-- Filled for 2025-26 by scripts/backfill_strength_20261120.mts. Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS wrestler_strength (
  wrestler_id  uuid NOT NULL,
  season       text NOT NULL,
  gender       text NOT NULL CHECK (gender IN ('M', 'F')),
  strength     numeric NOT NULL,
  bouts        int NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wrestler_id, season)
);
ALTER TABLE wrestler_strength ENABLE ROW LEVEL SECURITY;
GRANT ALL ON wrestler_strength TO service_role;

ALTER TABLE match_projections ADD COLUMN IF NOT EXISTS a_strength numeric;
ALTER TABLE match_projections ADD COLUMN IF NOT EXISTS b_strength numeric;

COMMIT;

-- Verify: the table is there and empty; the columns are there and empty
SELECT (SELECT count(*) FROM wrestler_strength) AS strengths, count(a_strength) AS bouts_with_strength FROM match_projections;
