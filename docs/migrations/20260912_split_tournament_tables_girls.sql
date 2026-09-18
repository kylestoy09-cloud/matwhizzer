-- docs/migrations/20260912_split_tournament_tables_girls.sql
--
-- Phase 1 of the gender-table split.
--
-- Creates separate girls versions of all four in-season tournament tables:
--   in_season_tournaments_girls
--   tournament_bouts_girls
--   in_season_tournament_participants_girls
--   in_season_tournament_seeds_girls
--
-- Then backfills each from rows where gender IN ('F', 'both') in the original
-- shared table.  Original tables are left intact (no deletes, no drops) until
-- Phase 3 runs after every code path has been updated to the new tables.
--
-- SAFE TO RUN MULTIPLE TIMES — all objects use IF NOT EXISTS / ON CONFLICT.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  in_season_tournaments_girls
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS in_season_tournaments_girls (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  start_date          date        NOT NULL,
  end_date            date,
  location            text,
  season              text        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  source_format       text        CHECK (source_format IN ('full_bracket', 'school_tracking', 'csv')),
  tournament_type     text,
  is_oos              boolean     NOT NULL DEFAULT false,
  venue_name          text,
  venue_address       text,
  location_school_id  int         REFERENCES public.schools(id),
  banner_bg           text,
  banner_fg           text,
  podium_depth        smallint    NOT NULL DEFAULT 3,
  point_value         smallint
  -- gender column intentionally omitted: this table is implicitly 'F'
);

