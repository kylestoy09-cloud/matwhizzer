-- docs/migrations/20261026_girls_other_events_import.sql
--
-- Girls 2025-26 (season 2026). Data import, applied with
--   node --env-file=.env.local scripts/batch_import_girls_other_events.mts \
--     "<girls source txt dir>" <report.json> --apply docs/migrations/backups/20261026_girls_other_events_import.json
--
-- Loads the "Other" events from the Track exports in "Whizzer Upload/2025-26
-- Girls Data" (Other Girls Matches, January Girls - Other 1-15, February Other):
-- jamborees, quads, tris and mini-jams that were never imported. 79 events,
-- 971 school pairings, 2,022 bouts. Each pairing is a dual_meets_girls row with
-- meet_kind 'jamboree', counts_toward_record = false (no team W-L effect), plus
-- its dual_meet_matches_girls bouts. Same row shapes as the girls jamboree
-- importer (src/app/api/admin/import-meets-girls/route.ts).
--
-- Not loaded: Queen of the Mat (already an in-season tournament); 7 pairings
-- already in dual_meets_girls on that date; 3 Summit pairings from a second
-- copy of Par Hills Mini Jam II merged into the first; 8 pairings with Mary Help of
-- Christians Academy / William Penn Charter School (no school record).
--
-- Review decisions (2026-10-26) are in the script: two date fixes, eight
-- low-confidence wrestler matches, held schools. New wrestlers are created per
-- name + school; new wrestler_name_aliases rows only (existing ones untouched).
--
-- Inserted ids: docs/migrations/backups/20261026_girls_other_events_import.json
--
-- Verify:
SELECT COUNT(*) AS meets, SUM(n) AS bouts FROM (
  SELECT m.id, COUNT(b.id) AS n FROM dual_meets_girls m
  LEFT JOIN dual_meet_matches_girls b ON b.dual_meet_id = m.id
  WHERE m.season_id = 2026 AND m.meet_kind = 'jamboree'
  GROUP BY m.id) x;   -- expect 971 meets / 2,022 bouts

-- ROLLBACK: delete dual_meets_girls by the "meets" ids in the backup file (bouts
-- cascade), then wrestler_name_aliases by "aliases" ids, then wrestlers by
-- "wrestlers" ids.
