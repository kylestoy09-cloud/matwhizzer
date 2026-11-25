-- docs/migrations/20261112_preseason_streaming_and_completion.sql
--
-- Preseason dashboard (Kyle 2026-11-11):
-- 1. Streaming links: one link per program per season, collected in preseason like coaches (saved to the
--    upcoming season). One table per program, like boys_coaches / girls_coaches. Non-essential: the
--    dashboard shows its % but leaves it out of the completed bar.
-- 2. Preseason completion marks: items that are 0% or 100% on the dashboard because they are marked done
--    rather than counted (transfers: "saved and marked complete for the preseason"; the Transfers tool
--    keeps working in-season either way). Kept per season and per gender.
-- Admin only (service role).
-- Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS boys_streaming_links (
  school_id   integer     NOT NULL REFERENCES schools(id),
  season_id   integer     NOT NULL REFERENCES seasons(id),
  url         text        NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, season_id)
);
CREATE TABLE IF NOT EXISTS girls_streaming_links (
  school_id   integer     NOT NULL REFERENCES schools(id),
  season_id   integer     NOT NULL REFERENCES seasons(id),
  url         text        NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, season_id)
);

CREATE TABLE IF NOT EXISTS preseason_completion (
  season_id     integer     NOT NULL REFERENCES seasons(id),
  gender        char(1)     NOT NULL CHECK (gender IN ('M', 'F')),
  item          text        NOT NULL CHECK (item IN ('transfers')),
  completed_at  timestamptz NOT NULL DEFAULT now(),
  completed_by  text,
  PRIMARY KEY (season_id, gender, item)
);

ALTER TABLE boys_streaming_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE girls_streaming_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE preseason_completion  ENABLE ROW LEVEL SECURITY;
GRANT ALL ON boys_streaming_links, girls_streaming_links, preseason_completion TO service_role;

COMMIT;

-- Verify: all three tables exist and are empty
SELECT (SELECT count(*) FROM boys_streaming_links) AS boys_links,
       (SELECT count(*) FROM girls_streaming_links) AS girls_links,
       (SELECT count(*) FROM preseason_completion) AS completion_marks;

-- ROLLBACK: DROP TABLE boys_streaming_links, girls_streaming_links, preseason_completion;
