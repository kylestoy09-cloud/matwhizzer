-- Delete CVC Wrestling Tournament data that was imported with weight_class=14
-- Root cause: TrackWrestling RTF puts team standings on separate lines, so "14"
-- (14th-place team rank) matched the 2-digit weight-class regex before bracket data.
-- The parser fix (WEIGHT_WITH_GENDER_RE for "106 - B" format + VALID_WEIGHT_CLASSES
-- whitelist) is in src/lib/parseRtf.ts. Re-import after running this.
--
-- Tournament: 2026 CVC Wrestling Tournament - Boys
-- ID: d49d0ef0-fc58-4ab1-9b6b-f7cb917dea26

DO $$
DECLARE
  v_tid uuid := 'd49d0ef0-fc58-4ab1-9b6b-f7cb917dea26';
BEGIN
  DELETE FROM tournament_bouts                 WHERE in_season_tournament_id = v_tid;
  DELETE FROM in_season_tournament_team_scores WHERE tournament_id = v_tid;
  DELETE FROM in_season_tournaments            WHERE id = v_tid;
END $$;
