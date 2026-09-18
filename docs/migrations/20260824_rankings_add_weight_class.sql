-- Add weight_class to the three ranking tables so individual rankings can be
-- scoped per weight class without encoding it in ranking_type or results JSONB.

ALTER TABLE ranking_computed_variants
  ADD COLUMN IF NOT EXISTS weight_class integer;

ALTER TABLE ranking_editorial
  ADD COLUMN IF NOT EXISTS weight_class integer;

ALTER TABLE ranking_published
  ADD COLUMN IF NOT EXISTS weight_class integer;

-- Update existing indexes to include weight_class (drop + recreate is safest
-- since Postgres doesn't allow adding columns to existing index definitions)
DROP INDEX IF EXISTS idx_rcv_lookup;
CREATE INDEX idx_rcv_lookup
  ON ranking_computed_variants (ranking_type, scope, scope_id, season_id, weight_class, period_start DESC);

DROP INDEX IF EXISTS idx_re_lookup;
CREATE INDEX idx_re_lookup
  ON ranking_editorial (ranking_type, scope, scope_id, season_id, weight_class, updated_at DESC);

DROP INDEX IF EXISTS idx_rp_lookup;
CREATE INDEX idx_rp_lookup
  ON ranking_published (ranking_type, scope, scope_id, season_id, weight_class, published_at DESC);

-- Rollback:
--   ALTER TABLE ranking_computed_variants DROP COLUMN IF EXISTS weight_class;
--   ALTER TABLE ranking_editorial         DROP COLUMN IF EXISTS weight_class;
--   ALTER TABLE ranking_published         DROP COLUMN IF EXISTS weight_class;
