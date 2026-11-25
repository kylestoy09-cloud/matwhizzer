-- docs/migrations/20261117_wrestler_status_whiz_notices.sql
--
-- Wrestler status (Kyle 2026-11-17: Jackson Weller (Delran) hurt and likely out for the season; Chase Sudano
-- (St. Augustine) passed away this summer):
--   status 'out_for_season' + status_season_id: off the Whiz Rank boards for that season only; profile, records and
--     rating stay; clearing the status puts him back.
--   status 'deceased': off every current list (rankings, roster checks, transfer matching, import suggestions);
--     profile and history stay. status_note = an optional line shown in italics on the public profile.
-- Whiz Rank notices: when a transfer or a status takes a ranked wrestler off an unpublished board (and reopens it),
-- a line on that board — and on the board he moved to — says so until the board is submitted again.
-- Written by /api/admin/wrestler-profile, /api/admin/transfers and /api/admin/whiz-rank (service role).
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE wrestlers
  ADD COLUMN IF NOT EXISTS status           text CHECK (status IN ('out_for_season', 'deceased')),
  ADD COLUMN IF NOT EXISTS status_season_id integer REFERENCES seasons(id),
  ADD COLUMN IF NOT EXISTS status_note      text,
  ADD COLUMN IF NOT EXISTS status_set_at    timestamptz,
  ADD COLUMN IF NOT EXISTS status_set_by    text;

CREATE TABLE IF NOT EXISTS whiz_rank_notices (
  id           bigserial   PRIMARY KEY,
  week_id      integer     NOT NULL REFERENCES individual_ranking_weeks(id) ON DELETE CASCADE,
  gender       char(1)     NOT NULL CHECK (gender IN ('M', 'F')),
  weight_class smallint    NOT NULL,
  section      text        NOT NULL,
  wrestler_id  uuid        REFERENCES wrestlers(id) ON DELETE CASCADE,
  message      text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whiz_rank_notices_board_idx ON whiz_rank_notices (week_id, gender, weight_class, section);
ALTER TABLE whiz_rank_notices ENABLE ROW LEVEL SECURITY;
GRANT ALL ON whiz_rank_notices TO service_role;
GRANT USAGE, SELECT ON SEQUENCE whiz_rank_notices_id_seq TO service_role;

COMMIT;

-- Verify: the columns exist, nobody has a status yet, no notices
SELECT (SELECT count(status) FROM wrestlers) AS wrestlers_with_status, (SELECT count(*) FROM whiz_rank_notices) AS notices;

-- ROLLBACK: DROP TABLE whiz_rank_notices;
--   ALTER TABLE wrestlers DROP COLUMN status, DROP COLUMN status_season_id, DROP COLUMN status_note, DROP COLUMN status_set_at, DROP COLUMN status_set_by;
