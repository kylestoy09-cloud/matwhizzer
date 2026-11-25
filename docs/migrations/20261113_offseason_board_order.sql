-- docs/migrations/20261113_offseason_board_order.sql
--
-- Kyle's order for the Insight Off-Season board (Kyle 2026-11-13: "i also need a way for me to edit the order in which
-- these wrestlers are displayed"). One row per wrestler placed in a list: a weight ('157') or 'overall' (Most Notable
-- Overall), per side and offseason. Wrestlers without a row follow, by score. Set on the admin Offseason Hub's
-- "Public board" tab. Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS offseason_board_order (
  gender      char(1)     NOT NULL CHECK (gender IN ('M', 'F')),
  season      integer     NOT NULL,
  list        text        NOT NULL,                      -- a weight, or 'overall'
  wrestler_id uuid        NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
  position    integer     NOT NULL CHECK (position >= 1),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  PRIMARY KEY (gender, season, list, wrestler_id)
);
ALTER TABLE offseason_board_order ENABLE ROW LEVEL SECURITY;
GRANT ALL ON offseason_board_order TO service_role;

COMMIT;

-- Verify: the table exists and is empty
SELECT count(*) FROM offseason_board_order;

-- ROLLBACK: DROP TABLE offseason_board_order;
