-- docs/migrations/20261116_transfers.sql
--
-- Transfers (Kyle 2026-11-16): "search existing wrestlers, change their team and it will get logged as a transfer
-- for this season ... keep the list running for the season and then it will complete at the end of the season and
-- we will have the list for each year." One log per side. A row = one wrestler moved to a new team in a season
-- (seasons.id = end year). The season's list is open while the season is not archived; archiving the season
-- (season rollover) completes it, read-only from then on.
-- Replaces the old automatic transfer scan: pending_wrestler_transfers (411 unreviewed flags, never confirmed or
-- rejected) is dropped; its rows are saved in docs/migrations/backups/20261116_pending_wrestler_transfers.json.
-- Written and read only by /api/admin/transfers (service role). Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_transfers (
        id              bigserial   PRIMARY KEY,
        season_id       int         NOT NULL REFERENCES seasons(id),
        wrestler_id     uuid        NOT NULL REFERENCES wrestlers(id),
        from_school_id  int         REFERENCES schools(id),        -- their team before the move (null: none on file)
        to_school_id    int         NOT NULL REFERENCES schools(id),
        link_added      boolean     NOT NULL DEFAULT false,         -- this transfer added their name link at the new school
        notes           text,
        created_at      timestamptz NOT NULL DEFAULT now(),
        created_by      text
      );
      CREATE INDEX IF NOT EXISTS %1$s_transfers_season_idx   ON %1$s_transfers (season_id);
      CREATE INDEX IF NOT EXISTS %1$s_transfers_wrestler_idx ON %1$s_transfers (wrestler_id);
      ALTER TABLE %1$s_transfers ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_transfers TO service_role;
      GRANT USAGE, SELECT ON SEQUENCE %1$s_transfers_id_seq TO service_role;
    $f$, g);
  END LOOP;
END $$;

DROP TABLE IF EXISTS pending_wrestler_transfers;

COMMIT;

-- Verify: both logs exist and are empty; the old table is gone
SELECT (SELECT count(*) FROM boys_transfers) AS boys_rows, (SELECT count(*) FROM girls_transfers) AS girls_rows,
       to_regclass('public.pending_wrestler_transfers') IS NULL AS old_table_dropped;

-- ROLLBACK: DROP TABLE boys_transfers, girls_transfers; re-run 20260824_pending_wrestler_transfers.sql and
-- re-insert the backup rows.
