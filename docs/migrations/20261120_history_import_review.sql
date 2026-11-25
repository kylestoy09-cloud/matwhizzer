-- docs/migrations/20261120_history_import_review.sql
--
-- Tournament history review (Kyle 2026-11-20: "put these reviews in the history tab so that i can match with a school,
-- same with the wrestlers. make it easier"). The history import's dry run (scripts/tournament_history_dryrun_20261120.mts)
-- writes what it couldn't settle; the admin Tournament Hub → History tab shows them with a school search / state picker
-- (teams) and the candidate profiles (wrestlers); the import reads the decisions.
--   kind      'team' (a printed team name: which NJ school, or which state) | 'wrestler' (an NJ wrestler with a weak
--             profile match: which profile, or a new one)
--   key       the item: team → its printed name (lower case); wrestler → "<printed name>|<school id>" (lower case)
--   item      what the review shows (bouts, tournaments, years, candidates with ids, the suggestion)
--   decision  team → {"njSchoolId": n} | {"state": "PA"} ; wrestler → {"wrestlerId": "…"} | {"new": true}
-- Rerunning the dry run refreshes item and leaves decisions alone. Service role only. Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS history_import_review (
  id          bigserial PRIMARY KEY,
  gender      text NOT NULL CHECK (gender IN ('M', 'F')),
  kind        text NOT NULL CHECK (kind IN ('team', 'wrestler')),
  key         text NOT NULL,
  item        jsonb NOT NULL,
  decision    jsonb,
  decided_by  text,
  decided_at  timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gender, kind, key)
);
ALTER TABLE history_import_review ENABLE ROW LEVEL SECURITY;
GRANT ALL ON history_import_review TO service_role;
GRANT USAGE, SELECT ON SEQUENCE history_import_review_id_seq TO service_role;

COMMIT;

-- Verify: the table is there and empty
SELECT count(*) AS items FROM history_import_review;
