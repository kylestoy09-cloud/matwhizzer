-- docs/migrations/20261120_match_projections_weight.sql
--
-- Each tracked bout's weight class (Kyle 2026-11-20: "does weight have any impact" — it does on how bouts end: boys
-- techs 17% at 106 vs 3% at 285, decisions + OT highest at 285; girls pins 80% at 100 → 89% at 235). The weight-group
-- projection levers (src/lib/weightGroups.ts) read it.
--   weight_class  the bout's weight as entered (dual meet / in-season tournament bouts; postseason from weight_classes);
--                 the code snaps it to the side's classes and groups
-- New bouts get it from src/lib/projectionTrack.ts. Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE match_projections ADD COLUMN IF NOT EXISTS weight_class int;

UPDATE match_projections p SET weight_class = substring(m.weight_class::text from '\d+')::int
FROM dual_meet_matches m WHERE p.gender = 'M' AND p.match_source = 'dual_meet' AND m.id::text = p.source_id;
UPDATE match_projections p SET weight_class = substring(m.weight_class::text from '\d+')::int
FROM dual_meet_matches_girls m WHERE p.gender = 'F' AND p.match_source = 'dual_meet' AND m.id::text = p.source_id;

UPDATE match_projections p SET weight_class = substring(b.weight_class::text from '\d+')::int
FROM tournament_bouts b WHERE p.gender = 'M' AND p.match_source = 'tournament_bout' AND b.id::text = p.source_id;
UPDATE match_projections p SET weight_class = substring(b.weight_class::text from '\d+')::int
FROM tournament_bouts_girls b WHERE p.gender = 'F' AND p.match_source = 'tournament_bout' AND b.id::text = p.source_id;

UPDATE match_projections p SET weight_class = wc.weight::int
FROM matches m JOIN weight_classes wc ON wc.id = m.weight_class_id
WHERE p.match_source = 'postseason' AND m.id::text = p.source_id;

COMMIT;

-- Verify: every tracked bout has a weight, by side
SELECT gender, count(*) AS bouts, count(weight_class) AS with_weight, min(weight_class) AS lightest, max(weight_class) AS heaviest
FROM match_projections GROUP BY gender ORDER BY gender;
