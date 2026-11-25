-- docs/migrations/20261112_wrestler_rating_carry.sql
--
-- WRR season carry (Kyle 2026-11-12: "the end of one season and the start of the next season is no
-- different than day 45 to day 46"). Each season's rating run saves every rated wrestler's end state —
-- last 20 match scores, latest result at each tournament (12-month rolling), final postseason score,
-- weight — and the next season's run continues from it instead of starting over.
-- Written and read only by /api/admin/recalculate-hammer-scores (service role). Derived data: a
-- wrestler's rows go when the wrestler does (CASCADE), and any run rebuilds them.
-- Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS wrestler_rating_carry (
  wrestler_id  uuid        NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
  season       text        NOT NULL,          -- seasons.year_label, e.g. '2025-26'
  gender       char(1)     NOT NULL CHECK (gender IN ('M', 'F')),
  state        jsonb       NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wrestler_id, season)
);
CREATE INDEX IF NOT EXISTS wrestler_rating_carry_season_idx ON wrestler_rating_carry (season, gender);

ALTER TABLE wrestler_rating_carry ENABLE ROW LEVEL SECURITY;
GRANT ALL ON wrestler_rating_carry TO service_role;

COMMIT;

-- Verify: the table exists and is empty
SELECT count(*) AS carry_rows FROM wrestler_rating_carry;

-- ROLLBACK: DROP TABLE wrestler_rating_carry;  (the next run then starts the season the old way)
