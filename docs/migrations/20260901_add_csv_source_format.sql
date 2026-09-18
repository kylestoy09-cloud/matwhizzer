-- docs/migrations/20260901_add_csv_source_format.sql
-- Extends source_format check constraints on in_season_tournaments and tournament_bouts
-- to allow 'csv', used by the new CSV import pipeline for TournamentWrestling exports.

-- in_season_tournaments: was ('full_bracket', 'school_tracking')
ALTER TABLE in_season_tournaments
  DROP CONSTRAINT IF EXISTS in_season_tournaments_source_format_check;

ALTER TABLE in_season_tournaments
  ADD CONSTRAINT in_season_tournaments_source_format_check
  CHECK (source_format IN ('full_bracket', 'school_tracking', 'csv'));

-- tournament_bouts: was ('rtf', 'pdf', 'pipe', 'bullet') — added in dashboard, not in a migration
ALTER TABLE tournament_bouts
  DROP CONSTRAINT IF EXISTS tournament_bouts_source_format_check;

ALTER TABLE tournament_bouts
  ADD CONSTRAINT tournament_bouts_source_format_check
  CHECK (source_format IN ('rtf', 'pdf', 'pipe', 'bullet', 'csv'));
