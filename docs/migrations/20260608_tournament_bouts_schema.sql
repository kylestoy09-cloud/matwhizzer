-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260608_tournament_bouts_schema.sql
--
-- The existing `tournaments` table (id integer, tournament_type, season_id) is
-- used for postseason brackets (districts / regions / state) and is left
-- entirely untouched.
--
-- This migration creates two new tables:
--   in_season_tournaments — one row per in-season tournament (invitationals,
--     holiday tournaments, etc.). UUID PK. Uses a text `season` label instead
--     of the postseason integer season_id FK.
--   tournament_bouts — one row per individual bout in an in-season tournament.
--     Separate from the postseason `matches` table.
--
-- ROLLBACK at bottom of file.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── in_season_tournaments ─────────────────────────────────────────────────────

CREATE TABLE in_season_tournaments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  start_date date        NOT NULL,
  end_date   date,
  location   text,
  season     text        NOT NULL,   -- e.g. "2025-26"
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate imports of the same tournament
CREATE UNIQUE INDEX idx_in_season_tournaments_name_season
  ON in_season_tournaments (name, season);

-- ── tournament_bouts ──────────────────────────────────────────────────────────

CREATE TABLE tournament_bouts (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  in_season_tournament_id   uuid        NOT NULL REFERENCES in_season_tournaments(id) ON DELETE CASCADE,
  weight_class              integer     NOT NULL,
  round                     text        NOT NULL,

  -- Wrestler 1
  nj_wrestler1_id           uuid        REFERENCES wrestlers(id),
  wrestler1_name_raw        text        NOT NULL,
  wrestler1_school_id       integer     REFERENCES schools(id),
  wrestler1_school_raw      text        NOT NULL,

  -- Wrestler 2
  nj_wrestler2_id           uuid        REFERENCES wrestlers(id),
  wrestler2_name_raw        text        NOT NULL,
  wrestler2_school_id       integer     REFERENCES schools(id),
  wrestler2_school_raw      text        NOT NULL,

  -- Result: 1 = wrestler1 won, 2 = wrestler2 won, NULL = DFF or no result
  winner                    smallint    CHECK (winner IN (1, 2)),
  result_type               text,
  result_detail             text,
  fall_time_seconds         integer,

  created_at                timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by tournament (detail page, school schedule tab)
CREATE INDEX idx_tournament_bouts_tournament_id
  ON tournament_bouts (in_season_tournament_id);

-- Fast lookup by school for schedule tab
CREATE INDEX idx_tournament_bouts_wrestler1_school
  ON tournament_bouts (wrestler1_school_id);
CREATE INDEX idx_tournament_bouts_wrestler2_school
  ON tournament_bouts (wrestler2_school_id);

-- Fast lookup by wrestler for wrestler profile match history
CREATE INDEX idx_tournament_bouts_nj_wrestler1
  ON tournament_bouts (nj_wrestler1_id);
CREATE INDEX idx_tournament_bouts_nj_wrestler2
  ON tournament_bouts (nj_wrestler2_id);

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT ALL     ON TABLE in_season_tournaments TO service_role;
GRANT SELECT  ON TABLE in_season_tournaments TO anon, authenticated;

GRANT ALL     ON TABLE tournament_bouts TO service_role;
GRANT SELECT  ON TABLE tournament_bouts TO anon, authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE in_season_tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON in_season_tournaments FOR SELECT USING (true);

ALTER TABLE tournament_bouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON tournament_bouts FOR SELECT USING (true);

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- BEGIN;
-- DROP TABLE IF EXISTS tournament_bouts;
-- DROP TABLE IF EXISTS in_season_tournaments;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
