-- docs/migrations/20261117_college_bouts.sql
--
-- College bouts (Kyle 2026-11-17: "pull bout records and results and track things like pins techs wins podiums").
-- One row per bout read from a championship's bracket (src/lib/ncaa/parse.ts), between two entrants of
-- {boys,girls}_college_entries. Saved with the championship (src/lib/ncaa/save.ts): re-importing a year replaces its
-- bouts (they go with their entrants, ON DELETE CASCADE).
--   result_raw   as printed ("Dec 6-4", "Fall 1:27", "TF-1.5 5:00 (21-6)", "SV-1 4-2", "M. For.")
--   result_type  dec / md / tf / fall / sv / tb / inj / for / dq — wins, pins, techs and majors count from it
--   fall_secs    the time for a fall or a tech fall
-- Written by /api/admin/college and scripts/load_ncaa_d1_20261117.mts (service role). Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_college_bouts (
        id              bigserial   PRIMARY KEY,
        event_id        integer     NOT NULL REFERENCES %1$s_college_events(id) ON DELETE CASCADE,
        weight          integer     NOT NULL,
        bout_no         integer,
        winner_entry_id bigint      NOT NULL REFERENCES %1$s_college_entries(id) ON DELETE CASCADE,
        loser_entry_id  bigint      REFERENCES %1$s_college_entries(id) ON DELETE CASCADE,
        result_raw      text,
        result_type     text        CHECK (result_type IN ('dec', 'md', 'tf', 'fall', 'sv', 'tb', 'inj', 'for', 'dq')),
        fall_secs       integer
      );
      CREATE INDEX IF NOT EXISTS %1$s_college_bouts_event_idx  ON %1$s_college_bouts (event_id);
      CREATE INDEX IF NOT EXISTS %1$s_college_bouts_winner_idx ON %1$s_college_bouts (winner_entry_id);
      CREATE INDEX IF NOT EXISTS %1$s_college_bouts_loser_idx  ON %1$s_college_bouts (loser_entry_id);
      ALTER TABLE %1$s_college_bouts ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_college_bouts TO service_role;
      GRANT USAGE, SELECT ON SEQUENCE %1$s_college_bouts_id_seq TO service_role;
    $f$, g);
  END LOOP;
END $$;

COMMIT;

-- Verify: both tables exist and are empty
SELECT (SELECT count(*) FROM boys_college_bouts) AS boys_bouts, (SELECT count(*) FROM girls_college_bouts) AS girls_bouts;

-- ROLLBACK: DROP TABLE boys_college_bouts, girls_college_bouts;
