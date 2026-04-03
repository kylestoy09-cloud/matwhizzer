-- Split 'districts' tournament_type into 'boys_districts' and 'girls_districts'
-- This matches the existing pattern: boys_state/girls_state, regions/girls_regions

-- Boys districts
UPDATE precomputed_team_scores
SET tournament_type = 'boys_districts'
WHERE tournament_type = 'districts'
AND tournament_id IN (
  SELECT id FROM tournaments WHERE gender = 'M' AND tournament_type = 'districts'
);

-- Girls districts
UPDATE precomputed_team_scores
SET tournament_type = 'girls_districts'
WHERE tournament_type = 'districts'
AND tournament_id IN (
  SELECT id FROM tournaments WHERE gender = 'F' AND tournament_type = 'districts'
);

-- Verify: no rows should remain with tournament_type = 'districts'
-- SELECT tournament_type, COUNT(*) FROM precomputed_team_scores GROUP BY tournament_type ORDER BY 1;
