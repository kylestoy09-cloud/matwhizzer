-- docs/migrations/20261117_college_results.sql
--
-- College results (Kyle 2026-11-17): the NCAA (and later DII, DIII, NAIA, JUCO; women's NCWWC, NAIA) championship
-- results, read from the tournament PDFs (Non-NJSIAA menu → NCAA), with each entrant cross-referenced to one of our
-- wrestlers so college results and podiums show on their profiles after high school. Kept apart from the NJSIAA
-- tables, so college results never reach state leaderboards, history pages or ratings.
--   colleges / college_aliases   shared by both sides: the school, every name and abbreviation the files use, colors
--                                (primary = the bar and match-box header, secondary = text / accent)
--   {boys,girls}_college_events  one championship: level ('NCAA DI' …) + year (the championship year, March 2026 = 2026)
--   {boys,girls}_college_entries one wrestler in it: name as printed, college, weight, seed, record, place (1–8 or
--                                null), and the match to our wrestler: match_status auto (certain, went straight in) /
--                                review (waiting for Kyle) / confirmed / not_ours / none (no candidate)
-- Bouts come later (their own table). Written by /api/admin/college (service role). Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS colleges (
  id              serial      PRIMARY KEY,
  name            text        NOT NULL UNIQUE,
  primary_color   text,
  secondary_color text,
  colors_checked  boolean     NOT NULL DEFAULT false,   -- Kyle has checked the colors
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS college_aliases (
  alias       text    NOT NULL,
  college_id  integer NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  PRIMARY KEY (alias)
);
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_aliases ENABLE ROW LEVEL SECURITY;
GRANT ALL ON colleges, college_aliases TO service_role;
GRANT SELECT ON colleges TO anon, authenticated;         -- the profile bar and match boxes read the colors
GRANT USAGE, SELECT ON SEQUENCE colleges_id_seq TO service_role;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_college_events (
        id          serial      PRIMARY KEY,
        level       text        NOT NULL,                  -- 'NCAA DI', 'NCAA DII', 'NCAA DIII', 'NAIA', 'NJCAA', 'NCWWC'
        year        integer     NOT NULL,                  -- the championship year
        source_files text[],
        imported_at timestamptz NOT NULL DEFAULT now(),
        imported_by text,
        UNIQUE (level, year)
      );
      CREATE TABLE IF NOT EXISTS %1$s_college_entries (
        id            bigserial   PRIMARY KEY,
        event_id      integer     NOT NULL REFERENCES %1$s_college_events(id) ON DELETE CASCADE,
        weight        integer     NOT NULL,
        name          text        NOT NULL,                -- as printed
        college_id    integer     REFERENCES colleges(id),
        college_raw   text        NOT NULL,                -- as printed ("OKST", "Oklahoma State")
        seed          integer,
        record        text,
        place         integer     CHECK (place BETWEEN 1 AND 8),
        wrestler_id   uuid        REFERENCES wrestlers(id) ON DELETE SET NULL,
        match_status  text        NOT NULL DEFAULT 'none' CHECK (match_status IN ('auto', 'review', 'confirmed', 'not_ours', 'none')),
        match_note    text,                                -- why: name, years since graduation, flags
        reviewed_at   timestamptz,
        reviewed_by   text,
        UNIQUE (event_id, weight, name, college_raw)
      );
      CREATE INDEX IF NOT EXISTS %1$s_college_entries_wrestler_idx ON %1$s_college_entries (wrestler_id);
      CREATE INDEX IF NOT EXISTS %1$s_college_entries_status_idx ON %1$s_college_entries (match_status);
      ALTER TABLE %1$s_college_events  ENABLE ROW LEVEL SECURITY;
      ALTER TABLE %1$s_college_entries ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_college_events, %1$s_college_entries TO service_role;
      GRANT USAGE, SELECT ON SEQUENCE %1$s_college_events_id_seq, %1$s_college_entries_id_seq TO service_role;
    $f$, g);
  END LOOP;
END $$;

COMMIT;

-- Verify: all empty
SELECT (SELECT count(*) FROM colleges) AS colleges, (SELECT count(*) FROM boys_college_events) AS boys_events,
       (SELECT count(*) FROM girls_college_events) AS girls_events;

-- ROLLBACK: DROP TABLE boys_college_entries, boys_college_events, girls_college_entries, girls_college_events, college_aliases, colleges;