-- Mirror the unique index so duplicate-import prevention still works
CREATE UNIQUE INDEX IF NOT EXISTS idx_in_season_tournaments_girls_name_season
  ON in_season_tournaments_girls (name, season);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  tournament_bouts_girls
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournament_bouts_girls (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  in_season_tournament_id   uuid        NOT NULL REFERENCES in_season_tournaments_girls(id) ON DELETE CASCADE,
  weight_class              integer     NOT NULL,
  round                     text        NOT NULL,

  wrestler1_id              uuid        REFERENCES wrestlers(id),
  wrestler1_name_raw        text        NOT NULL,
  wrestler1_school_id       integer     REFERENCES schools(id),
  wrestler1_school_raw      text        NOT NULL,

  wrestler2_id              uuid        REFERENCES wrestlers(id),
  wrestler2_name_raw        text        NOT NULL,
  wrestler2_school_id       integer     REFERENCES schools(id),
  wrestler2_school_raw      text        NOT NULL,

  winner                    smallint    CHECK (winner IN (1, 2)),
  result_type               text,
  result_detail             text,
  fall_time_seconds         integer,
  winner_score              smallint,
  loser_score               smallint,
  result_time_estimated     boolean     NOT NULL DEFAULT false,
  source_format             text        CHECK (source_format IN ('rtf', 'pdf', 'pipe', 'bullet', 'csv')),

  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_bouts_girls_tournament_id
  ON tournament_bouts_girls (in_season_tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_bouts_girls_wrestler1_school
  ON tournament_bouts_girls (wrestler1_school_id);

CREATE INDEX IF NOT EXISTS idx_tournament_bouts_girls_wrestler2_school
  ON tournament_bouts_girls (wrestler2_school_id);

CREATE INDEX IF NOT EXISTS idx_tournament_bouts_girls_wrestler1
  ON tournament_bouts_girls (wrestler1_id);

CREATE INDEX IF NOT EXISTS idx_tournament_bouts_girls_wrestler2
  ON tournament_bouts_girls (wrestler2_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  in_season_tournament_participants_girls
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS in_season_tournament_participants_girls (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  in_season_tournament_id uuid        NOT NULL REFERENCES in_season_tournaments_girls(id) ON DELETE CASCADE,
  school_id               int         NOT NULL REFERENCES schools(id),
  added_via               text        NOT NULL
    CHECK (added_via IN ('rollover_upload', 'schedule_import', 'manual')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (in_season_tournament_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_istp_girls_tournament_id
  ON in_season_tournament_participants_girls (in_season_tournament_id);

CREATE INDEX IF NOT EXISTS idx_istp_girls_school_id
  ON in_season_tournament_participants_girls (school_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.  in_season_tournament_seeds_girls
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS in_season_tournament_seeds_girls (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  in_season_tournament_id uuid        NOT NULL REFERENCES in_season_tournaments_girls(id) ON DELETE CASCADE,
  weight_class            int         NOT NULL,
  seed                    int         NOT NULL,
  wrestler_name_raw       text        NOT NULL,
  school_name_raw         text        NOT NULL DEFAULT '',
  wrestler_id             uuid        REFERENCES wrestlers(id),
  school_id               int         REFERENCES schools(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (in_season_tournament_id, weight_class, seed)
);

CREATE INDEX IF NOT EXISTS idx_ist_seeds_girls_tournament
  ON in_season_tournament_seeds_girls (in_season_tournament_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.  RLS + grants (mirror original tables)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE in_season_tournaments_girls              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_bouts_girls                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_season_tournament_participants_girls  ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_season_tournament_seeds_girls         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON in_season_tournaments_girls              FOR SELECT USING (true);
CREATE POLICY "public read" ON tournament_bouts_girls                  FOR SELECT USING (true);
CREATE POLICY "public read" ON in_season_tournament_participants_girls  FOR SELECT USING (true);
CREATE POLICY "public read" ON in_season_tournament_seeds_girls         FOR SELECT USING (true);

GRANT ALL    ON TABLE in_season_tournaments_girls              TO service_role;
GRANT SELECT ON TABLE in_season_tournaments_girls              TO anon, authenticated;

GRANT ALL    ON TABLE tournament_bouts_girls                  TO service_role;
GRANT SELECT ON TABLE tournament_bouts_girls                  TO anon, authenticated;

GRANT ALL    ON TABLE in_season_tournament_participants_girls  TO service_role;
GRANT SELECT ON TABLE in_season_tournament_participants_girls  TO anon, authenticated;

GRANT ALL    ON TABLE in_season_tournament_seeds_girls         TO service_role;
GRANT SELECT ON TABLE in_season_tournament_seeds_girls         TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.  Backfill girls tournaments (gender = 'F' or 'both')
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO in_season_tournaments_girls (
  id, name, start_date, end_date, location, season, created_at,
  source_format, tournament_type, is_oos, venue_name, venue_address,
  location_school_id, banner_bg, banner_fg, podium_depth, point_value
)
SELECT
  id, name, start_date, end_date, location, season, created_at,
  source_format, tournament_type, is_oos, venue_name, venue_address,
  location_school_id, banner_bg, banner_fg, podium_depth, point_value
FROM in_season_tournaments
WHERE gender IN ('F', 'both')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7.  Backfill girls tournament bouts
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO tournament_bouts_girls (
  id, in_season_tournament_id, weight_class, round,
  wrestler1_id, wrestler1_name_raw, wrestler1_school_id, wrestler1_school_raw,
  wrestler2_id, wrestler2_name_raw, wrestler2_school_id, wrestler2_school_raw,
  winner, result_type, result_detail, fall_time_seconds,
  winner_score, loser_score, result_time_estimated, source_format,
  created_at
)
SELECT
  tb.id, tb.in_season_tournament_id, tb.weight_class, tb.round,
  tb.wrestler1_id, tb.wrestler1_name_raw, tb.wrestler1_school_id, tb.wrestler1_school_raw,
  tb.wrestler2_id, tb.wrestler2_name_raw, tb.wrestler2_school_id, tb.wrestler2_school_raw,
  tb.winner, tb.result_type, tb.result_detail, tb.fall_time_seconds,
  tb.winner_score, tb.loser_score, tb.result_time_estimated, tb.source_format,
  tb.created_at
FROM tournament_bouts tb
JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
WHERE ist.gender IN ('F', 'both')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8.  Backfill girls tournament participants
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO in_season_tournament_participants_girls (
  id, in_season_tournament_id, school_id, added_via, created_at
)
SELECT
  p.id, p.in_season_tournament_id, p.school_id, p.added_via, p.created_at
FROM in_season_tournament_participants p
JOIN in_season_tournaments ist ON ist.id = p.in_season_tournament_id
WHERE ist.gender IN ('F', 'both')
ON CONFLICT (in_season_tournament_id, school_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9.  Backfill girls tournament seeds
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO in_season_tournament_seeds_girls (
  id, in_season_tournament_id, weight_class, seed,
  wrestler_name_raw, school_name_raw, wrestler_id, school_id, created_at
)
SELECT
  s.id, s.in_season_tournament_id, s.weight_class, s.seed,
  s.wrestler_name_raw, s.school_name_raw, s.wrestler_id, s.school_id, s.created_at
FROM in_season_tournament_seeds s
JOIN in_season_tournaments ist ON ist.id = s.in_season_tournament_id
WHERE ist.gender IN ('F', 'both')
ON CONFLICT (in_season_tournament_id, weight_class, seed) DO NOTHING;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run after the migration to sanity-check counts)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SELECT COUNT(*) FROM in_season_tournaments WHERE gender IN ('F','both');
-- SELECT COUNT(*) FROM in_season_tournaments_girls;
-- -- These two counts should match.
--
-- SELECT COUNT(*) FROM tournament_bouts tb
--   JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
--   WHERE ist.gender IN ('F','both');
-- SELECT COUNT(*) FROM tournament_bouts_girls;
-- -- These two counts should match.

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 CLEANUP (DO NOT RUN until all code is updated to use new tables)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- After Phase 2 (all code updated + deployed), run the following to finish:
--
-- BEGIN;
-- -- Remove girls bouts from boys table
-- DELETE FROM tournament_bouts WHERE in_season_tournament_id IN (
--   SELECT id FROM in_season_tournaments WHERE gender = 'F'
-- );
-- -- Remove girls-only tournaments from boys table
-- -- (keep 'both' rows in boys table since they contain boys bouts too)
-- DELETE FROM in_season_tournaments WHERE gender = 'F';
-- -- Drop gender column — table is now implicitly boys
-- ALTER TABLE in_season_tournaments DROP COLUMN gender;
-- COMMIT;
